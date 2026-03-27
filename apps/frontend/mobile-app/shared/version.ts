import { VERSION_CHECK_PATH } from "./constants";
import { getCurrentEnvironment } from "./env";
import { captureException } from "./sentry";

export type UpdateCheckResult = {
  latestVersion: string;
  minimumVersion: string;
  forceUpdate: boolean;
  storeUrl?: string;
  message?: string;
};

function normalizeVersionParts(version: string) {
  return version.split(".").map((part) => Number(part || 0));
}

export function isVersionOlder(currentVersion: string, minimumVersion: string) {
  const current = normalizeVersionParts(currentVersion);
  const minimum = normalizeVersionParts(minimumVersion);
  const length = Math.max(current.length, minimum.length);

  for (let index = 0; index < length; index += 1) {
    const currentPart = current[index] ?? 0;
    const minimumPart = minimum[index] ?? 0;

    if (currentPart < minimumPart) {
      return true;
    }

    if (currentPart > minimumPart) {
      return false;
    }
  }

  return false;
}

export async function checkForUpdate(appName: string, appVersion: string) {
  const env = getCurrentEnvironment(appVersion);
  const baseUrl = env.versionCheckUrl || `${env.apiBaseUrl}${VERSION_CHECK_PATH}`;
  const requestUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}app=${appName}&platform=android&version=${appVersion}`;

  try {
    const response = await fetch(requestUrl);

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as UpdateCheckResult;
  } catch (error) {
    captureException(error, { appName, area: "update-check" });
    return null;
  }
}
