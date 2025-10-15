const uuid = require("uuid");
const { hashPassword, comparePassword } = require("../utils/crypt");
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

const USERS_TABLE = process.env.USERS_TABLE;

const getUserByEmail = async (email) => {
	const params = {
		TableName: USERS_TABLE,
		Key: {
			email
		}
	};

	try {
		const result = await dynamodb.get(params).promise();
		if (!result.Item) {
			throw new Error("Usuario no encontrado");
		}
		return result.Item;
	} catch (error) {
		console.log("error: ", error);
		throw new Error("Error al obtener el usuario");
	}
};

const createUser = async (data) => {
	console.log("daat:", data);
	const newUser = {
		id: uuid.v4(),
		name: data.name,
		email: data.email,
		phone: data.phone,
		createdAt: new Date().toISOString()
	};

	const params = {
		TableName: USERS_TABLE,
		Item: newUser,
		conditionExpression: "attribute_not_exists(email)"
	};
	console.log("params: ", JSON.stringify(params));

	try {
		await dynamodb.put(params).promise();
		console.log("todo bien: ", newUser);
		return { ok: true, newUser };
	} catch (err) {
		if (err.code === "ConditionalCheckFailedException") {
			return { ok: false, error: "El email ya está registrado" };
		}
		console.log("error: ", err.message);
		return { ok: false, error: "Error al registrar usuario", error: err.message };
	}
};

const loginUser = async (email, password) => {
	try {
		const user = await getUserByEmail(email);
		const verifyPassword = comparePassword(password, user.password);
		if (verifyPassword) {
			return user;
		} else {
			return false;
		}
	} catch (error) {
		return false;
	}
};

module.exports = { createUser, getUserByEmail, loginUser };
