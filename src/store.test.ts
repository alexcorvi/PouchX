import { config } from "./config";
import { DB, Employee, Employees } from "../mocks";
/// <reference types="jest" />

describe("# Store", () => {
	it("listing documents", async done => {
		const db = new DB();
		const employees = new Employees({
			model: Employee,
			DBInstance: db as any,
			sort: function(a: Employee, b: Employee) {
				return a.age - b.age;
			}
		});

		await employees.add(
			employees.new().fromJSON({
				name: "a",
				age: 30,
				_id: Math.random().toString(),
				canAccess: true,
				children: []
			})
		);

		await employees.add(
			employees.new().fromJSON({
				name: "b",
				age: 24,
				_id: Math.random().toString(),
				canAccess: true,
				children: []
			})
		);

		await employees.add(
			employees.new().fromJSON({
				name: "c",
				age: 36,
				_id: Math.random().toString(),
				canAccess: true,
				children: []
			})
		);

		expect(employees.docs.length).toBe(3);
		const sortA = employees.docs[0].name;
		(employees as any).__sort = function(a: Employee, b: Employee) {
			return b.age - a.age;
		};
		const sortB = employees.docs[0].name;
		expect(sortA).not.toBe(sortB);
		employees.docs[0]._deleted = true;
		expect(employees.docs.length).toBe(2);
		done();
	});

	describe("deleting documents", () => {
		it("deleting with both", async done => {
			const db = new DB();
			const employees = new Employees({
				model: Employee,
				DBInstance: db as any
			});
			employees.afterDelete = jest.fn(employees.afterDelete);
			await employees.add(
				employees.new().fromJSON({
					name: "a",
					age: 30,
					_id: Math.random().toString(),
					canAccess: true,
					children: []
				})
			);

			const doc = employees.docs[0];
			const id = doc._id;
			const _rev = Math.random().toString();
			db.setNextRev(_rev);
			await employees.delete(id);
			// db.get called
			expect(db.get).toBeCalledWith(id);
			// db.remove called
			expect(db.remove).toBeCalledTimes(1);
			// and we have the correct _rev
			expect(
				(employees as any).__list.find((x: any) => x._id === doc._id)!
					._rev
			).toBe(_rev);
			// and the document is not have the _deleted prop
			expect(
				(employees as any).__list.find((x: any) => x._id === doc._id)!
					._deleted
			).toBe(true);
			// and don't forget the accessories
			expect(employees.afterDelete).toBeCalledWith(doc, false);
			done();
		});

		it("deleting with mobx only", async done => {
			const db = new DB();
			const employees = new Employees({
				model: Employee,
				DBInstance: db as any
			});
			employees.afterDelete = jest.fn(employees.afterDelete);
			await employees.add(
				employees.new().fromJSON({
					name: "a",
					age: 30,
					_id: Math.random().toString(),
					canAccess: true,
					children: []
				})
			);
			const doc = employees.docs[0];
			const id = doc._id;
			const _rev = Math.random().toString();
			db.setNextRev(_rev);
			await employees.delete(id, true);
			// db.get not called
			expect(db.get).not.toBeCalledWith(id);
			// db.remove called
			expect(db.remove).toBeCalledTimes(0);
			// and the document have the _deleted prop
			expect(
				(employees as any).__list.find((x: any) => x._id === doc._id)!
					._deleted
			).toBe(true);
			// and don't forget the accessories
			expect(employees.afterDelete).toBeCalledWith(doc, true);
			done();
		});
	});

	describe("adding documents", () => {
		it("Adding to both", async done => {
			const db = new DB();
			const employees = new Employees({
				model: Employee,
				DBInstance: db as any
			});
			const rev = Math.random().toString();
			db.setNextRev(rev);
			await employees.add(
				employees.new().fromJSON({
					name: "Alex",
					age: 30,
					_id: Math.random().toString(),
					canAccess: true,
					children: []
				})
			);

			expect(employees.docs.length).toBe(1);
			expect(employees.docs[0].name).toBe("Alex");
			expect(db.put).toBeCalledTimes(1);
			expect(db.get).toBeCalledTimes(0);
			expect(employees.docs[0]._rev).toBe(rev);
			done();
		});

		it("Adding to mobx only", async done => {
			const db = new DB();
			const employees = new Employees({
				model: Employee,
				DBInstance: db as any
			});
			const rev = Math.random().toString();
			db.setNextRev(rev);
			const doc = employees.new().fromJSON({
				name: "Alex",
				age: 30,
				_id: Math.random().toString(),
				canAccess: true,
				children: []
			});
			doc._rev = rev;
			await employees.add(doc, true);

			expect(employees.docs.length).toBe(1);
			expect(employees.docs[0].name).toBe("Alex");
			expect(db.put).toBeCalledTimes(0);
			expect(db.get).toBeCalledTimes(0);
			expect(employees.docs[0]._rev).toBe(rev);
			done();
		});
	});

	describe("updating from pouch", () => {
		it("updating from pouch", async done => {
			const db = new DB();
			const employees = new Employees({
				model: Employee,
				DBInstance: db as any
			});

			(employees as any).__bulkAddToMobx = jest.fn(
				(employees as any).__bulkAddToMobx
			);
			employees.delete = jest.fn(employees.delete);

			await employees.add(
				employees.new({
					_id: "a",
					age: 0,
					canAccess: true,
					children: [],
					name: "a"
				})
			);

			await employees.add(
				employees.new({
					_id: "b",
					age: 0,
					canAccess: true,
					children: [],
					name: "b"
				})
			);

			(employees as any).__list.find(
				(x: Employee) => x._id === "b"
			).fromJSON = jest.fn(
				(employees as any).__list.find((x: Employee) => x._id === "b")
					.fromJSON
			);

			const b_rev = Math.random().toString();
			const c_rev = Math.random().toString();

			db.setNextRows([
				// should be updated
				{
					id: "b",
					key: "",
					value: {
						deleted: false,
						rev: b_rev
					},
					doc: {
						_id: "b",
						_rev: b_rev,
						age: 1992,
						canAccess: true,
						children: [],
						name: "b"
					}
				},
				// should be added
				{
					id: "c",
					key: "",
					value: {
						deleted: false,
						rev: c_rev
					},
					doc: {
						_id: "c",
						_rev: c_rev,
						age: 1992,
						canAccess: true,
						children: [],
						name: "c"
					}
				}
			]);

			db.nextGet["c"] = {
				_id: "c",
				name: "c",
				_rev: c_rev
			};

			db.nextGet["b"] = {
				_id: "b",
				name: "b",
				_rev: b_rev
			};
			await db.changesCallback!();
			await new Promise(resolve => setTimeout(resolve, 15));

			// update occurred
			expect(
				employees.docs.find(x => x._id === "b")!.fromJSON
			).toBeCalledTimes(1);
			// delete occurred
			expect(employees.delete).toBeCalledTimes(1);
			expect(employees.docs.find(x => x._id === "a")).toBe(undefined);

			// adding occurred
			expect((employees as any).__bulkAddToMobx).toBeCalledTimes(2);
			expect((employees as any).__list.length).toBe(3);
			expect(employees.docs.length).toBe(2);
			expect(employees.docs.findIndex(x => x._id === "c")).not.toBe(-1);

			// correct _rev
			expect(employees.docs.find(x => x._id === "b")!._rev).toBe(b_rev);
			expect(employees.docs.find(x => x._id === "c")!._rev).toBe(c_rev);
			done();
		});
	});

	describe("Hooks are being called", () => {
		it("after add hook", async done => {
			const db = new DB();
			const employees = new Employees({
				model: Employee,
				DBInstance: db as any
			});

			employees.afterAdd = jest.fn(employees.afterAdd);
			await employees.add(employees.new());
			expect(employees.afterAdd).toBeCalled();
			done();
		});
		it("after delete hook", async done => {
			const db = new DB();
			const employees = new Employees({
				model: Employee,
				DBInstance: db as any
			});

			employees.afterDelete = jest.fn(employees.afterDelete);
			await employees.add(employees.new());
			await employees.delete((employees as any).__list[0]._id);
			expect(employees.afterDelete).toBeCalled();
			done();
		});
	});
});
