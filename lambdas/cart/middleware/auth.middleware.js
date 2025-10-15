const jwt = require("jsonwebtoken");
const axios = require("axios");
const jwkToPem = require("jwk-to-pem");

const COGNITO_POOL_ID = process.env.COGNITO_POOL_ID;
const COGNITO_REGION = process.env.COGNITO_REGION;
const JWKS_URL = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_POOL_ID}/.well-known/jwks.json`;

console.log("COGNITO_POOL_ID: ", COGNITO_POOL_ID);
console.log("COGNITO_REGION: ", COGNITO_REGION);
console.log("JWKS_URL: ", JWKS_URL);

let cacheKeys;

const getPublicKeys = async () => {
	if (!cacheKeys) {
		const { data } = await axios.get(JWKS_URL);
		cacheKeys = data.keys.reduce((agg, current) => {
			agg[current.kid] = current;
			return agg;
		}, {});
	}
	return cacheKeys;
};

const verifyToken = async (token) => {
	const sections = token.split(".");
	if (sections.length < 3) throw new Error("token invalid");
	const header = JSON.parse(Buffer.from(sections[0], "base64").toString());
	const keys = await getPublicKeys();
	const key = keys[header.kid];
	if (!key) throw new Error("Public key not found in jwks.json");
	const pem = jwkToPem(key);
	return new Promise((resolve, reject) => {
		jwt.verify(token, pem, { algorithms: ["RS256"] }, (err, decoded) => {
			if (err) return reject(err);
			resolve(decoded);
		});
	});
};

// Middleware friendly: recibe solo token
module.exports.validateToken = async (token) => {
	if (!token) {
		throw new Error("No se proporcionó un token de autorización");
	}
	return verifyToken(token);
};
