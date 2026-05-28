'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'
import DatosPage from '@/components/datos/DatosPage'

export default function CoordinatorDatosPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [ready,       setReady]       = useState(false)
  const [userName,    setUserName]    = useState('')
  const [userInitial, setUserInitial] = useState('C')
  const [schoolName,  setSchoolName]  = useState('')

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    async function load() {
      if (MOCK_MODE) {
        const c = MOCK.currentCoordinator
        setUserName(c.name)
        setUserInitial(c.name[0])
        setSchoolName(c.school_name)
        setReady(true)
        return
      }
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await sb
        .from('profiles')
        .select('display_name, role, school_id')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile || profile.role !== 'coordinator') {
        router.replace('/dashboard')
        return
      }

      const { data: school } = profile.school_id
        ? await sb.from('schools').select('name').eq('id', profile.school_id).maybeSingle()
        : { data: null }

      const name = profile.display_name ?? 'Coordinador'
      setUserName(name)
      setUserInitial(name.charAt(0).toUpperCase())
      setSchoolName((school as { name: string } | null)?.name ?? '')
      setReady(true)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null

  return (
    <DatosPage
      role="coordinator"
      userName={userName}
      userInitial={userInitial}
      schoolName={schoolName}
    />
  )
}
