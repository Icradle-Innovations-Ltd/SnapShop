const crypto = require("crypto");

const JWT_ALGORITHM = "HS256";
const TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7;

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input) {
  const padded = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  const [salt, key] = String(storedHash || "").split(":");
  if (!salt || !key) {
    return false;
  }

  const derivedKey = crypto.scryptSync(password, salt, 64);
  const storedKeyBuffer = Buffer.from(key, "hex");
  if (derivedKey.length !== storedKeyBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedKey, storedKeyBuffer);
}

function getJwtSecret() {
  return process.env.JWT_SECRET || "snapshop-dev-secret-change-me";
}

function signJwt(payload, expiresInSeconds = TOKEN_EXPIRY_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: JWT_ALGORITHM,
    typ: "JWT"
  };
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const signature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${encodedHeader}.${encodedBody}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedBody}.${signature}`;
}

function verifyJwt(token) {
  const [encodedHeader, encodedBody, signature] = String(token || "").split(".");
  if (!encodedHeader || !encodedBody || !signature) {
    throw new Error("Invalid token.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${encodedHeader}.${encodedBody}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  if (signature !== expectedSignature) {
    throw new Error("Invalid token signature.");
  }

  const payload = JSON.parse(base64UrlDecode(encodedBody));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error("Token has expired.");
  }

  return payload;
}

module.exports = {
  hashPassword,
  verifyPassword,
  signJwt,
  verifyJwt
};
