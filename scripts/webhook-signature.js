const crypto = require("crypto");

function sign(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function main() {
  const secret = process.argv[2];
  const payload = process.argv[3];
  if (!secret || !payload) {
    console.log("Usage: node scripts/webhook-signature.js <secret> <payload>");
    process.exit(1);
  }
  const signature = sign(secret, payload);
  console.log(signature);
}

main();
