// login lambda function
const Auth = require("aws-amplify");
const AuthService = require("./auth/auth.service");
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
