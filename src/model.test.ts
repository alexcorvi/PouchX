import { config } from "./config";
import { DB, Employee, Employees } from "../mocks";
/// <reference types="Jest" />

describe("# Model", () => {
	const db = new DB();
	const employees = new Employees({ model: Employee, DBInstance: db as any });

	it("_id should be replaceable", () => {
		config.UUID = () => "original";
		const original1 = employees.new()._id;
		const original2 = employees.new()._id;

		config.UUID = () => "replaced";
		const replaced1 = employees.new()._id;
		const replaced2 = employees.new()._id;

		expect(original1 === original2).toBe(true);
		expect(replaced1 === replaced2).toBe(true);
		expect(original1 === replaced1).toBe(false);
	});

	it("parent props that aren't functions should all start with _", () => {
		const employee = employees.new();
		const employeeParentKeys = Object.keys(employee);
		const employeeSchemaKeys = Object.keys(employee.toJSON());
		employeeParentKeys.forEach(key => {
			if (typeof (employeeParentKeys as any)[key] === "function") {
				return;
			}
			if (employeeSchemaKeys.indexOf(key) !== -1) {
				return;
			}
			expect(key[0]).toBe("_");
		});
	});

	it("_next function should be called on given intervals", done => {
		let called = false;
		const employee = employees.new();
		(employee as any).__next = () => {
			called = true;
		};
		setTimeout(() => {
			expect(called).toBe(true);
			done();
		}, 1100);
	});

	describe("Saving to PouchDB", () => {
		it("Saving to pouchdb", async done => {
			const employee = employees.new();
			const rev = Math.random().toString();
			db.setNextRev(rev);
			await (employee as any).saveToPouch();
			expect(db.get).toBeCalledWith(employee._id);
			expect(db.put).toBeCalled();
			expect(employee._rev).toBe(rev);
			done();
		});
	});

	describe("observing", () => {
		const employee = employees.new({
			_id: "",
			name: "Alex",
			canAccess: true,
			age: 43,
			children: [
				{
					name: "Samar",
					toys: ["one"]
				}
			]
		});
		(employee as any).saveToPouch = jest.fn(async () => {});

		describe("ignore", () => {
			it("should ignore when type isn't an update", done => {
				(employee as any).newProp = "new prop";
				setTimeout(() => {
					expect((employee as any).saveToPouch).toBeCalledTimes(0);
					done();
				}, 1500);
			});

			it("should ignore when type starts with _", done => {
				employee._rev = "some new _rev";
				setTimeout(() => {
					expect((employee as any).saveToPouch).toBeCalledTimes(0);
					done();
				}, 1500);
			});

			it("should ignore when __ignoreObserver is used", done => {
				employee.__ignoreObserver = true;
				employee.canAccess = false;
				employee.__ignoreObserver = false;
				setTimeout(() => {
					expect((employee as any).saveToPouch).toBeCalledTimes(0);
					done();
				}, 1500);
			});
		});

		describe("observer", () => {
			it("should observe direct props", done => {
				employee.age = employee.age + 1;
				setTimeout(() => {
					expect((employee as any).saveToPouch).toBeCalledTimes(1);
					done();
				}, 1500);
			});

			it("should observe deeply nested props", done => {
				employee.children[0].toys[0] = "changed";
				setTimeout(() => {
					expect((employee as any).saveToPouch).toBeCalledTimes(2);
					done();
				}, 1500);
			});
		});
	});
});
