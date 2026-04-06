const React = require("react");
const { AppRegistry } = require("react-native");

if (!global.performance) {
  global.performance = {};
}

if (typeof global.performance.now !== "function") {
  global.performance.now = () => Date.now();
}

const appName = require("./app.json").name;
const AppModule = require("./src/App");
const App = AppModule.default || AppModule;

console.log("[merchant-app] index module loaded");

if (global.ErrorUtils && typeof global.ErrorUtils.getGlobalHandler === "function" && typeof global.ErrorUtils.setGlobalHandler === "function") {
  const previousHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    try {
      console.log("[merchant-app] global error", JSON.stringify({
        isFatal,
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      }));
    } catch (_handlerError) {
      console.log("[merchant-app] global error fallback", String(error));
    }

    if (typeof previousHandler === "function") {
      previousHandler(error, isFatal);
    }
  });
}

AppRegistry.registerComponent(appName, () => App);
