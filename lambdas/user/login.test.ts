const mockSend = jest.fn();

// Mock del módulo @aws-sdk/client-cognito-identity-provider
jest.mock("@aws-sdk/client-cognito-identity-provider", () => {
	return {
		CognitoIdentityProviderClient: jest.fn(() => ({ send: mockSend })),
		InitiateAuthCommand: jest.fn((input) => ({ input }))
	};
});

describe("login lambda handler", () => {
	beforeEach(() => {
		// Reiniciar módulos para que el mock sea efectivo si el handler crea el client al importarse
		jest.resetModules();
		mockSend.mockReset();
		process.env.USER_CLIENT_ID = "test-client-id";
	});

	test("devuelve 400 si faltan email o password", async () => {
		// Importar después de resetModules para asegurar que el mock se aplique
		const { handler } = require("./login");
		const event = { body: JSON.stringify({ email: "", password: "" }) };
		const res = await handler(event);

		expect(res).toBeDefined();
		expect(res.statusCode).toBe(400);
		const body = JSON.parse(res.body);
		expect(body.message).toMatch(/Email y contraseña/);
	});

	test("login exitoso: llama a Cognito y retorna tokens", async () => {
		mockSend.mockResolvedValue({
			AuthenticationResult: {
				AccessToken: "access-token-xyz",
				RefreshToken: "refresh-xyz",
				IdToken: "id-xyz"
			}
		});

		const { handler } = require("./login");
		const event = { body: JSON.stringify({ email: "ana@example.com", password: "pass123" }) };
		const res = await handler(event);

		expect(mockSend).toHaveBeenCalledTimes(1);
		expect(res).toBeDefined();
		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.message).toMatch(/Login exitoso/);
		expect(body.tokens).toBeDefined();
		expect(body.tokens.AccessToken).toBe("access-token-xyz");
	});

	test("error al loguear: captura excepción y retorna 400", async () => {
		mockSend.mockRejectedValue(new Error("NotAuthorizedException: incorrect username or password"));

		const { handler } = require("./login");
		const event = { body: JSON.stringify({ email: "ana@example.com", password: "wrongpass" }) };
		const res = await handler(event);

		expect(mockSend).toHaveBeenCalledTimes(1);
		expect(res).toBeDefined();
		expect(res.statusCode).toBe(400);
		const body = JSON.parse(res.body);
		expect(body.message).toMatch(/Error al loguear usuario/);
		expect(body.error).toMatch(/NotAuthorizedException/);
	});
});
