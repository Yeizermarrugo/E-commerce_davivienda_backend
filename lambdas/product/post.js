const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const { validateToken } = require("./middleware/auth.middleware");

const Lambda = new AWS.Lambda();
const dynamo = new AWS.DynamoDB.DocumentClient();
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || "products";
const VALIDATE_LAMBDA_NAME = process.env.VALIDATE_LAMBDA_NAME;

console.log("VALIDATE_LAMBDA_NAME: ", VALIDATE_LAMBDA_NAME);

exports.handler = async (event) => {
	// Extrae y valida el token de autorización
	console.log("event: ", JSON.stringify(event));
	const authHeader = event.headers?.Authorization || event.headers?.authorization;
	console.log("authHeader: ", JSON.stringify(authHeader));
	if (!authHeader) {
		return {
			statusCode: 401,
			body: JSON.stringify({
				message: "No autorizado. Falta token."
			})
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
			body: JSON.stringify({
				message: "Token inválido",
				error: err.message
			})
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
	const { name, brand, price, stock, description } = body || {};

	if (!name || !brand || !price) {
		return {
			statusCode: 400,
			body: JSON.stringify({
				message: "Faltan campos requeridos (name, brand, price)."
			})
		};
	}

	// Se invoca Lambda de validación de producto
	try {
		const validateResult = await Lambda.invoke({
			FunctionName: VALIDATE_LAMBDA_NAME,
			InvocationType: "RequestResponse",
			Payload: JSON.stringify({ body: { name, brand, price, description } })
		}).promise();

		const validation = JSON.parse(validateResult.Payload);
		console.log("validation: ", validation);
		// Si la Lambda de validación retorna error, propágalo
		if (validateResult.StatusCode !== 200) {
			return {
				statusCode: validation.statusCode || 500,
				body: validation.body || "Error interno en validación."
			};
		}
		// Si el producto existe, retorna 409
		const exists = JSON.parse(validation.body).exists;
		if (exists) {
			return {
				statusCode: 409,
				body: JSON.stringify({
					message: "El producto ya existe"
				})
			};
		}
	} catch (err) {
		return {
			statusCode: 500,
			body: JSON.stringify({
				message: "Error al validar el producto",
				error: err.message
			})
		};
	}

	// 5. Inserta el producto en DynamoDB
	const productId = uuidv4();
	const timestamp = new Date().toISOString();
	const product = {
		id: productId,
		name,
		brand,
		price,
		stock,
		description,
		userId: user.sub,
		createdAt: timestamp,
		updatedAt: timestamp
	};

	try {
		await dynamo
			.put({
				TableName: PRODUCTS_TABLE,
				Item: product,
				ConditionExpression: "attribute_not_exists(id)"
			})
			.promise();

		return {
			statusCode: 201,
			body: JSON.stringify({
				message: "Producto creado exitosamente",
				data: product
			})
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({
				message: "Error creando producto",
				error: error.message
			})
		};
	}
};
