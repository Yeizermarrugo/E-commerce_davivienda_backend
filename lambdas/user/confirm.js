const { CognitoIdentityProviderClient, ConfirmSignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");
const client = new CognitoIdentityProviderClient({ region: "us-west-1" });

exports.handler = async (event) => {
	const { email, code } = JSON.parse(event.body);

	try {
		await client.send(
			new ConfirmSignUpCommand({
				ClientId: process.env.USER_CLIENT_ID,
				Username: email,
				ConfirmationCode: code
			})
		);
		return {
			statusCode: 200,
			body: JSON.stringify({ message: "Usuario confirmado exitosamente" })
		};
	} catch (error) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "Error al confirmar usuario", error: error.toString() })
		};
	}
};
