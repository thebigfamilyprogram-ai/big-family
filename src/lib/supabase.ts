import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Never call createBrowserClient server-side — NEXT_PUBLIC_ vars may be
  // undefined during SSR/prerender, causing "Invalid supabaseUrl" crashes.
  if (typeof window === 'undefined') return null as any

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  // If env vars are missing or malformed, degrade gracefully instead of
  // crashing. Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
  // are set in Vercel → Project Settings → Environment Variables.
  if (!url.startsWith('http')) {
    console.error('[supabase] createClient: invalid URL "' + url + '" — check NEXT_PUBLIC_SUPABASE_URL in Vercel env vars')
    return null as any
  }

  try {
    return createBrowserClient(url, key)
  } catch (err) {
    console.error('[supabase] createBrowserClient threw:', err)
    return null as any
  }
}
