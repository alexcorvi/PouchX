import { config } from "./config";
import { deepObserve } from "./deep-observe";
import { Schema } from "./schema";
import isEqual from "lodash.isequal";

export abstract class SubModel<SpecificSchema> {
	abstract toJSON(): SpecificSchema;

	abstract fromJSON(jsonDoc: SpecificSchema): SubModel<SpecificSchema>;
}

export abstract class Model<SpecificSchema extends Schema> implements Schema {
	/**------------------------------------------
	 *  pouchdb built-in props that we'll use
	 *
	 */
	public _id: string = config.UUID();
	public _deleted: boolean | undefined;
	public _rev: string | undefined;

	/**------------------------------------------
	 *  internal props that are specific to pouchx
	 *
	 */
	// becomes true if no updates should be propagated to pouchdb
	public __ignoreObserver: boolean = false;
	// an instance of the pouchDB database
	public __DBInstance: PouchDB.Database<SpecificSchema>;

	/**------------------------------------------
	 *  requiring toJSON & fromJSON from the child class
	 *
	 */
	abstract fromJSON(jsonDoc: SpecificSchema): Model<SpecificSchema>;
	abstract toJSON(): SpecificSchema;

	saveToPouch() {
		// this is just to expose the method
		// this will actually be overwritten by
		// the method in the decorator below
	}

	constructor(DBInstance: PouchDB.Database<SpecificSchema>) {
		this.__DBInstance = DBInstance;
	}
}

export function observeModel<
	SpecificSchema extends Schema,
	SpecificModel extends { new (...args: any[]): Model<SpecificSchema> }
>(model: SpecificModel) {
	abstract class Local extends model {
		// a property that contains a function that will run (if found) on intervals
		__next: (() => Promise<PouchDB.Core.Response | undefined>) | undefined;

		/**------------------------------------------
		 *  putting the document (in its current state)
		 * in pouchDB
		 */
		saveToPouch() {
			return new Promise(async (resolve, reject) => {
				this.__next = async () => {
					const newDoc = this.toJSON();
					const oldDoc = await this.__DBInstance.get(this._id);
					(newDoc as any)._rev = oldDoc._rev;

					if (isEqual(oldDoc, newDoc)) {
						// prevent duplicates & conflicts
						resolve({});
						return;
					}

					const response = await this.__DBInstance.put(newDoc, {
						force: true,
					});
					this._rev = response.rev;
					resolve(response);
					return response;
				};
			});
		}

		constructor(...args: any[]) {
			super(...args);

			deepObserve(this, (change) => {
				// ignore internal changes
				if (
					(change as any).name &&
					(change as any).name.toString().startsWith("_")
				) {
					return;
				}
				// ignore changes when we're told to ignore them
				if (this.__ignoreObserver) {
					return;
				}
				this.saveToPouch();
			});

			setInterval(async () => {
				if (this.__next) {
					const res = await this.__next();
					if (res && res.ok) {
						this.__next = undefined;
					}
				}
			}, config.queInterval);
		}
	}
	return Local;
}
