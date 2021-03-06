# PouchX

Seamless synchronization between PouchDB and MobX.

## Quick start

Installation

```
yarn add pouchx
```

or

```
npm install pouchx
```

## Introduction & Basic Concepts

-   what's good about MobX? it's reactive! and it's easy to make it in sync with your React views.
-   what's bad about it? making it synchronized with PouchDB.

I faced this issue while developing [apexo](https://apexo.app), in which I designed my application to be an offline-first application, where the data can live in three places: a remote CouchDB (on the server), a local PouchDB (on the browser), and a MobX state which would be displayed (through React) to the user. I had to re-write the code (that mother flippin' buggy code) that glues those three layers of data a couple of times until I decided to rewrite it once and for all in this library.

Using this library, all you have to do is to supply a PouchDB database instance and to make your classes extending the classes that the library offers.

What you'll get is a synchronization between MobX and PouchDB. As soon as your model (document) or store changes in MobX your PouchDB database will also change, and vice versa.

## How to write and structure your data

-   Let's say we have a database called `cars`
-   This database contains cars, with details about those cars.
-   Each car has multiple drivers.

#### Schema

> skip this part if you're not using typescript

First you have to write your **schema**, the schema is a typescript `interface` that represents (to some extent) how your document will be stored in CouchDB/PouchDB:

```typescript
import { Schema } from "pouchx";
interface CarSchema extends Schema {
	_id: string;
	make: string;
	model: string;
	year: number;
	drivers: DriverSchema[];
}

// no need for extending schema here
interface DriverSchema {
	name: string;
	age: number;
}
```

#### Model

Next, you'll have to write your models, the models are classes that will be used by MobX.

```typescript
import { Model, observeModel, SubModel } from "pouchx";
import { observable, computed } from "mobx";

/**
 *
 * The Main Model
 *
 * A javascript class that analogizes PouchDB document.
 *
 * "@observeModel" decorator, the library will observe the data
 * in this model and make changes to PouchDB when it's changed
 *
 * "extends Model<CarSchema>", the model will inherit properties
 * that will make the magic work
 *
 * "implements CarSchema", (though optional) will help you not to forget
 * to write some of your props defined in the CarSchema
 **/
@observeModel
export class Car extends Model<CarSchema> implements CarSchema {
	// required (defined by your schema)
	@observable make: string = "";
	@observable model: string = "";
	@observable year: number = 0;
	@observable drivers: Driver[] = [];

	// optional
	@computed get makeAndModel() {
		return this.make + ", " + this.model;
	}

	// required, used to convert class to pure JSON
	// when saving to PouchDB
	toJSON() {
		return {
			_id: this._id,
			make: this.make,
			model: this.model,
			year: this.year,
			drivers: this.drivers.map(driver => drivers.toJSON())
		};
	}

	// required, used to fill this class with data
	// that came from PouchDB
	fromJSON(json: Partial<EmployeeSchema>) {
		if (json._id) {
			this._id = json._id;
		}
		if (json.make) {
			this.make = json.make;
		}
		if (json.model) {
			this.model = json.model;
		}
		if (json.year) {
			this.year = json.year;
		}
		if (json.drivers) {
			this.drivers = json.drivers.map(driverJSON =>
				new Driver().fromJSON(driverJSON)
			);
		}
		return this;
	}
}

/**
 *
 * The Sub Model
 *
 * you don't need to (and should not) use "@observeModel" decorator,
 * the library is already observing this model as it's a sub model/child
 * of the above main model
 *
 * "extends Model<CarSchema>", is optional
 *
 * "implements CarSchema", is also optional
 **/
export class Driver extends SubModel<DriverSchema> implements DriverSchema {
	@observable name: string = "";
	@observable age: number = "";

	// required, just like in the main model
	toJSON() {
		return {
			name: this.name,
			age: this.age
		};
	}

	// required, just like in the main model
	fromJSON(json: Partial<DriverSchema>) {
		if (json.name) {
			this.name = json.name;
		}
		if (json.age) {
			this.age = json.age;
		}
		return this;
	}
}
```

#### Store

The store is typescript (javascript) class that analogizes the database in PouchDB and is used directly by your React app.

```typescript
import { Store } from "pouchx";

/**
 * The Store
 *
 * must extend pouchx.Store so it inherits the
 * properties that would make it work.
 *
 **/
export class Cars extends Store<CarSchema, Car> {
	// optional, a function that would be called when
	// an item in this store is deleted.
	// so you would delete related documents in other databases
	async afterDelete(doc: Car, mobxOnly: boolean) {}

	// optional, a function that would be called when
	// an item in this store has been added.
	async afterAdd(doc: Car, mobxOnly: boolean) {}

	// optional, a function that would be called when
	// any item in this store is updated, deleted or added
	async afterChange() {}
}
```

## Usage

To be able to use our Store, we have to create an instance of it, and the instance must be supplied with an _instance of the PouchDB database_ and the main model class.

```typescript
import PouchDB from "pouchdb";
const carsDB = new PouchDB("cars");

export const cars = new Cars({ model: Car, DBInstance: carsDB });
```

#### Store API

You will access those directly in your React app.

-   `cars.docs`: is a _readonly_ property that has all documents in the store, sorted by the given sort function.
-   `cars.selectedID`: set this property to a specific ID and you'll have the document in `cars.selectedDoc`.
-   `cars.new(json?:carSchema)`: returns a document (not saved, yet), with the initial values, or if supplied with JSON as an argument, it would also return a document with those JSON data as initial values.
-   `cars.add(document?:Car, mobxOnly: boolean = false)`: saves a new document (both in PouchDB & MobX Store, unless the second argument is set to be true).
-   `cars.delete(id:string, mobxOnly: boolean = false)`: deletes a document with the given _id_ (both from PouchDB & MobX Store, unless the second argument is set to be true).
-   `store.updateFromPouch()`: checks the difference between current state of the store and PouchDB database and syncs the data between the two. This will happen automatically. i.e., normally you will never need to call this function.

Usually, you'll only need the store API to read/write to your data through MobX.

> License: The MIT License (MIT) - Copyright (c) 2019 Alex Corvi
