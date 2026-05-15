'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'

function Progress({ step }: { step: 1 | 2 | 3 }) {
  const labels = ['Registro', 'Proyecto', 'Enviado']
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, marginBottom:40 }}>
      {labels.map((label, i) => {
        const n = i + 1
        const done   = n < step
        const active = n === step
        return (
          <div key={label} style={{ display:'flex', alignItems:'center' }}>
            {i > 0 && <div style={{ width:36, height:1, background: done||active ? '#C0392B' : '#E0DDD8' }} />}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background: done||active ? '#C0392B' : '#E8E4DF', color: done||active ? '#fff' : '#9a9690', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>
                {done||active ? '✓' : n}
              </div>
              <span style={{ fontSize:10.5, fontWeight: active ? 700 : 400, color: active ? '#C0392B' : '#9a9690', whiteSpace:'nowrap' }}>{label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface Summary {
  fullName:    string
  schoolName:  string
  projectTitle: string
  projectId:   string
}

export default function SubmitConfirmationPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) { router.replace('/submit/login'); return }

      const [{ data: profile }, { data: project }] = await Promise.all([
        supabase.from('profiles').select('full_name, school_id').eq('id', user.id).maybeSingle(),
        supabase
          .from('projects')
          .select('id, title, status')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
      if (cancelled) return

      const { data: school } = profile?.school_id
        ? await supabase.from('schools').select('name').eq('id', profile.school_id).maybeSingle()
        : { data: null }
      if (cancelled) return

      setSummary({
        fullName:     profile?.full_name ?? user.email ?? 'Estudiante',
        schoolName:   (school as any)?.name ?? '',
        projectTitle: project?.title ?? 'Tu proyecto',
        projectId:    project?.id ?? '',
      })
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#F5F3EF;font-family:"Inter",system-ui,sans-serif;min-height:100vh;}
        .sc-page{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;text-align:center;}
        .sc-logo{display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:36px;}
        .sc-logo-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;color:#0D0D0D;}
        .sc-check{width:72px;height:72px;border-radius:50%;background:#C0392B;display:flex;align-items:center;justify-content:center;margin:0 auto 28px;}
        .sc-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:clamp(26px,5vw,40px);letter-spacing:-.025em;color:#0D0D0D;margin-bottom:12px;}
        .sc-sub{font-size:16px;color:#6B6B6B;line-height:1.6;max-width:400px;margin:0 auto 32px;}
        .sc-info{background:#fff;border:1px solid rgba(13,13,13,.08);border-radius:16px;padding:24px 28px;max-width:400px;width:100%;margin:0 auto 32px;text-align:left;}
        .sc-info-row{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid rgba(13,13,13,.06);}
        .sc-info-row:last-child{border-bottom:none;}
        .sc-info-label{font-size:11.5px;font-weight:600;color:#9a9690;letter-spacing:.06em;text-transform:uppercase;min-width:80px;padding-top:1px;}
        .sc-info-value{font-size:14px;font-weight:500;color:#0D0D0D;line-height:1.4;}
        .sc-btn-primary{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 32px;background:#C0392B;color:#fff;border-radius:12px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;text-decoration:none;transition:background .2s;cursor:pointer;border:none;}
        .sc-btn-primary:hover{background:#a93226;}
        .sc-btn-ghost{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 28px;background:#fff;color:#0D0D0D;border:1.5px solid rgba(13,13,13,.12);border-radius:12px;font-family:"Satoshi",sans-serif;font-weight:600;font-size:14px;text-decoration:none;transition:border-color .2s;cursor:pointer;}
        .sc-btn-ghost:hover{border-color:#0D0D0D;}
      `}</style>

      <div className="sc-page">
        <div className="sc-logo">
          <svg width="32" height="32" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="10" r="6" fill="#0D0D0D"/>
            <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
            <circle cx="9" cy="18" r="4" fill="#6B6B6B"/>
            <circle cx="43" cy="18" r="4" fill="#6B6B6B"/>
          </svg>
          <span className="sc-logo-name">Big Family</span>
        </div>

        <Progress step={3} />

        {/* Animated checkmark */}
        <motion.div
          className="sc-check"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
        >
          <motion.svg
            width="32" height="32" viewBox="0 0 32 32" fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
          >
            <motion.path
              d="M6 16l7 7 13-13"
              stroke="#fff"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
            />
          </motion.svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
        >
          <h1 className="sc-title">¡Proyecto enviado exitosamente!</h1>
          <p className="sc-sub">Tu coordinador revisará tu proyecto pronto y te dará retroalimentación.</p>
        </motion.div>

        {loading ? null : summary && (
          <motion.div
            style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.65 }}
          >
            <div className="sc-info">
              <div className="sc-info-row">
                <span className="sc-info-label">Proyecto</span>
                <span className="sc-info-value">{summary.projectTitle || 'Sin título'}</span>
              </div>
              <div className="sc-info-row">
                <span className="sc-info-label">Estudiante</span>
                <span className="sc-info-value">{summary.fullName}</span>
              </div>
              {summary.schoolName && (
                <div className="sc-info-row">
                  <span className="sc-info-label">Colegio</span>
                  <span className="sc-info-value">{summary.schoolName}</span>
                </div>
              )}
              <div className="sc-info-row">
                <span className="sc-info-label">Estado</span>
                <span className="sc-info-value" style={{ color:'#92400E', fontWeight:700 }}>En revisión</span>
              </div>
            </div>

            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              <a href="/submit/project" className="sc-btn-primary">Ver mi proyecto →</a>
              <button className="sc-btn-ghost" onClick={() => supabase.auth.signOut().then(() => router.replace('/submit'))}>
                Cerrar sesión
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </>
  )
}
