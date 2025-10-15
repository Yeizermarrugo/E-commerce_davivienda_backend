const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient();
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || "products";

exports.handler = async (event) => {
	let body = event.body;
	if (typeof body === "string") {
		body = JSON.parse(body);
	}
	const { name, brand, price, description } = body;

	try {
		const scanResult = await dynamo
			.scan({
				TableName: PRODUCTS_TABLE,
				FilterExpression: "#name = :name AND #brand = :brand AND #price = :price AND #description = :description",
				ExpressionAttributeNames: {
					"#name": "name",
					"#brand": "brand",
					"#price": "price",
					"#description": "description"
				},
				ExpressionAttributeValues: {
					":name": name,
					":brand": brand,
					":price": price,
					":description": description
				}
			})
			.promise();

		return {
			statusCode: 200,
			body: JSON.stringify({
				exists: scanResult.Items.length > 0
			})
		};
	} catch (err) {
		return {
			statusCode: 500,
			body: JSON.stringify({
				message: "Error verificando duplicados",
				error: err.message
			})
		};
	}
};
