/// <reference types="Jest" />

export class DB {
	private nextRev: string = "";
	private nextRows: PouchDB.Core.AllDocsResponse<any> = {
		offset: 0,
		total_rows: 0,
		rows: []
	};
	public changesCallback: Function | undefined;

	public nextGet: { [key: string]: any } = {};

	setNextRev(_rev: string) {
		this.nextRev = _rev;
	}

	setNextRows(
		rows: {
			id: string;
			key: string;
			value: {
				rev: string;
				deleted?: boolean;
			};
		}[]
	) {
		this.nextRows.rows = rows;
	}

	get = jest.fn(
		async (
			id: string
		): Promise<PouchDB.Core.Document<any> & PouchDB.Core.GetMeta> => {
			return (
				this.nextGet[id] || {
					_id: "",
					_rev: this.nextRev
				}
			);
		}
	);

	put = jest.fn(
		async <Schema extends { _id: string }>(
			document: Schema,
			options: {
				force: boolean;
			}
		): Promise<PouchDB.Core.Response> => {
			return { id: document._id, ok: true, rev: this.nextRev };
		}
	);

	remove = jest.fn(
		async <Schema extends { _id: string }>(
			document: Schema
		): Promise<PouchDB.Core.Response> => {
			return { id: document._id, ok: true, rev: this.nextRev };
		}
	);

	allDocs = jest.fn(
		async (): Promise<PouchDB.Core.AllDocsResponse<any>> => {
			return this.nextRows;
		}
	);

	changes(arg: any) {
		return {
			on: jest.fn(
				(string: "change", callback: (args: any) => unknown) => {
					this.changesCallback = jest.fn(callback);
				}
			)
		};
	}

	destroy = jest.fn(async () => {});
	compact = jest.fn(async () => {});
	hardReset = jest.fn(async () => {});
}
