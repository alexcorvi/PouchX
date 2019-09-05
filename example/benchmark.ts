import { employees } from "./data";

function rs() {
	return Math.random().toString();
}

export async function benchmarkAdding() {
	console.time("adding");
	let ln = 100;
	while (ln--) {
		await employees.add(
			employees.new().fromJSON({
				_id: rs(),
				name: "new employee " + rs(),
				age: 0,
				canAccess: false,
				children: [
					{
						name: rs(),
						toys: Array.from(Array(100).keys()).map(x =>
							x.toString()
						)
					}
				]
			})
		);
	}
	console.timeEnd("adding");
}
