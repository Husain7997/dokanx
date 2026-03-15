const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../../../../");

const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    extraNodeModules: {
      react: path.join(workspaceRoot, "node_modules", "react"),
      "react-native": path.join(workspaceRoot, "node_modules", "react-native"),
      "@babel/runtime": path.join(workspaceRoot, "node_modules", "@babel", "runtime"),
    },
    resolverMainFields: ["react-native", "browser", "main"],
    nodeModulesPaths: [path.join(workspaceRoot, "node_modules")],
    alias: {
      "@": path.join(projectRoot, "src"),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
