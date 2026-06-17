import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    throw new Error('Test error - Sentry integration check')
  } catch (error) {
    Sentry.captureException(error)
    return new Response('Test error sent to Sentry', { status: 200 })
  }
}
