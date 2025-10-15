// login lambda function
const { CognitoIdentityProviderClient, InitiateAuthCommand } = require("@aws-sdk/client-cognito-identity-provider");

const client = new CognitoIdentityProviderClient({ region: "us-west-1" });

exports.handler = async (event) => {
	const { email, password } = JSON.parse(event.body);

	if (!email || !password) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "Email y contraseña son obligatorios" })
		};
	}

	try {
		const command = new InitiateAuthCommand({
			AuthFlow: "USER_PASSWORD_AUTH",
			ClientId: process.env.USER_CLIENT_ID,
			AuthParameters: {
				USERNAME: email,
				PASSWORD: password
			}
		});

		const response = await client.send(command);

		return {
			statusCode: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
			},
			body: JSON.stringify({
				message: "Login exitoso",
				tokens: response.AuthenticationResult
			})
		};
	} catch (error) {
		return {
			statusCode: 400,
			body: JSON.stringify({
				message: "Error al loguear usuario",
				error: error.toString()
			})
		};
	}
};
