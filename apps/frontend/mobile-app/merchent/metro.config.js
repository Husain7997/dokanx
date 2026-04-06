const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const path = require("path");

const appRoot = __dirname;
const repoRoot = path.resolve(appRoot, "../../../..");
const repoNodeModules = path.join(repoRoot, "node_modules");

const config = {
  projectRoot: appRoot,
  watchFolders: [repoRoot, repoNodeModules],
  resolver: {
    disableHierarchicalLookup: true,
    extraNodeModules: {
      react: path.join(repoNodeModules, "react"),
      "react-native": path.join(repoNodeModules, "react-native"),
      "@babel/runtime": path.join(repoNodeModules, "@babel", "runtime"),
      "metro-runtime": path.join(repoNodeModules, "metro-runtime"),
      "react-native-gesture-handler": path.join(appRoot, "src", "shims", "react-native-gesture-handler"),
      "react-native-safe-area-context": path.join(appRoot, "src", "shims", "react-native-safe-area-context"),
    },
    resolverMainFields: ["react-native", "browser", "main"],
    useWatchman: false,
    nodeModulesPaths: [repoNodeModules],
    alias: {
      "@": path.join(appRoot, "src"),
      "@mobile-shared": path.join(appRoot, "../shared"),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(appRoot), config);