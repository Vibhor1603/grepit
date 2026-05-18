import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "./src/lib/env.js";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Controlled by NEXT_PUBLIC_APP_ENV — set to "production" to enable
  enabled: isSentryEnabled(),

  sendDefaultPii: true,
  tracesSampleRate: 0.1,

  // Session Replay: 10% of all sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  integrations: [
    Sentry.replayIntegration(),
  ],
});

// Hook into App Router navigation transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
