import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code        = searchParams.get('code')
  const schoolId    = searchParams.get('school_id')
  const role        = searchParams.get('role') as 'student' | 'coordinator' | 'expositor' | null
  const coordCodeId = searchParams.get('coord_code_id')
  const expoCodeId  = searchParams.get('expo_code_id')
  const level       = searchParams.get('level')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  console.log('role from params:', role)
  console.log('school_id from params:', schoolId)

  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
  if (sessionError || !sessionData.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const user = sessionData.user

  // Use service-role client for all DB writes — bypasses RLS on profiles/codes tables
  const admin = await createSupabaseAdminClient()

  // Check if profile already exists (returning user login via Google)
  const { data: existing } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!existing) {
    // New registration — create profile
    const { error: insertError } = await admin.from('profiles').insert({
      id:           user.id,
      full_name:    user.user_metadata?.full_name ?? user.email,
      email:        user.email,
      school_id:    schoolId || null,
      role:         role ?? 'student',
      school_level: role === 'student' ? (level || 'senior') : null,
    })
    if (insertError) console.error('Profile insert error:', insertError)

    if (role === 'coordinator' && coordCodeId) {
      await admin
        .from('coordinator_codes')
        .update({ used: true, used_by: user.id })
        .eq('id', coordCodeId)
    }

    if (role === 'expositor' && expoCodeId) {
      await admin
        .from('expositor_codes')
        .update({ used: true, used_by: user.id })
        .eq('id', expoCodeId)
    }
  }

  // Always read the final role from DB — never trust query params alone
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  console.log('role from DB:', profile?.role)

  const finalRole = profile?.role ?? 'student'
  const dest = finalRole === 'coordinator' ? '/coordinator' : finalRole === 'expositor' ? '/expositor' : '/dashboard'
  return NextResponse.redirect(new URL(dest, origin))
}
