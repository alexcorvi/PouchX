import { Model, observeModel, Schema, SubModel } from "../src";
import { observable } from "mobx";

export interface ChildSchema {
	name: string;
	toys: string[];
}

export interface EmployeeSchema extends Schema {
	name: string;
	age: number;
	canAccess: boolean;
	children: ChildSchema[];
}

export class Child extends SubModel<ChildSchema> implements ChildSchema {
	@observable name: string = "";
	@observable toys: string[] = [];

	toJSON() {
		return {
			name: this.name,
			toys: this.toys
		};
	}

	fromJSON(json: ChildSchema) {
		this.name = json.name;
		this.toys = json.toys;
		return this;
	}
}

@observeModel
export class Employee extends Model<EmployeeSchema> implements EmployeeSchema {
	@observable name: string = "";
	@observable age: number = 0;
	@observable canAccess: boolean = false;

	@observable children: Child[] = [];

	toJSON() {
		return {
			_id: this._id,
			name: this.name,
			age: this.age,
			canAccess: this.canAccess,
			children: this.children ? this.children.map(x => x.toJSON()) : []
		};
	}
	fromJSON(json: Partial<EmployeeSchema>) {
		this._id = json._id ? json._id : this._id;
		this.name = json.name ? json.name : this.name;
		this.age = json.age ? json.age : this.age;
		this.canAccess = json.canAccess ? json.canAccess : this.canAccess;
		this.children = json.children
			? json.children.map(x => new Child().fromJSON(x))
			: this.children;
		return this;
	}
}
