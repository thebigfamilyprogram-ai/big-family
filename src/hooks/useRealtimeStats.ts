'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

export interface RealtimeStats {
  totalStudents: number
  totalSchools:  number
  totalBadges:   number
}

export function useRealtimeStats() {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [stats, setStats] = useState<RealtimeStats>({
    totalStudents: 0,
    totalSchools:  0,
    totalBadges:   0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current

    async function fetchStats() {
      const [students, schools, badges] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('schools').select('id', { count: 'exact', head: true }),
        supabase.from('user_badges').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        totalStudents: students.count ?? 0,
        totalSchools:  schools.count  ?? 0,
        totalBadges:   badges.count   ?? 0,
      })
      setLoading(false)
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return { stats, loading }
}
