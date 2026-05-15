'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ExpositorSidebar from '@/components/ExpositorSidebar'
import ModuleEditor, { type ModuleData, type QuestionData } from '@/components/ModuleEditor'

function Sk({ w = '100%', h = 18, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.4s ease infinite' }} />
  )
}

export default function EditModulePage() {
  const router   = useRouter()
  const params   = useParams()
  const moduleId = params.id as string
  const supabase = createClient()

  const [loading,     setLoading]     = useState(true)
  const [notFound,    setNotFound]    = useState(false)
  const [userName,    setUserName]    = useState('…')
  const [userInitial, setUserInitial] = useState('E')
  const [moduleData,  setModuleData]  = useState<ModuleData | null>(null)
  const [questions,   setQuestions]   = useState<QuestionData[]>([])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('full_name, role').eq('id', user.id).maybeSingle()
      if (cancelled) return
      if (!profile || profile.role !== 'expositor') { router.replace('/login'); return }

      const fullName = profile.full_name ?? user.email ?? 'Expositor'
      setUserName(fullName)
      setUserInitial(fullName.charAt(0).toUpperCase())

      const { data: mod } = await supabase
        .from('modules')
        .select('id, title, description, video_url, level, duration_minutes, xp_reward, status, rejection_reason, thumbnail_url')
        .eq('id', moduleId)
        .eq('created_by', user.id)
        .maybeSingle()

      if (cancelled) return
      if (!mod) { setNotFound(true); setLoading(false); return }

      const { data: qs } = await supabase
        .from('questions')
        .select('id, module_id, type, question, options, correct_answer, order_index')
        .eq('module_id', moduleId)
        .order('order_index', { ascending: true })

      if (cancelled) return

      setModuleData({
        id:               mod.id,
        title:            mod.title ?? '',
        description:      mod.description ?? '',
        video_url:        mod.video_url ?? '',
        level:            mod.level ?? '',
        duration_minutes: mod.duration_minutes ?? 0,
        xp_reward:        mod.xp_reward ?? 100,
        status:           mod.status ?? 'draft',
        rejection_reason: mod.rejection_reason ?? null,
        thumbnail_url:    mod.thumbnail_url ?? null,
      })
      setQuestions((qs ?? []) as QuestionData[])
      setLoading(false)
    }

    boot()
    return () => { cancelled = true }
  }, [moduleId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
          <ExpositorSidebar activePage="modules" />
          <div style={{ flex: 1, padding: '40px 48px', overflow: 'auto' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <div style={{ marginBottom: 24 }}><Sk w={140} h={13} r={6} /></div>
              <Sk w="100%" h={280} r={16} />
              <div style={{ marginTop: 20 }}><Sk w="100%" h={200} r={16} /></div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (notFound) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <ExpositorSidebar activePage="modules" userName={userName} userInitial={userInitial} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 22, color: 'var(--ink)', marginBottom: 10 }}>
              Módulo no encontrado
            </div>
            <p style={{ fontSize: 14, color: 'var(--mute)', marginBottom: 20 }}>
              Este módulo no existe o no tienes acceso.
            </p>
            <button
              onClick={() => router.push('/expositor')}
              style={{ padding: '10px 22px', borderRadius: 999, background: '#C0392B', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 14 }}
            >
              Ver mis módulos
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <ExpositorSidebar activePage="modules" userName={userName} userInitial={userInitial} />
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {moduleData && (
          <ModuleEditor
            moduleId={moduleId}
            initialModule={moduleData}
            initialQuestions={questions}
            onSubmit={() => router.push('/expositor')}
          />
        )}
      </main>
    </div>
  )
}
