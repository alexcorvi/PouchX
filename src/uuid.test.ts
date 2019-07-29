import { UUID } from "./uuid";
/// <reference types="Jest" />

describe("UUID", () => {
	it("Returns a string", () => {
		const val = UUID();
		expect(typeof val).toBe("string");
	});
});
