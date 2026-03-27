const fs = require("fs");
const path = require("path");
const android = require("@react-native-community/cli-platform-android");
const ios = require("@react-native-community/cli-platform-ios");

const iosSourceDir = path.join(__dirname, "ios");
const hasIosProject = fs.existsSync(iosSourceDir);

module.exports = {
  reactNativePath: "../../../node_modules/react-native",
  platforms: {
    android: {
      projectConfig: android.projectConfig,
      dependencyConfig: android.dependencyConfig,
    },
    ...(hasIosProject
      ? {
          ios: {
            projectConfig: ios.projectConfig,
            dependencyConfig: ios.dependencyConfig,
          },
        }
      : {}),
  },
  project: {
    android: {
      sourceDir: "./android",
      appName: "app",
      packageName: "com.dokanx.merchant",
    },
    ...(hasIosProject
      ? {
          ios: {
            sourceDir: "./ios",
          },
        }
      : {}),
  },
  dependencies: {
    "react-native-gesture-handler": {
      platforms: {
        android: null,
      },
    },
    "react-native-safe-area-context": {
      platforms: {
        android: null,
      },
    },
  },
  assets: ["./src/assets"],
};
