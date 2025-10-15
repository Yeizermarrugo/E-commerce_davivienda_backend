const { handler } = require("./register"); // importa tu handler

describe("Test registro de usuario Lambda", () => {
	it("debe responder 400 si faltan campos", async () => {
		const event = {
			httpMethod: "POST",
			body: JSON.stringify({ email: "user@example.com" }) // falta name, password, phone
		};

		const response = await handler(event);
		expect(response.statusCode).toBe(400);
		const body = JSON.parse(response.body);
		expect(body.message).toMatch(/todos los campos son obligatorios/i);

		expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
	});

	it("debe manejar método OPTIONS para CORS", async () => {
		const event = { httpMethod: "OPTIONS" };

		const response = await handler(event);
		expect(response.statusCode).toBe(204);
		expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
		expect(response.headers["Access-Control-Allow-Methods"]).toContain("POST");
	});

	// Puedes usar mocks para AWS SDK para simular exitoso
	// Ejemplo básico sin mock:
	it("debe retornar 201 usuario registrado cuando es válido", async () => {
		const event = {
			httpMethod: "POST",
			body: JSON.stringify({
				name: "Test User",
				email: "test@domain.com",
				password: "Password123",
				phone: "+123456789"
			})
		};

		// mock client.send para simular respuesta
		const { CognitoIdentityProviderClient, SignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");
		jest.spyOn(CognitoIdentityProviderClient.prototype, "send").mockResolvedValue({ UserSub: "fake-user-sub" });

		const response = await handler(event);
		expect(response.statusCode).toBe(201);
		const body = JSON.parse(response.body);
		expect(body.message).toContain("Usuario registrado");
		expect(body.userSub).toBe("fake-user-sub");
	});
});
