const { CognitoIdentityProviderClient, SignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");
const { createUser } = require("./auth/auth.service");

// Opcional: configura región si es necesario
const client = new CognitoIdentityProviderClient({ region: "us-west-1" }); // Cambia la región si aplica

exports.handler = async (event) => {
	const body = JSON.parse(event.body);
	const { email, password, phone, name } = body;

	// Validación básica
	if (!name || !email || !password || !phone) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "Todos los campos son obligatorios" })
		};
	}
	console.log("USER_CLIENT_ID: ", process.env.USER_CLIENT_ID);

	try {
		const command = new SignUpCommand({
			ClientId: process.env.USER_CLIENT_ID, // Pon tu app client id aquí o como variable de entorno
			Username: email,
			Password: password,
			UserAttributes: [
				{ Name: "email", Value: String(email) },
				{ Name: "phone_number", Value: String(phone) }
			]
		});

		const result = await client.send(command);

		// Opcional: guarda los datos extra en DynamoDB si lo necesitas
		const userData = await createUser(body);

		return {
			statusCode: 201,
			body: JSON.stringify({ message: "Usuario registrado", userSub: result.UserSub })
		};
	} catch (error) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "Error al registrar usuario", error: error.toString() })
		};
	}
};
