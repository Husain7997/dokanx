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
    apiBaseUrl: "http://127.0.0.1:5001",
    socketUrl: "ws://127.0.0.1:5001",
    mapApiKey: "DEV_MAP_KEY",
    sentryDsn: "",
    versionCheckUrl: "http://127.0.0.1:5001/api/public/mobile/version",
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

export function getCurrentEnvironment(appVersion = "1.0.0"): MobileEnvironment {
  const name = normalizeEnvName(process.env.APP_ENV);
  const preset = ENV_PRESETS[name];

  return {
    name,
    apiBaseUrl: trimTrailingSlash(process.env.API_BASE_URL || preset.apiBaseUrl),
    socketUrl: trimTrailingSlash(process.env.SOCKET_URL || preset.socketUrl),
    mapApiKey: process.env.MAP_API_KEY || preset.mapApiKey,
    sentryDsn: process.env.SENTRY_DSN || preset.sentryDsn,
    versionCheckUrl: trimTrailingSlash(process.env.VERSION_CHECK_URL || preset.versionCheckUrl),
    appVersion,
  };
}
