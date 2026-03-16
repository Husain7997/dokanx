const crypto = require("crypto");

const DEFAULT_KEY = "dokanx_default_secret_key_32bytes!!";

function getKey() {
  const raw = process.env.SECRETS_ENCRYPTION_KEY || DEFAULT_KEY;
  const keyBuffer = Buffer.from(raw);
  if (keyBuffer.length >= 32) {
    return keyBuffer.subarray(0, 32);
  }
  return Buffer.concat([keyBuffer, Buffer.alloc(32 - keyBuffer.length, 0)]);
}

function encryptSecret(value) {
  if (!value) return { cipher: null, iv: null };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    cipher: Buffer.concat([encrypted, tag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

function decryptSecret(cipherText, ivText) {
  if (!cipherText || !ivText) return null;
  const iv = Buffer.from(ivText, "base64");
  const data = Buffer.from(cipherText, "base64");
  const tag = data.subarray(data.length - 16);
  const encrypted = data.subarray(0, data.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

function hashSecret(value) {
  const secret = process.env.SECRETS_HASH_KEY || "dokanx_hash_key";
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

function randomToken(size = 32) {
  return crypto.randomBytes(size).toString("hex");
}

module.exports = {
  encryptSecret,
  decryptSecret,
  hashSecret,
  randomToken,
};
