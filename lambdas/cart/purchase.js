const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const { validateToken } = require("./middleware/auth.middleware");

const dynamo = new AWS.DynamoDB.DocumentClient();
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || "products";
const CART_TABLE = process.env.CART_TABLE || "cart";

exports.handler = async (event) => {
	console.log("event: ", JSON.stringify(event));
	const authHeader = event.headers?.Authorization || event.headers?.authorization;
	console.log("authHeader: ", JSON.stringify(authHeader));
	if (!authHeader) {
		return {
			statusCode: 401,
			body: JSON.stringify({ message: "No autorizado. Falta token." })
		};
	}
	let user;
	const token = authHeader.replace("Bearer ", "");
	console.log("token: ", token);
	try {
		user = await validateToken(token);
		event.user = user;
		console.log("decoded: ", JSON.stringify(user));
		console.log("event: ", JSON.stringify(event));
	} catch (err) {
		return {
			statusCode: 401,
			body: JSON.stringify({ message: "Token inválido", error: err.message })
		};
	}

	let body = event.body;
	if (typeof body === "string") {
		try {
			body = JSON.parse(body);
		} catch {
			return {
				statusCode: 400,
				body: JSON.stringify({ message: "Body inválido, no es JSON válido." })
			};
		}
	}

	console.log("body", JSON.stringify(body));
	const { products, total } = body || {};

	// Cambios aquí: requerimos id y name por cada producto
	if (!Array.isArray(products) || typeof total !== "number") {
		return { statusCode: 400, body: JSON.stringify({ message: "Invalid request body" }) };
	}
	for (const prod of products) {
		if (!prod.id || !prod.name) {
			return { statusCode: 400, body: JSON.stringify({ message: "Product id or name missing" }) };
		}
	}

	// Agrupa productos por id+name
	const productCounts = {};
	for (const prod of products) {
		const key = `${prod.id}||${prod.name}`;
		productCounts[key] = (productCounts[key] || 0) + 1;
	}

	// Validar stock de cada producto
	for (const [key, qty] of Object.entries(productCounts)) {
		const [id, name] = key.split("||");
		const getRes = await dynamo
			.get({
				TableName: PRODUCTS_TABLE,
				Key: { id, name }
			})
			.promise();
		const product = getRes.Item;
		if (!product) return { statusCode: 404, body: JSON.stringify({ message: `Product not found: ${id}` }) };
		if (typeof product.stock !== "number" || product.stock < qty) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					message: `Not enough stock for product ${id}`,
					available: product.stock || 0
				})
			};
		}
	}

	// Si todo OK, actualiza stock de cada producto
	try {
		for (const [key, qty] of Object.entries(productCounts)) {
			const [id, name] = key.split("||");
			await dynamo
				.update({
					TableName: PRODUCTS_TABLE,
					Key: { id, name },
					UpdateExpression: "SET stock = stock - :qty",
					ConditionExpression: "stock >= :qty",
					ExpressionAttributeValues: { ":qty": qty }
				})
				.promise();
		}
	} catch (err) {
		if (err.code === "ConditionalCheckFailedException") {
			return {
				statusCode: 400,
				body: JSON.stringify({ message: "No hay suficiente stock para uno de los productos." })
			};
		}
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Internal server error (update stock)", error: err.message })
		};
	}

	// Guarda la compra en la tabla cart
	const cartRecord = {
		id: uuidv4(),
		userId: user.sub,
		products,
		total,
		createdAt: new Date().toISOString()
	};

	try {
		await dynamo
			.put({
				TableName: CART_TABLE,
				Item: cartRecord
			})
			.promise();

		return {
			statusCode: 200,
			body: JSON.stringify({
				products,
				userId: user.sub,
				total
			})
		};
	} catch (err) {
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Internal server error (cart)", error: err.message })
		};
	}
};
