const { generateAccessToken } = require("../security/token.service");

module.exports = (user) => generateAccessToken(user);
