/**
 * Next.js instrumentation hook — runs once on server start.
 * Initializes Sentry only if SENTRY_DSN is configured.
 */

export async function register() {
  if (!process.env.SENTRY_DSN) return
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}
