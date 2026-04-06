let sentryInitialized = false;

export function initializeSentry(_appName: string, _appVersion: string) {
  sentryInitialized = false;
}

export function captureException(error: unknown, context?: Record<string, string>) {
  if (!sentryInitialized) {
    if (error instanceof Error) {
      console.warn('[merchant-sentry:no-op]', error.message, context || {});
    }
    return;
  }
}