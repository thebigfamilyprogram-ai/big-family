'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ProjectEditor, { type ProjectEditorData } from '@/components/ProjectEditor'

function Progress({ step }: { step: 1 | 2 | 3 }) {
  const labels = ['Registro', 'Proyecto', 'Enviado']
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0 }}>
      {labels.map((label, i) => {
        const n = i + 1
        const done   = n < step
        const active = n === step
        return (
          <div key={label} style={{ display:'flex', alignItems:'center' }}>
            {i > 0 && <div style={{ width:32, height:1, background: done ? '#C0392B' : '#E0DDD8' }} />}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background: done ? '#C0392B' : active ? '#0D0D0D' : '#E8E4DF', color: done||active ? '#fff' : '#9a9690', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>
                {done ? '✓' : n}
              </div>
              <span style={{ fontSize:10, fontWeight: active ? 700 : 400, color: active ? '#fff' : 'rgba(255,255,255,.5)', whiteSpace:'nowrap' }}>{label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#F5F3EF', gap:14, fontFamily:'Inter,sans-serif', color:'#6B6B6B' }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 1s linear infinite' }}>
        <circle cx="12" cy="12" r="10" stroke="rgba(13,13,13,.12)" strokeWidth="3"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="#C0392B" strokeWidth="3" strokeLinecap="round"/>
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ fontSize:14 }}>Preparando tu proyecto…</span>
    </div>
  )
}

export default function SubmitProjectPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading,       setLoading]       = useState(true)
  const [userId,        setUserId]        = useState('')
  const [userFullName,  setUserFullName]  = useState('')
  const [schoolName,    setSchoolName]    = useState('')
  const [projectId,     setProjectId]     = useState('')
  const [projectData,   setProjectData]   = useState<ProjectEditorData | null>(null)
  const [submitting,    setSubmitting]    = useState(false)
  const [isSubmitted,   setIsSubmitted]   = useState(false)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) { router.replace('/submit/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, school_id, school_level, role')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      // TEMP LAUNCH: allow both 'student' and null role (newly created accounts may lag)
      if (profile && profile.role && profile.role !== 'student') {
        router.replace('/dashboard'); return
      }

      const fullName = profile?.full_name ?? user.email ?? 'Estudiante'
      setUserId(user.id)
      setUserFullName(fullName)

      const [{ data: schoolRow }, { data: existingProject }] = await Promise.all([
        profile?.school_id
          ? supabase.from('schools').select('name').eq('id', profile.school_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
      if (cancelled) return

      setSchoolName((schoolRow as any)?.name ?? '')

      let project = existingProject

      if (!project) {
        const { data: created } = await supabase
          .from('projects')
          .insert({
            user_id:   user.id,
            school_id: profile?.school_id ?? null,
            status:    'draft',
            title:     'Sin título',
            track:     profile?.school_level ?? 'senior',
          })
          .select('*')
          .maybeSingle()
        if (cancelled) return
        project = created
      }

      if (!project) { router.replace('/submit/login'); return }

      setIsSubmitted(project.status === 'pending' || project.status === 'approved')

      const { data: images } = await supabase
        .from('project_images')
        .select('url')
        .eq('project_id', project.id)
      if (cancelled) return

      setProjectId(project.id)
      setProjectData({
        title:                       project.title ?? '',
        subtitle:                    project.subtitle ?? '',
        category:                    project.category ?? '',
        track:                       project.track ?? profile?.school_level ?? 'senior',
        idemr_identificar:           project.idemr_identificar ?? '',
        idemr_diseniar:              project.idemr_diseniar ?? '',
        idemr_ejecutar:              project.idemr_ejecutar ?? '',
        idemr_medir:                 project.idemr_medir ?? '',
        idemr_reflexionar:           project.idemr_reflexionar ?? '',
        plan_continuidad:            project.plan_continuidad ?? '',
        big_leader_model_reflection: project.big_leader_model_reflection ?? '',
        evidence_urls:               images?.map((i: { url: string }) => i.url) ?? [],
        pdf_url:                     project.pdf_url ?? null,
        video_url:                   project.video_url ?? null,
        status:                      project.status ?? 'draft',
        completion_percentage:       project.completion_percentage ?? 0,
      })
      setLoading(false)
    }

    boot()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/submit')
  }

  // TEMP LAUNCH: External submit button saves status directly; relies on
  // ProjectEditor autosave having fired for latest content changes.
  async function handleExternalSubmit() {
    if (!projectId || submitting || isSubmitted) return
    setSubmitting(true)
    const { error } = await supabase.from('projects').update({
      status:       'pending',
      submitted_at: new Date().toISOString(),
    }).eq('id', projectId)
    if (error) {
      setSubmitting(false)
      alert('Error al enviar. Por favor intenta de nuevo.')
      return
    }
    // Hard navigate to prevent ProjectEditor's internal timer from redirecting
    window.location.href = '/submit/confirmation'
  }

  if (loading) return <Spinner />

  const canSubmit = !isSubmitted && !!projectData?.title?.trim()

  const SubmitButton = (
    <button
      onClick={handleExternalSubmit}
      disabled={submitting || !canSubmit}
      style={{
        padding: '0 28px', height: 52, background: canSubmit ? '#C0392B' : '#9a9690',
        color: '#fff', border: 'none', borderRadius: 12,
        fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 15,
        cursor: canSubmit ? 'pointer' : 'not-allowed',
        opacity: submitting ? 0.6 : 1,
        transition: 'background .2s', whiteSpace: 'nowrap', flexShrink: 0,
      }}
    >
      {submitting ? 'Enviando…' : isSubmitted ? 'Proyecto enviado ✓' : 'Enviar al coordinador →'}
    </button>
  )

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#F5F3EF;font-family:"Inter",system-ui,sans-serif;}
        .sp-header{background:#0D0D0D;padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;gap:16px;position:sticky;top:0;z-index:40;}
        .sp-brand{display:flex;align-items:center;gap:8px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;color:#fff;flex-shrink:0;}
        .sp-user{font-size:13px;color:rgba(255,255,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .sp-logout{background:none;border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:6px 14px;font-size:12.5px;color:rgba(255,255,255,.7);cursor:pointer;transition:all .2s;white-space:nowrap;flex-shrink:0;font-family:inherit;}
        .sp-logout:hover{border-color:rgba(255,255,255,.5);color:#fff;}
        .sp-bar{background:rgba(255,255,255,.07);padding:12px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
        .sp-status-badge{padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;}
        .sp-content{max-width:1480px;margin:0 auto;}
        .sp-bottom-bar{background:#0D0D0D;padding:20px 24px;display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;}
        .sp-bottom-hint{font-size:13px;color:rgba(255,255,255,.5);}
        @media(max-width:600px){.sp-user{display:none;}.sp-bar{flex-direction:column;align-items:flex-start;}}
      `}</style>

      {/* Top bar */}
      <header className="sp-header">
        <div className="sp-brand">
          <svg width="22" height="22" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="10" r="6" fill="#fff"/>
            <path d="M26 16 L44 48 H8 Z" fill="#fff"/>
            <circle cx="9" cy="18" r="4" fill="rgba(255,255,255,.5)"/>
            <circle cx="43" cy="18" r="4" fill="rgba(255,255,255,.5)"/>
          </svg>
          Big Family
        </div>
        <div className="sp-user">{userFullName}</div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Progress step={2} />
          <button className="sp-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </header>

      {/* Action bar — top */}
      <div className="sp-bar">
        <div>
          <div style={{ fontFamily:'Satoshi,sans-serif', fontWeight:700, fontSize:15, color:'#0D0D0D' }}>
            Tu proyecto de liderazgo
          </div>
          {schoolName && (
            <div style={{ fontSize:12.5, color:'#6B6B6B', marginTop:2 }}>{schoolName}</div>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          {isSubmitted && (
            <span className="sp-status-badge" style={{ background:'#FFFBEB', color:'#92400E' }}>
              En revisión — {projectData?.title || 'Sin título'}
            </span>
          )}
          {SubmitButton}
        </div>
      </div>

      {/* Project editor */}
      <div className="sp-content">
        {projectData && (
          <ProjectEditor
            projectId={projectId}
            userId={userId}
            userFullName={userFullName}
            schoolName={schoolName}
            initialData={projectData}
            onSubmit={() => { window.location.href = '/submit/confirmation' }}
          />
        )}
      </div>

      {/* Action bar — bottom */}
      <div className="sp-bottom-bar">
        <span className="sp-bottom-hint">
          {isSubmitted
            ? 'Tu proyecto ya fue enviado. El coordinador lo revisará pronto.'
            : 'Tu progreso se guarda automáticamente cada vez que escribes.'}
        </span>
        {SubmitButton}
      </div>
    </>
  )
}
