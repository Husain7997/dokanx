const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const path = require("path");

const appRoot = __dirname;
const workspaceRoot = path.resolve(appRoot, "../../..");
const repoRoot = path.resolve(appRoot, "../../../..");

const config = {
  projectRoot: appRoot,
  watchFolders: [workspaceRoot, path.join(repoRoot, "node_modules")],
  resolver: {
    extraNodeModules: {
      react: path.join(workspaceRoot, "node_modules", "react"),
      "react-native": path.join(workspaceRoot, "node_modules", "react-native"),
      "@babel/runtime": path.join(repoRoot, "node_modules", "@babel", "runtime"),
      "metro-runtime": path.join(repoRoot, "node_modules", "metro-runtime"),
      "react-native-gesture-handler": path.join(appRoot, "src", "shims", "react-native-gesture-handler"),
      "react-native-safe-area-context": path.join(appRoot, "src", "shims", "react-native-safe-area-context"),
    },
    resolverMainFields: ["react-native", "browser", "main"],
    useWatchman: false,
    nodeModulesPaths: [
      path.join(workspaceRoot, "node_modules"),
      path.join(repoRoot, "node_modules"),
    ],
    alias: {
      "@": path.join(appRoot, "src"),
      "@mobile-shared": path.join(appRoot, "../shared"),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(appRoot), config);
