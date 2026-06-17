import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'

export async function GET() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  const client = Sentry.getClient()

  const eventId = Sentry.captureMessage('Sentry debug ping — Big Family')
  await Sentry.flush(3000)

  return Response.json({
    dsn_set: !!dsn,
    dsn_preview: dsn ? dsn.slice(0, 40) + '...' : 'NOT SET',
    node_env: process.env.NODE_ENV,
    next_runtime: process.env.NEXT_RUNTIME,
    sentry_client_initialized: !!client,
    sentry_client_dsn: client ? (client as any).getDsn()?.toString().slice(0, 40) + '...' : 'no client',
    event_id_from_capture: eventId ?? 'null (SDK not initialized)',
  })
}
