import { getCurrentEnvironment } from "./env";

export function getApiBaseUrl(appVersion?: string) {
  return getCurrentEnvironment(appVersion).apiBaseUrl;
}

export function getSocketUrl(appVersion?: string) {
  return getCurrentEnvironment(appVersion).socketUrl;
}

export function getMapApiKey(appVersion?: string) {
  return getCurrentEnvironment(appVersion).mapApiKey;
}
