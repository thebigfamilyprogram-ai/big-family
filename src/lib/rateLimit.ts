// In-memory rate limiting — sufficient for Vercel serverless per-instance
// For multi-region production, replace with Upstash or Redis
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; retryAfter?: number } {
  const now   = Date.now()
  const entry = rateLimitMap.get(identifier)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true }
}
