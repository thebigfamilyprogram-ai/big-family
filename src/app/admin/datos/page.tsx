'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import DatosPage from '@/components/datos/DatosPage'

export default function AdminDatosPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [ready,       setReady]       = useState(false)
  const [userName,    setUserName]    = useState('')
  const [userInitial, setUserInitial] = useState('A')

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    async function load() {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await sb
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile || profile.role !== 'admin') {
        router.replace('/dashboard')
        return
      }

      const name = profile.full_name ?? 'Admin'
      setUserName(name)
      setUserInitial(name.charAt(0).toUpperCase())
      setReady(true)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null

  return (
    <DatosPage
      role="admin"
      userName={userName}
      userInitial={userInitial}
    />
  )
}
