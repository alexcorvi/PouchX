import { benchmarkAdding } from "./benchmark";
import { employees } from "./data";
import { Child } from "../mocks";
import { toJS } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import * as ReactDOM from "react-dom";

const App = observer(() => (
	<main>
		<h1>Example application</h1>
		<button
			onClick={() => {
				benchmarkAdding();
			}}
		>
			Benchmark Adding
		</button>
		<div
			style={{
				width: "40%",
				float: "left",
				height: 400,
				overflowY: "scroll",
				border: "5px solid"
			}}
		>
			<ul>
				{employees.docs.map(employee => (
					<li
						key={employee._id}
						id={employee.name}
						onClick={() => {
							employees.selectedID = employee._id;
						}}
					>
						{employee.name}
					</li>
				))}
			</ul>
			<button
				id="add"
				onClick={() => {
					employees.add(
						employees.new().fromJSON({
							_id: Math.random().toString(),
							name: "new employee " + (employees.docs.length + 1),
							age: 0,
							canAccess: false,
							children: []
						})
					);
				}}
			>
				Add
			</button>
		</div>
		{employees.selectedDoc ? (
			<div
				style={{
					width: "40%",
					float: "left",
					height: 400,
					overflowY: "scroll",
					border: "5px solid"
				}}
			>
				<p>Name: </p>
				<input
					id="name"
					value={employees.selectedDoc.name}
					onChange={ev => {
						employees.selectedDoc!.name = ev.target.value;
					}}
				/>
				<hr />
				<p>Age: </p>
				<input
					id="age"
					type="number"
					value={employees.selectedDoc.age}
					onChange={ev => {
						employees.selectedDoc!.age = Number(ev.target.value);
					}}
				/>
				<hr />
				<p>Can access: </p>
				<input
					id="access"
					type="checkbox"
					checked={employees.selectedDoc.canAccess}
					onChange={ev => {
						employees.selectedDoc!.canAccess = ev.target.checked;
					}}
				/>
				<hr />
				<table style={{ width: "100%" }}>
					<tbody>
						{employees.selectedDoc.children.map(
							(child, childIndex) => (
								<tr key={childIndex}>
									<td>
										<input
											className="child-name"
											value={child.name}
											onChange={ev => {
												child.name = ev.target.value;
											}}
										/>
									</td>
									<td>
										{child.toys.map((toy, toyIndex) => (
											<div key={toyIndex}>
												<input
													className="toy-name"
													value={toy}
													onChange={ev => {
														child.toys[toyIndex] =
															ev.target.value;
													}}
												/>
												<button
													onClick={() => {
														child.toys.splice(
															toyIndex,
															1
														);
													}}
												>
													delete
												</button>
											</div>
										))}
										<button
											onClick={() => {
												child.toys.push("new toy");
											}}
										>
											Add toy
										</button>
									</td>
								</tr>
							)
						)}
					</tbody>
				</table>
				<button
					onClick={() => {
						employees.selectedDoc!.children.push(
							new Child().fromJSON({
								name: "child",
								toys: []
							})
						);
					}}
				>
					Add child
				</button>
				<button
					onClick={() => {
						employees.delete(employees.selectedID);
						employees.selectedID = "";
					}}
				>
					Delete Employee
				</button>
			</div>
		) : (
			""
		)}
	</main>
));

ReactDOM.render(<App />, document.getElementById("root"));
