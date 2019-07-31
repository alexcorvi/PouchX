import { config } from "./config";
import { DB, Employee, Employees } from "../mocks";
/// <reference types="jest" />

describe("# Store", () => {
	it("listing documents", () => {
		const db = new DB();
		const employees = new Employees({
			model: Employee,
			DBInstance: db as any
		});

		employees.add(
			employees.new().fromJSON({
				name: "a",
				age: 30,
				_id: Math.random().toString(),
				canAccess: true,
				children: []
			})
		);

		employees.add(
			employees.new().fromJSON({
				name: "b",
				age: 24,
				_id: Math.random().toString(),
				canAccess: true,
				children: []
			})
		);

		employees.add(
			employees.new().fromJSON({
				name: "c",
				age: 36,
				_id: Math.random().toString(),
				canAccess: true,
				children: []
			})
		);
		expect(employees.docs.length).toBe(3);
		employees.sort = function(a: Employee, b: Employee) {
			return a.age - b.age;
		};
		const sortA = employees.docs[0].name;
		employees.sort = function(a: Employee, b: Employee) {
			return b.age - a.age;
		};
		const sortB = employees.docs[0].name;
		expect(sortA).not.toBe(sortB);
		employees.docs[0]._deleted = true;
		expect(employees.docs.length).toBe(2);
	});

	describe("deleting documents", () => {
		it("deleting with both", done => {
			const db = new DB();
			const employees = new Employees({
				model: Employee,
				DBInstance: db as any
			});
			employees.deleteAccessories = jest.fn(employees.deleteAccessories);
			employees.add(
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
			employees.delete(id);
			// db.get called
			expect(db.get).toBeCalledWith(id);
			setTimeout(() => {
				// db.remove called
				expect(db.remove).toBeCalledTimes(1);
				// and we have the correct _rev
				expect(
					(employees as any).__list.find(
						(x: any) => x._id === doc._id
					)!._rev
				).toBe(_rev);
				// and the document is not have the _deleted prop
				expect(
					(employees as any).__list.find(
						(x: any) => x._id === doc._id
					)!._deleted
				).toBe(true);
				// and don't forget the accessories
				expect(employees.deleteAccessories).toBeCalledWith(id, false);
				done();
			}, 100);
		});

		it("deleting with mobx only", done => {
			const db = new DB();
			const employees = new Employees({
				model: Employee,
				DBInstance: db as any
			});
			employees.deleteAccessories = jest.fn(employees.deleteAccessories);
			employees.add(
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
			employees.delete(id, true);
			// db.get not called
			expect(db.get).not.toBeCalledWith(id);
			setTimeout(() => {
				// db.remove called
				expect(db.remove).toBeCalledTimes(0);
				// and the document have the _deleted prop
				expect(
					(employees as any).__list.find(
						(x: any) => x._id === doc._id
					)!._deleted
				).toBe(true);
				// and don't forget the accessories
				expect(employees.deleteAccessories).toBeCalledWith(id, true);
				done();
			}, 100);
		});
	});

	describe("adding documents", () => {
		it("Adding to both", done => {
			const db = new DB();
			const employees = new Employees({
				model: Employee,
				DBInstance: db as any
			});
			setTimeout(() => {
				const rev = Math.random().toString();
				db.setNextRev(rev);
				employees.add(
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
				setTimeout(() => {
					expect(db.get).toBeCalledTimes(0);
					expect(employees.docs[0]._rev).toBe(rev);
					done();
				}, 200);
			}, 100);
		});

		it("Adding to mobx only", done => {
			const db = new DB();
			const employees = new Employees({
				model: Employee,
				DBInstance: db as any
			});
			setTimeout(() => {
				const rev = Math.random().toString();
				db.setNextRev(rev);
				employees.add(
					employees.new().fromJSON({
						name: "Alex",
						age: 30,
						_id: Math.random().toString(),
						canAccess: true,
						children: []
					}),
					true
				);

				expect(employees.docs.length).toBe(1);
				expect(employees.docs[0].name).toBe("Alex");
				expect(db.put).toBeCalledTimes(0);
				setTimeout(() => {
					expect(db.get).toBeCalledTimes(1);
					expect(employees.docs[0]._rev).toBe(rev);
					done();
				}, 200);
			}, 100);
		});
	});

	describe("updating from pouch", () => {
		it("updating from pouch", done => {
			const db = new DB();
			const employees = new Employees({
				model: Employee,
				DBInstance: db as any
			});

			employees.add = jest.fn(employees.add);
			employees.delete = jest.fn(employees.delete);

			employees.add(
				employees.new({
					_id: "a",
					age: 0,
					canAccess: true,
					children: [],
					name: "a"
				})
			);

			employees.add(
				employees.new({
					_id: "b",
					age: 0,
					canAccess: true,
					children: [],
					name: "b"
				})
			);

			(employees as any).__list.find(
				(x: Employee) => x._id === "a"
			).toJSON = jest.fn(
				(employees as any).__list.find((x: Employee) => x._id === "a")
					.toJSON
			);

			const b_rev = Math.random().toString();
			const c_rev = Math.random().toString();

			db.setNextRows([
				// a should be deleted
				// should be updated
				{
					id: "b",
					key: "",
					value: {
						deleted: false,
						rev: b_rev
					}
				},
				// should be added
				{
					id: "c",
					key: "",
					value: {
						deleted: false,
						rev: c_rev
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

			setTimeout(() => {
				(db as any).changesCallback();
				setTimeout(() => {
					expect(employees.add).toBeCalledTimes(3);
					expect(employees.delete).toBeCalledTimes(1);
					expect(employees.docs.find(x => x._id === "a")).toBe(
						undefined
					);
					expect(employees.docs.find(x => x._id === "b")!._rev).toBe(
						b_rev
					);
					expect(employees.docs.find(x => x._id === "c")!._rev).toBe(
						c_rev
					);
					done();
				}, 100);
			}, 100);
		});
	});
});
