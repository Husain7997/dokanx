const crypto = require("crypto");

exports.sign = payload => {

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

};