const { CognitoIdentityProviderClient, SignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");
const { createUser } = require("./auth/auth.service");

const client = new CognitoIdentityProviderClient({ region: "us-west-1" });

exports.handler = async (event) => {
	if (event.httpMethod === "OPTIONS") {
		return {
			statusCode: 204,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
			}
		};
	}
	const body = JSON.parse(event.body);
	const { email, password, phone, name } = body;

	// Validación básica
	if (!name || !email || !password || !phone) {
		return {
			statusCode: 400,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
			},
			body: JSON.stringify({ message: "Todos los campos son obligatorios" })
		};
	}
	console.log("USER_CLIENT_ID: ", process.env.USER_CLIENT_ID);

	try {
		const command = new SignUpCommand({
			ClientId: process.env.USER_CLIENT_ID,
			Username: email,
			Password: password,
			UserAttributes: [
				{ Name: "email", Value: String(email) },
				{ Name: "phone_number", Value: String(phone) },
				{ Name: "name", Value: String(name) }
			]
		});

		const result = await client.send(command);

		// guarda los datos extra en DynamoDB si es necesario
		// const userData = await createUser(body);

		return {
			statusCode: 201,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
			},
			body: JSON.stringify({ message: "Usuario registrado", userSub: result.UserSub })
		};
	} catch (error) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "Error al registrar usuario", error: error.toString() })
		};
	}
};
