import { Employee, EmployeeSchema } from "./model.mock";
import { Store } from "../src";

export class Employees extends Store<EmployeeSchema, Employee> {
	async afterDelete() {}
}
