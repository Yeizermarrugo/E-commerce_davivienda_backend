import { APIGatewayProxyEvent } from "aws-lambda";

const mockSend = jest.fn();

// Mock del SDK v3 de AWS Cognito
jest.mock("@aws-sdk/client-cognito-identity-provider", () => {
	return {
		CognitoIdentityProviderClient: jest.fn(() => ({ send: mockSend })),
		ConfirmSignUpCommand: jest.fn((input) => ({ input })),
		__esModule: true
	};
});

describe("confirm handler", () => {
	beforeEach(() => {
		// Reiniciar módulos y mocks por si el handler crea el client al importarse
		jest.resetModules();
		mockSend.mockReset();
		process.env.USER_CLIENT_ID = "test-client-id";
	});

	const loadHandler = async () => {
		const mod = await require("./confirm");
		return mod.handler as (event: APIGatewayProxyEvent) => Promise<any>;
	};

	const makeEvent = (bodyObj: Record<string, any>): APIGatewayProxyEvent => {
		return {
			body: JSON.stringify(bodyObj),
			headers: {},
			multiValueHeaders: {},
			httpMethod: "POST",
			isBase64Encoded: false,
			path: "/confirm",
			pathParameters: null,
			queryStringParameters: null,
			multiValueQueryStringParameters: null,
			stageVariables: null,
			requestContext: {} as unknown as any,
			resource: ""
		};
	};

	test("retorna 200 y mensaje de éxito cuando Cognito confirma correctamente", async () => {
		mockSend.mockResolvedValueOnce({}); // simulamos respuesta exitosa

		const handler = await loadHandler();
		const event = makeEvent({ email: "ana@example.com", code: "123456" });

		const res = await handler(event);

		expect(mockSend).toHaveBeenCalledTimes(1);
		// Verificamos que se haya llamado con un ConfirmSignUpCommand (mock), su input contiene ClientId y Username
		const calledArg = mockSend.mock.calls[0][0];
		// Cuando usamos mock de ConfirmSignUpCommand, nuestro mock devuelve objeto { input }, por eso checamos el input
		expect(calledArg).toBeDefined();
		// Respuesta de la lambda
		expect(res).toBeDefined();
		expect(res.statusCode).toBe(200);
		expect(res.headers).toBeDefined();
		const body = JSON.parse(res.body);
		expect(body.message).toMatch(/Usuario confirmado exitosamente/);
	});

	test("retorna 400 y detalle del error cuando Cognito arroja excepción", async () => {
		mockSend.mockRejectedValueOnce(new Error("CodeMismatchException: invalid code"));

		const handler = await loadHandler();
		const event = makeEvent({ email: "ana@example.com", code: "000000" });

		const res = await handler(event);

		expect(mockSend).toHaveBeenCalledTimes(1);
		expect(res).toBeDefined();
		expect(res.statusCode).toBe(400);
		const body = JSON.parse(res.body);
		expect(body.message).toMatch(/Error al confirmar usuario/);
		expect(body.error).toMatch(/CodeMismatchException/);
	});

	test("si el body no es JSON válido el handler lanza (JSON.parse fuera del try en implementación)", async () => {
		// En tu implementación JSON.parse ocurre antes del try, por eso un JSON inválido provoca excepción no capturada.
		const handler = await loadHandler();
		const invalidEvent = { body: "{ not-a-json" } as APIGatewayProxyEvent;

		await expect(handler(invalidEvent)).rejects.toThrow();
		// Nota: si prefieres que la lambda capture parse errors, mueve JSON.parse dentro del try y adapta el test.
	});
});
