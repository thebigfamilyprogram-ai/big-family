import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // createBrowserClient throws "Invalid supabaseUrl" if called server-side
  // where NEXT_PUBLIC_ vars may be undefined. All callers use useRef+useEffect
  // so this guard only fires if something unexpected calls us during SSR.
  if (typeof window === 'undefined') return null as any
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
