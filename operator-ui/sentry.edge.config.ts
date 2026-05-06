/**
 * Edge-runtime Sentry init. Currently the app has no Edge routes
 * (middleware was removed; layouts and API routes are pinned to
 * Node.js), so this is a defensive stub for future Edge use.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  sendDefaultPii: false,
})
