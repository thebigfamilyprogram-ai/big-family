import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { i18nMiddleware } from './middleware-i18n'

// Non-default locale prefixes ('es' has no prefix with localePrefix:'as-needed')
const LOCALE_PREFIXES = ['en', 'fr', 'pt', 'ar'] as const

function stripLocale(pathname: string): string {
  for (const prefix of LOCALE_PREFIXES) {
    if (pathname === `/${prefix}` || pathname.startsWith(`/${prefix}/`)) {
      return pathname.slice(prefix.length + 1) || '/'
    }
  }
  return pathname
}

export async function proxy(request: NextRequest) {
  const i18nResponse = i18nMiddleware(request)
  if (i18nResponse) return i18nResponse

  const { pathname } = request.nextUrl
  const path = stripLocale(pathname)

  const isProtected  = ['/dashboard', '/coordinator', '/admin', '/expositor', '/onboarding'].some(p => path.startsWith(p))
  const isAuthPage   = path === '/login' || path === '/register' || path === '/forgot-password'
  const isOnboarding = path.startsWith('/onboarding')

  if (!isProtected && !isAuthPage) return i18nResponse

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {}
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Preserve locale prefix in all redirects
  const localeMatch = pathname.match(/^\/(en|fr|pt|ar)/)
  const localePref  = localeMatch ? `/${localeMatch[1]}` : ''

  // Unauthenticated → send to login
  if (!user && isProtected) {
    return NextResponse.redirect(new URL(`${localePref}/login`, request.url))
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()

    // Session exists but no profile row — registration never completed
    if (!profile && isProtected) {
      return NextResponse.redirect(new URL(`${localePref}/login?error=no_profile`, request.url))
    }

    const role = profile?.role ?? 'student'
    const onboardingCompleted = profile?.onboarding_completed === true

    // Authenticated → redirect away from auth pages to their home (only when profile exists)
    if (isAuthPage) {
      if (!profile) return i18nResponse
      const dest = role === 'admin' ? '/admin' : role === 'coordinator' ? '/coordinator' : role === 'expositor' ? '/expositor' : '/dashboard'
      return NextResponse.redirect(new URL(`${localePref}${dest}`, request.url))
    }

    // Student onboarding gate: incomplete onboarding → send to test
    if (role === 'student' && !onboardingCompleted && !isOnboarding && path.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL(`${localePref}/onboarding/test`, request.url))
    }

    // Student completed onboarding → skip /onboarding/* back to dashboard
    if (role === 'student' && onboardingCompleted && isOnboarding) {
      return NextResponse.redirect(new URL(`${localePref}/dashboard`, request.url))
    }

    // Role-based protection
    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(`${localePref}/dashboard`, request.url))
    }
    if (path.startsWith('/coordinator') && role !== 'coordinator' && role !== 'admin') {
      return NextResponse.redirect(new URL(`${localePref}/dashboard`, request.url))
    }
    if (path.startsWith('/expositor') && role !== 'expositor' && role !== 'admin') {
      return NextResponse.redirect(new URL(`${localePref}/dashboard`, request.url))
    }
  }

  return i18nResponse
}

export default proxy

export const config = {
  // Run on all routes except Next.js internals, API routes, and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}
