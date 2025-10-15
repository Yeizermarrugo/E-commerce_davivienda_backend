jest.mock("uuid", () => ({ v4: jest.fn(() => "fixed-uuid") }));

// Mock del util de crypt (usado para comparePassword)
jest.mock("./utils/crypt.js", () => ({
	hashPassword: jest.fn(),
	comparePassword: jest.fn()
}));

// Creamos mocks compartidos para get/put y mockeamos aws-sdk antes de require del módulo
const mockGet = jest.fn();
const mockPut = jest.fn();

jest.mock("aws-sdk", () => {
	return {
		DynamoDB: {
			DocumentClient: jest.fn(() => ({
				get: mockGet,
				put: mockPut
			}))
		}
	};
});

const uuid = require("uuid");
const crypt = require("./utils/crypt");
const userService = require("./auth/auth.service");

describe("user.service", () => {
	beforeEach(() => {
		mockGet.mockReset();
		mockPut.mockReset();
		uuid.v4.mockClear();
		crypt.comparePassword.mockClear();
		crypt.hashPassword.mockClear();
		// Asegurar variable de entorno usada por el servicio si aplica
		process.env.USERS_TABLE = "test-users-table";
	});

	describe("getUserByEmail", () => {
		test("devuelve usuario cuando existe", async () => {
			const item = { id: "1", email: "ana@example.com", password: "hashed" };
			mockGet.mockImplementation(() => ({ promise: () => Promise.resolve({ Item: item }) }));

			const res = await userService.getUserByEmail("ana@example.com");

			expect(mockGet).toHaveBeenCalledTimes(1);
			expect(res).toEqual(item);
		});

		test("lanza error cuando no existe el usuario", async () => {
			mockGet.mockImplementation(() => ({ promise: () => Promise.resolve({}) }));

			await expect(userService.getUserByEmail("noexiste@example.com")).rejects.toThrow("Error al obtener el usuario");

			expect(mockGet).toHaveBeenCalledTimes(1);
		});

		test("lanza error cuando DocumentClient falla", async () => {
			mockGet.mockImplementation(() => ({ promise: () => Promise.reject(new Error("AWS error")) }));

			await expect(userService.getUserByEmail("err@example.com")).rejects.toThrow("Error al obtener el usuario");

			expect(mockGet).toHaveBeenCalledTimes(1);
		});
	});

	describe("createUser", () => {
		const payload = { name: "Ana", email: "ana@example.com", phone: "3001112222" };

		test("crea usuario correctamente y devuelve ok:true con newUser", async () => {
			mockPut.mockImplementation(() => ({ promise: () => Promise.resolve({}) }));

			const res = await userService.createUser(payload);

			expect(mockPut).toHaveBeenCalledTimes(1);
			expect(res.ok).toBe(true);
			expect(res.newUser).toBeDefined();
			expect(res.newUser.id).toBe("fixed-uuid"); // uuid mocked
			expect(res.newUser.name).toBe(payload.name);
			expect(res.newUser.email).toBe(payload.email);
			expect(res.newUser.phone).toBe(payload.phone);
			expect(res.newUser.createdAt).toBeDefined();
		});

		test("retorna ok:false y mensaje de email registrado cuando ConditionalCheckFailedException", async () => {
			const awsErr = { code: "ConditionalCheckFailedException", message: "conditional failed" };
			mockPut.mockImplementation(() => ({ promise: () => Promise.reject(awsErr) }));

			const res = await userService.createUser(payload);

			expect(mockPut).toHaveBeenCalledTimes(1);
			expect(res).toEqual({ ok: false, error: "El email ya está registrado" });
		});

		test("retorna ok:false y detalle cuando hay otro error", async () => {
			mockPut.mockImplementation(() => ({ promise: () => Promise.reject(new Error("Some AWS error")) }));

			const res = await userService.createUser(payload);

			expect(mockPut).toHaveBeenCalledTimes(1);
			expect(res.ok).toBe(false);
			// Nota: la implementación actual sobrescribe la clave error, así que esperamos el message
			expect(res.error).toMatch(/Some AWS error/);
		});
	});

	describe("loginUser", () => {
		test("retorna usuario cuando password es correcto", async () => {
			const item = { id: "1", email: "ana@example.com", password: "hashedpw" };
			mockGet.mockImplementation(() => ({ promise: () => Promise.resolve({ Item: item }) }));
			crypt.comparePassword.mockReturnValue(true);

			const user = await userService.loginUser("ana@example.com", "plainpass");

			expect(mockGet).toHaveBeenCalledTimes(1);
			expect(crypt.comparePassword).toHaveBeenCalledWith("plainpass", "hashedpw");
			expect(user).toEqual(item);
		});

		test("retorna false cuando password incorrecto", async () => {
			const item = { id: "1", email: "ana@example.com", password: "hashedpw" };
			mockGet.mockImplementation(() => ({ promise: () => Promise.resolve({ Item: item }) }));
			crypt.comparePassword.mockReturnValue(false);

			const user = await userService.loginUser("ana@example.com", "wrongpass");

			expect(mockGet).toHaveBeenCalledTimes(1);
			expect(crypt.comparePassword).toHaveBeenCalledWith("wrongpass", "hashedpw");
			expect(user).toBe(false);
		});

		test("retorna false cuando getUserByEmail falla (usuario no existe)", async () => {
			mockGet.mockImplementation(() => ({ promise: () => Promise.resolve({}) })); // getUserByEmail -> throws -> loginUser must return false

			const user = await userService.loginUser("noone@example.com", "any");

			expect(mockGet).toHaveBeenCalledTimes(1);
			expect(user).toBe(false);
		});

		test("retorna false cuando DocumentClient lanza error en get", async () => {
			mockGet.mockImplementation(() => ({ promise: () => Promise.reject(new Error("AWS get error")) }));

			const user = await userService.loginUser("err@example.com", "any");

			expect(mockGet).toHaveBeenCalledTimes(1);
			expect(user).toBe(false);
		});
	});
});
