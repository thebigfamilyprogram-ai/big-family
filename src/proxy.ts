import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = ['/dashboard', '/coordinator', '/admin', '/expositor'].some(p => pathname.startsWith(p))
  const isAuthPage  = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password'

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
    // Fetch role once for all role-based decisions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role ?? 'student'

    // Authenticated → redirect away from auth pages to their home
    if (isAuthPage) {
      const dest = role === 'coordinator' ? '/coordinator' : role === 'expositor' ? '/expositor' : '/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
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
    '/login',
    '/register',
    '/forgot-password',
  ]
}
