import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = ['/dashboard', '/coordinator', '/admin', '/expositor', '/onboarding'].some(p => pathname.startsWith(p))
  const isAuthPage  = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password'
  const isOnboarding = pathname.startsWith('/onboarding')

  if (!isProtected && !isAuthPage) return NextResponse.next()

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

  // Unauthenticated → send to login
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    // Fetch role + onboarding status in one query
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role ?? 'student'
    // Default true so existing users (pre-onboarding feature) are not blocked
    const onboardingCompleted = profile?.onboarding_completed ?? true

    // Authenticated → redirect away from auth pages to their home
    if (isAuthPage) {
      const dest = role === 'admin' ? '/admin' : role === 'coordinator' ? '/coordinator' : role === 'expositor' ? '/expositor' : '/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }

    // Student onboarding gate: incomplete onboarding → send to test
    if (
      role === 'student' &&
      !onboardingCompleted &&
      !isOnboarding &&
      pathname.startsWith('/dashboard')
    ) {
      return NextResponse.redirect(new URL('/onboarding/test', request.url))
    }

    // Student completed onboarding → skip /onboarding/* back to dashboard
    if (role === 'student' && onboardingCompleted && isOnboarding) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Role-based protection
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (pathname.startsWith('/coordinator') && role !== 'coordinator' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (pathname.startsWith('/expositor') && role !== 'expositor' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/coordinator/:path*',
    '/admin/:path*',
    '/expositor/:path*',
    '/onboarding/:path*',
    '/login',
    '/register',
    '/forgot-password',
  ]
}
