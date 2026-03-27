const {getDefaultConfig, mergeConfig} = require("@react-native/metro-config");
const path = require("path");

const appRoot = __dirname;
const workspaceRoot = path.resolve(appRoot, "../../..");
const repoRoot = path.resolve(appRoot, "../../../..");

const config = {
  projectRoot: repoRoot,
  watchFolders: [appRoot, workspaceRoot, repoRoot, path.join(repoRoot, "node_modules")],
  resolver: {
    extraNodeModules: {
      react: path.join(repoRoot, "node_modules", "react"),
      "react-native": path.join(repoRoot, "node_modules", "react-native"),
      "@babel/runtime": path.join(repoRoot, "node_modules", "@babel", "runtime"),
      "metro-runtime": path.join(repoRoot, "node_modules", "metro-runtime"),
    },
    resolverMainFields: ["react-native", "browser", "main"],
    nodeModulesPaths: [
      path.join(repoRoot, "node_modules"),
      path.join(workspaceRoot, "node_modules"),
      path.join(appRoot, "node_modules"),
    ],
    alias: {
      "@": path.join(appRoot, "src"),
      "@mobile-shared": path.join(appRoot, "../shared"),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(repoRoot), config);
