const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient();

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || "products";

module.exports.handler = async (event) => {
	try {
		const result = await dynamo
			.scan({
				TableName: PRODUCTS_TABLE
			})
			.promise();

		//exclude userId
		const products = result.Items.map((product) => {
			const { userId, ...productWithoutUserId } = product;
			return productWithoutUserId;
		});

		return {
			statusCode: 200,
			body: JSON.stringify({ data: products })
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({
				message: "Error obteniendo productos",
				error: error.message
			})
		};
	}
};
