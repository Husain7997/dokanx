import { Platform } from "react-native";

export type MobileEnvironmentName = "dev" | "staging" | "prod";

type MobileEnvironment = {
  name: MobileEnvironmentName;
  apiBaseUrl: string;
  socketUrl: string;
  mapApiKey: string;
  sentryDsn: string;
  versionCheckUrl: string;
  appVersion: string;
};

const ENV_PRESETS: Record<MobileEnvironmentName, Omit<MobileEnvironment, "name" | "appVersion">> = {
  dev: {
    apiBaseUrl: "http://localhost:5001",
    socketUrl: "ws://localhost:5001",
    mapApiKey: "DEV_MAP_KEY",
    sentryDsn: "",
    versionCheckUrl: "http://localhost:5001/api/public/mobile/version",
  },
  staging: {
    apiBaseUrl: "https://staging-api.dokanx.com",
    socketUrl: "wss://staging-api.dokanx.com",
    mapApiKey: "STAGING_MAP_KEY",
    sentryDsn: "",
    versionCheckUrl: "https://staging-api.dokanx.com/api/public/mobile/version",
  },
  prod: {
    apiBaseUrl: "https://api.dokanx.com",
    socketUrl: "wss://api.dokanx.com",
    mapApiKey: "PROD_MAP_KEY",
    sentryDsn: "",
    versionCheckUrl: "https://api.dokanx.com/api/public/mobile/version",
  },
};

function normalizeEnvName(value?: string | null): MobileEnvironmentName {
  if (value === "prod" || value === "production") return "prod";
  if (value === "staging") return "staging";
  return "dev";
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function resolveDevHost(url: string) {
  if (Platform.OS === "android") {
    return url.replace("127.0.0.1", "10.0.2.2");
  }
  return url;
}

export function getCurrentEnvironment(appVersion = "1.0.0"): MobileEnvironment {
  const name = normalizeEnvName(process.env.APP_ENV);
  const preset = ENV_PRESETS[name];
  const apiBaseUrl = trimTrailingSlash(process.env.API_BASE_URL || preset.apiBaseUrl);
  const socketUrl = trimTrailingSlash(process.env.SOCKET_URL || preset.socketUrl);
  const versionCheckUrl = trimTrailingSlash(process.env.VERSION_CHECK_URL || preset.versionCheckUrl);

  return {
    name,
    apiBaseUrl: name === "dev" ? resolveDevHost(apiBaseUrl) : apiBaseUrl,
    socketUrl: name === "dev" ? resolveDevHost(socketUrl) : socketUrl,
    mapApiKey: process.env.MAP_API_KEY || preset.mapApiKey,
    sentryDsn: process.env.SENTRY_DSN || preset.sentryDsn,
    versionCheckUrl: name === "dev" ? resolveDevHost(versionCheckUrl) : versionCheckUrl,
    appVersion,
  };
}
