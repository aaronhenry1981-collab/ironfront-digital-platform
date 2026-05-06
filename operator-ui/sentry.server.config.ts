/**
 * Server-side Sentry init. Loaded by src/instrumentation.ts only when
 * SENTRY_DSN is set, so the SDK adds zero overhead when disabled.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  // Sample 10% of normal events; 100% of errors are always captured.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  // Don't send PII by default.
  sendDefaultPii: false,
})
