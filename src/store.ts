import { Model } from "./model";
import { Schema } from "./schema";
import { transactionError } from "./throw";
import { diff } from "fast-array-diff";
import { computed, observable } from "mobx";

export abstract class Store<
	SpecificSchema extends Schema,
	SpecificModel extends Model<SpecificSchema>
> {
	private __model: {
		new (DBInstance: PouchDB.Database<SpecificSchema>): SpecificModel;
	};

	private __DBInstance: PouchDB.Database<SpecificSchema>;

	@observable private __list: SpecificModel[] = [];

	@observable public selectedID: string = "";
	@computed public get selectedDoc() {
		return this.docs.find(doc => doc._id === this.selectedID);
	}

	@computed public get docs(): SpecificModel[] {
		return this.__list.filter(x => !x._deleted).sort(this.sort);
	}

	abstract sort(a: SpecificModel, b: SpecificModel): number;

	public new(json?: SpecificSchema) {
		const newModel = new this.__model(this.__DBInstance);
		if (json) {
			newModel.fromJSON(json);
		}
		return newModel;
	}

	// ---------------
	// Deletion
	// --------------
	public async delete(id: string, mobxOnly: boolean = false): Promise<void> {
		const index = this.__list.findIndex(x => x._id === id);
		if (index !== -1) {
			if (id === this.selectedID) {
				this.selectedID = "";
			}
			if (!mobxOnly) {
				const doc = await this.__DBInstance.get(id);
				this.__list[index]._rev = (await this.__DBInstance.remove(
					doc
				)).rev;
			}
			this.__list[index]._deleted = true;
			// adding and deleting an item so the computed value updates
			this.__list.push(this.new());
			this.__list.splice(this.__list.length - 1, 1);

			await this.deleteAccessories(id, mobxOnly);
		} else {
			transactionError(
				"can not delete document",
				"document does not exist",
				"given id",
				id
			);
		}
	}

	abstract deleteAccessories(id: string, justOnMobx: boolean): Promise<void>;

	// ---------------
	// Addition
	// ---------------
	public async add(
		document: SpecificModel = this.new(),
		justOnMobx: boolean = false
	) {
		const index = this.__list.findIndex(x => x._id === document._id);
		if (index === -1) {
			document.__ignoreObserver = true;
			document.__DBInstance = this.__DBInstance;
			// add to list
			this.__list.push(document);
			const newIndex = this.__list.findIndex(x => x._id === document._id);
			// add to pouch
			if (!justOnMobx) {
				const res = await this.__DBInstance.put(document.toJSON());
				this.__list[newIndex]._rev = res.rev;
			} else {
				this.__list[newIndex]._rev = (await this.__DBInstance.get(
					document._id
				))._rev;
			}
			document.__ignoreObserver = false;
			return this.__list[newIndex];
		} else {
			transactionError(
				"can not add document",
				"document already exists",
				"document",
				JSON.stringify(this.__list[index].toJSON())
			);
		}
	}

	// ---------------
	// grabbing
	// ---------------
	public async updateFromPouch() {
		let pouchDBDocs = (await this.__DBInstance.allDocs()).rows.filter(
			// don't include deleted docs
			// so they can appear to be deleted in this function
			x => !x.value.deleted
		);
		const pouchDBIndices = pouchDBDocs.map(x => x.id).sort();
		const mobxIndices = this.__list
			// again
			// don't include deleted docs
			// so they can appear to be deleted in this function
			.filter(x => !x._deleted)
			.map(x => x._id)
			.sort();

		const diffResult = diff<string>(mobxIndices, pouchDBIndices);
		const toAdd = diffResult.added;
		const toDelete = diffResult.removed;

		for (let index = 0; index < toAdd.length; index++) {
			const id = toAdd[index];
			const row = pouchDBDocs.find(x => x.id === id);
			// solving a pouchDB/couchDB bug
			// where documents keeps reappearing
			const docHasBeenDeleted = this.__list.find(
				d => d._id === id && d._deleted === true
			);
			if (docHasBeenDeleted) {
				await this.delete(id);
				continue;
			}
			const pouchdbItem = await this.__DBInstance.get(row!.id);
			const mobxItem = new this.__model(this.__DBInstance);
			mobxItem.__ignoreObserver = true;
			mobxItem.fromJSON(pouchdbItem);
			mobxItem.__ignoreObserver = false;
			await this.add(mobxItem, true);
		}

		for (let index = 0; index < toDelete.length; index++) {
			const id = toDelete[index];
			const mobxItem = this.__list.find(x => x._id === id);
			if (!mobxItem) {
				continue;
			}
			await this.delete(id, true);
		}

		for (let index = 0; index < pouchDBDocs.length; index++) {
			const row = pouchDBDocs[index];
			const mobxDoc = this.__list.find(x => x._id === row.id);
			if (!mobxDoc) {
				continue;
			}
			if (mobxDoc._rev !== row.value.rev) {
				mobxDoc.__ignoreObserver = true;
				mobxDoc.fromJSON(await this.__DBInstance.get(mobxDoc._id));
				mobxDoc._rev = row.value.rev;
				mobxDoc.__ignoreObserver = false;
			}
		}
	}

	private async __init() {
		await this.updateFromPouch();
		this.__DBInstance
			.changes({
				since: "now",
				live: true,
				include_docs: true,
				limit: 1
			})
			.on("change", async () => {
				this.updateFromPouch();
			});
	}

	// public utility functions
	public async destroyPouchDB() {
		return this.__DBInstance.destroy();
	}
	public async hardReset() {
		this.__list = [];
		await this.destroyPouchDB();
	}
	public async compact() {
		return this.__DBInstance.compact();
	}

	constructor({
		model,
		DBInstance
	}: {
		model: new (
			DBInstance: PouchDB.Database<SpecificSchema>
		) => SpecificModel;
		DBInstance: PouchDB.Database<SpecificSchema>;
	}) {
		this.__model = model;
		this.__DBInstance = DBInstance;
		this.__init();
	}
}
