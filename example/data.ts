import { Employee, Employees, EmployeeSchema } from "../mocks";
import PouchDB from "pouchdb-browser";
const db = new PouchDB<EmployeeSchema>("test");
export const employees = new Employees({ model: Employee, DBInstance: db });

(window as any).db = db;
