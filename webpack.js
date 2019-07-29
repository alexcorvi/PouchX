var webpack = require("webpack");
module.exports = {
	entry: "./example/app.tsx",
	output: {
		filename: "app.js",
		path: __dirname + "/example/"
	},
	resolve: {
		extensions: [".ts", ".tsx", ".js", ".json", ".css", ".scss"]
	},
	mode: "development",
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: ["ts-loader"]
			},
			{
				enforce: "pre",
				test: /\.js$/,
				loader: "source-map-loader"
			}
		]
	},

	plugins: []
};
