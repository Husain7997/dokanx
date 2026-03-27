import * as Sentry from "@sentry/react-native";

import { getCurrentEnvironment } from "./env";

let sentryInitialized = false;

export function initializeSentry(appName: string, appVersion: string) {
  if (sentryInitialized) {
    return;
  }

  const env = getCurrentEnvironment(appVersion);
  if (!env.sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.name,
    release: `${appName}@${appVersion}`,
    tracesSampleRate: env.name === "prod" ? 0.2 : 1,
  });

  sentryInitialized = true;
}

export function captureException(error: unknown, context?: Record<string, string>) {
  if (!sentryInitialized) {
    return;
  }

  Sentry.captureException(error, {
    tags: context,
  });
}
