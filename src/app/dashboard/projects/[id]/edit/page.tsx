'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import DashboardSidebar from '@/components/DashboardSidebar'
import ProjectEditor, { type ProjectEditorData } from '@/components/ProjectEditor'

function Sk({ w = '100%', h = 18, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,#ece9e4 25%,#f5f3ef 50%,#ece9e4 75%)',
      backgroundSize: '400% 100%',
      animation: 'shimmer 1.4s ease infinite',
    }} />
  )
}

export default function EditProjectPage() {
  const router    = useRouter()
  const params    = useParams()
  const projectId = params.id as string
  const supabase  = createClient()

  const [loading,      setLoading]      = useState(true)
  const [userName,     setUserName]     = useState('…')
  const [userInitial,  setUserInitial]  = useState('L')
  const [userId,       setUserId]       = useState('')
  const [userFullName, setUserFullName] = useState('')
  const [schoolName,   setSchoolName]   = useState('')
  const [notFound,     setNotFound]     = useState(false)
  const [projectData,  setProjectData]  = useState<ProjectEditorData | null>(null)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) { if (!user) router.push('/login'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles').select('full_name, school_id, role').eq('id', user.id).maybeSingle()

      if (cancelled) return
      if (!profile || profile.role !== 'student') { router.push('/dashboard'); return }

      const fullName = profile.full_name ?? user.email ?? 'Leader'
      setUserFullName(fullName)
      setUserName(fullName)
      setUserInitial(fullName.charAt(0).toUpperCase())

      // Load project by URL id; if not found redirect to the real draft URL
      const { data: byId } = await supabase
        .from('projects').select('*').eq('id', projectId).eq('user_id', user.id).maybeSingle()

      if (cancelled) return

      if (!byId) {
        const { data: draft } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (cancelled) return
        if (draft) { router.replace(`/dashboard/projects/${draft.id}/edit`); return }
        setNotFound(true); setLoading(false); return
      }

      const project = byId

      // Fetch images and school in parallel
      const [{ data: images }, { data: schoolRow }] = await Promise.all([
        supabase.from('project_images').select('url').eq('project_id', project.id),
        profile.school_id
          ? supabase.from('schools').select('name').eq('id', profile.school_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (cancelled) return

      setSchoolName(schoolRow?.name ?? '')
      setProjectData({
        title:                       project.title ?? '',
        subtitle:                    project.subtitle ?? '',
        category:                    project.category ?? '',
        track:                       project.track ?? '',
        idemr_identificar:           project.idemr_identificar ?? '',
        idemr_diseniar:              project.idemr_diseniar ?? '',
        idemr_ejecutar:              project.idemr_ejecutar ?? '',
        idemr_medir:                 project.idemr_medir ?? '',
        idemr_reflexionar:           project.idemr_reflexionar ?? '',
        plan_continuidad:            project.plan_continuidad ?? '',
        big_leader_model_reflection: project.big_leader_model_reflection ?? '',
        evidence_urls:               images?.map((i: { url: string }) => i.url) ?? [],
        pdf_url:                     project.pdf_url ?? null,
        video_url:      project.video_url ?? null,
        status:         project.status ?? 'draft',
        completion_percentage: project.completion_percentage ?? 0,
      })

      setLoading(false)
    }

    boot()
    return () => { cancelled = true }
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
        <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
          <DashboardSidebar activePage="projects" />
          <div style={{ flex: 1, padding: '40px 48px', overflow: 'auto' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <div style={{ marginBottom: 24 }}><Sk w={160} h={14} r={6} /></div>
              <Sk w="100%" h={320} r={16} />
              <div style={{ marginTop: 20 }}><Sk w="100%" h={180} r={16} /></div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (notFound) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
        <DashboardSidebar activePage="projects" userName={userName} userInitial={userInitial} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 22, color: 'var(--ink)', marginBottom: 10 }}>
              Proyecto no encontrado
            </div>
            <p style={{ fontSize: 14, color: 'var(--mute)', marginBottom: 20 }}>
              Este proyecto no existe o no tienes acceso.
            </p>
            <button
              onClick={() => router.push('/dashboard/projects')}
              style={{ padding: '10px 22px', borderRadius: 999, background: '#C0392B', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 14 }}
            >
              Ver mis proyectos
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <DashboardSidebar activePage="projects" userName={userName} userInitial={userInitial} />
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {projectData && (
          <ProjectEditor
            projectId={projectId}
            userId={userId}
            userFullName={userFullName}
            schoolName={schoolName}
            initialData={projectData}
            onSubmit={() => router.push('/dashboard/projects')}
          />
        )}
      </main>
    </div>
  )
}
