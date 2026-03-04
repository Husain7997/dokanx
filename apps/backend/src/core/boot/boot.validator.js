const fs = require("fs");
const path = require("path");

/* =====================================
   ROUTE VALIDATION
===================================== */

function validateRoutes() {
  console.log("🔍 Validating routes...");

  const routesDir = path.join(__dirname, "../../routes");

  function scan(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const full = path.join(dir, file);

      if (fs.statSync(full).isDirectory()) {
        scan(full);
        continue;
      }

      if (!file.endsWith(".js")) continue;

      const route = require(full);

      if (!route) {
        throw new Error(`❌ Invalid route export: ${file}`);
      }
    }
  }

  scan(routesDir);

  console.log("✅ Routes OK");
}

/* =====================================
   CONTROLLER VALIDATION
===================================== */

function validateControllers() {
  console.log("🔍 Validating controllers...");

  const controllerDir = path.join(
    __dirname,
    "../../controllers"
  );

  function scan(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const full = path.join(dir, file);

      if (fs.statSync(full).isDirectory()) {
        scan(full);
        continue;
      }

      if (!file.endsWith(".js")) continue;

      const controller = require(full);

      Object.keys(controller).forEach(key => {
        if (typeof controller[key] !== "function") {
          throw new Error(
            `❌ Controller export invalid → ${file}:${key}`
          );
        }
      });
    }
  }

  scan(controllerDir);

  console.log("✅ Controllers OK");
}

/* =====================================
   CORE SYSTEM VALIDATION
===================================== */

function validateCore() {
  console.log("🔍 Validating core modules...");

  require("@/core/financial/financial.engine");
  require("@/core/selfheal/ledger.audit");

  console.log("✅ Core modules OK");
}

/* =====================================
   BOOT VALIDATOR
===================================== */

exports.runBootValidation = () => {
  console.log("\n🚀 DokanX Boot Validation Starting...\n");

  validateRoutes();
  validateControllers();
  validateCore();
  validateLedgerContract();

  console.log("\n✅ DokanX System Verified\n");
};

function validateLedgerContract() {
  console.log("🔍 Validating Financial Contract...");

  const engine =
    require("@/core/financial/financial.engine");

  if (!engine.execute)
    throw new Error(
      "FinancialEngine missing execute()"
    );

  console.log("✅ Financial Contract OK");
}