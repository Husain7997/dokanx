require("module-alias/register");
require("dotenv").config();

const { registerProcessGuards, startServer } = require("./bootstrap/startServer");

registerProcessGuards();
startServer();
