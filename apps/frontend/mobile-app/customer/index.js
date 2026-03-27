import { AppRegistry } from "react-native";

import App from "./src/App";
import { name as appName } from "./app.json";

globalThis.__DOKANX_CUSTOMER_BOOT_TS = Date.now();
console.info("[CustomerBoot] app start", { ts: globalThis.__DOKANX_CUSTOMER_BOOT_TS });

AppRegistry.registerComponent(appName, () => App);