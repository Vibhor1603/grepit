import * as Sentry from "@sentry/nextjs";
import { isSentryEnabled } from "./src/lib/env.js";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Controlled by NEXT_PUBLIC_APP_ENV — set to "production" to enable
  enabled: isSentryEnabled(),

  sendDefaultPii: true,
  tracesSampleRate: 0.1,

  enableLogs: true,
});
