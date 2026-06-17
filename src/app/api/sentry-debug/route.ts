import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'

export async function GET() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  const clientBefore = Sentry.getClient()

  // If instrumentation.ts didn't initialize Sentry, do it inline as fallback test
  if (!clientBefore && dsn) {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      sampleRate: 1.0,
      tracesSampleRate: 0.1,
    })
  }

  const clientAfter = Sentry.getClient()
  const eventId = Sentry.captureMessage('[Debug] Sentry ping — Big Family')
  await Sentry.flush(3000)

  return Response.json({
    dsn_set: !!dsn,
    node_env: process.env.NODE_ENV,
    next_runtime: process.env.NEXT_RUNTIME,
    client_initialized_by_instrumentation: !!clientBefore,
    client_initialized_after_inline_init: !!clientAfter,
    event_id: eventId ?? 'null',
    verdict: clientBefore
      ? 'instrumentation.ts working — event should appear in Sentry'
      : clientAfter
        ? 'instrumentation.ts NOT working, but inline init succeeded — check Sentry for event'
        : 'SDK init failed — check DSN and package',
  })
}
