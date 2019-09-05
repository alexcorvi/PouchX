import { config } from "./config";
import { Model } from "./model";
import { Schema } from "./schema";
import { transactionError } from "./throw";
import { diff } from "fast-array-diff";
import { computed, observable, toJS } from "mobx";
import { number } from "prop-types";

export abstract class Store<
	SpecificSchema extends Schema,
	SpecificModel extends Model<SpecificSchema>
> {
	private __model: {
		new (DBInstance: PouchDB.Database<SpecificSchema>): SpecificModel;
	};

	private __DBInstance: PouchDB.Database<SpecificSchema>;

	private __sort:
		| ((a: SpecificModel, b: SpecificModel) => number)
		| undefined;

	private __lastHash: string = "";

	@observable private __list: SpecificModel[] = [];

	@observable public selectedID: string = "";
	@computed public get selectedDoc() {
		return this.docs.find(doc => doc._id === this.selectedID);
	}

	@computed public get docs(): SpecificModel[] {
		return this.__list.filter(x => !x._deleted).sort(this.__sort);
	}

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
			const deletedItem = this.__list.splice(this.__list.length - 1, 1);

			await this.afterDelete(this.__list[index], !!mobxOnly);
		} else if (config.throw.whenDeletingNonExistent) {
			transactionError(
				"can not delete document",
				"document does not exist",
				"given id",
				id
			);
		}
	}

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
			// add to pouch
			if (!justOnMobx) {
				const res = await this.__DBInstance.put(document.toJSON());
				document._rev = res.rev;
			}
			// add to list
			this.__list.push(document);
			await this.afterAdd(document, justOnMobx);
			document.__ignoreObserver = false;
			return document;
		} else if (config.throw.whenAlreadyExists) {
			transactionError(
				"can not add document",
				"document already exists",
				"document",
				JSON.stringify(this.__list[index].toJSON())
			);
		}
	}

	private async __bulkAddToMobx(docs: SpecificModel[]) {
		// prevent duplication
		docs = docs.filter(
			doc => !this.__list.find(existing => existing._id === doc._id)
		);
		this.__list.push(...docs);
		await this.afterAdd(docs, true);
	}

	async afterDelete(item: SpecificModel, justOnMobx: boolean) {}
	async afterAdd(
		item: SpecificModel | SpecificModel[],
		justOnMobx: boolean
	) {}

	async afterChange() {}

	// ---------------
	// grabbing
	// ---------------
	public async updateFromPouch(initial: boolean = false) {
		let pouchDBDocs = (await this.__DBInstance.allDocs({
			conflicts: false,
			// include docs only when it's initial
			include_docs: initial
		})).rows.filter(
			// don't include deleted docs
			// so they can appear to be deleted in this function
			x => !x.value.deleted
		);

		if (initial) {
			const mobxDocumentsToAdd: SpecificModel[] = [];
			pouchDBDocs.forEach(pouchdbItem => {
				if (pouchdbItem.doc) {
					const mobxItem = new this.__model(this.__DBInstance);
					mobxItem.__ignoreObserver = true;
					mobxItem.fromJSON(pouchdbItem.doc);
					mobxItem._rev = pouchdbItem.doc._rev;
					mobxItem.__DBInstance = this.__DBInstance;
					mobxItem.__ignoreObserver = false;
					mobxDocumentsToAdd.push(mobxItem);
				}
			});
			this.__bulkAddToMobx(mobxDocumentsToAdd);
			return;
		}

		const pouchDBIndices = pouchDBDocs.map(x => x.id).sort();
		const mobxIndices = this.__list
			// again
			// don't include deleted docs
			// so they can appear to be deleted in this function
			.filter(x => !x._deleted)
			.map(x => x._id)
			.sort();

		const diffResult = diff<string>(mobxIndices, pouchDBIndices);
		let toAdd = diffResult.added;
		const toDelete = diffResult.removed;

		// solving a pouchDB/couchDB bug
		// where documents keeps reappearing
		for (let index = 0; index < toAdd.length; index++) {
			const id = toAdd[index];
			if (this.__list.find(d => d._id === id && d._deleted === true)) {
				// must be wrapped in a try/catch
				// since the last time we delete it
				// it will throw an error telling us
				// that it has been already deleted
				try {
					await this.delete(id);
				} catch (e) {}
				toAdd[index] = "";
			}
		}
		toAdd = toAdd.filter(x => x.length);

		if (toAdd.length) {
			const documentsToAdd = (await this.__DBInstance.allDocs({
				include_docs: true,
				keys: toAdd
			})).rows.map(x => x.doc);
			const mobxItems = [];
			for (let index = 0; index < documentsToAdd.length; index++) {
				const pouchdbItem = documentsToAdd[index];
				if (pouchdbItem) {
					const mobxItem = new this.__model(this.__DBInstance);
					mobxItem.__ignoreObserver = true;
					mobxItem.fromJSON(pouchdbItem);
					mobxItem._rev = pouchdbItem._rev;
					mobxItem.__DBInstance = this.__DBInstance;
					mobxItem.__ignoreObserver = false;
					mobxItems.push(mobxItem);
				}
			}

			this.__bulkAddToMobx(mobxItems);
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
		const newHash = this.hash(JSON.stringify(this.__list));
		if (newHash !== this.__lastHash) {
			await this.afterChange();
			this.__lastHash = newHash;
		}
	}

	private async __init() {
		await this.updateFromPouch(true);
		this.__DBInstance
			.changes({
				since: "now",
				live: true,
				include_docs: true,
				limit: 100
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
		DBInstance,
		sort
	}: {
		model: new (
			DBInstance: PouchDB.Database<SpecificSchema>
		) => SpecificModel;
		DBInstance: PouchDB.Database<SpecificSchema>;
		sort?: (a: SpecificModel, b: SpecificModel) => number;
	}) {
		this.__model = model;
		this.__DBInstance = DBInstance;
		this.__sort = sort;
		this.__init();
	}

	private hash(input: string) {
		var hash = 0;
		if (input.length == 0) {
			return hash.toString();
		}
		for (var i = 0; i < input.length; i++) {
			var char = input.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash;
		}
		return hash.toString(32);
	}
}
