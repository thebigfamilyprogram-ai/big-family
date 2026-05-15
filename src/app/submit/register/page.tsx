'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Step  = 'code' | 'info'
type Track = 'junior' | 'senior'

function Logo() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, marginBottom:28 }}>
      <svg width="34" height="34" viewBox="0 0 52 52" fill="none">
        <circle cx="26" cy="10" r="6" fill="#0D0D0D"/>
        <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
        <circle cx="9" cy="18" r="4" fill="#6B6B6B"/>
        <circle cx="43" cy="18" r="4" fill="#6B6B6B"/>
      </svg>
      <span style={{ fontFamily:'Satoshi,sans-serif', fontWeight:700, fontSize:15, color:'#0D0D0D' }}>Big Family</span>
    </div>
  )
}

function Progress({ step }: { step: 1 | 2 | 3 }) {
  const labels = ['Registro', 'Proyecto', 'Enviado']
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', marginBottom:28 }}>
      {labels.map((label, i) => {
        const n = i + 1
        const done   = n < step
        const active = n === step
        return (
          <div key={label} style={{ display:'flex', alignItems:'center' }}>
            {i > 0 && <div style={{ width:36, height:1, background: done ? '#C0392B' : '#E0DDD8' }} />}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background: done ? '#C0392B' : active ? '#0D0D0D' : '#E8E4DF', color: done||active ? '#fff' : '#9a9690', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>
                {done ? '✓' : n}
              </div>
              <span style={{ fontSize:10.5, fontWeight: active ? 700 : 400, color: active ? '#0D0D0D' : '#9a9690', whiteSpace:'nowrap' }}>{label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function SubmitRegisterPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [step,         setStep]         = useState<Step>('code')
  const [schoolCode,   setSchoolCode]   = useState('')
  const [schoolId,     setSchoolId]     = useState('')
  const [schoolName,   setSchoolName]   = useState('')
  const [codeError,    setCodeError]    = useState('')
  const [codeLoading,  setCodeLoading]  = useState(false)

  const [fullName,     setFullName]     = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [track,        setTrack]        = useState<Track | null>(null)
  const [formError,    setFormError]    = useState('')
  const [formLoading,  setFormLoading]  = useState(false)

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCodeError('')
    setCodeLoading(true)
    const code = schoolCode.trim().toUpperCase()

    const { data: school } = await supabase
      .from('schools')
      .select('id, name')
      .eq('code', code)
      .maybeSingle()

    setCodeLoading(false)

    if (!school) {
      setCodeError('Código no encontrado. Verifica con tu coordinador.')
      return
    }
    setSchoolId(school.id)
    setSchoolName(school.name)
    setStep('info')
  }

  async function handleInfoSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!track) { setFormError('Selecciona tu track (Junior o Senior).'); return }
    if (password.length < 8) { setFormError('La contraseña debe tener al menos 8 caracteres.'); return }
    setFormLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (signUpError || !data.user) {
      setFormLoading(false)
      setFormError(signUpError?.message ?? 'Error al crear la cuenta.')
      return
    }

    const uid = data.user.id

    await supabase.from('profiles').insert({
      id:           uid,
      full_name:    fullName,
      email,
      school_id:    schoolId,
      role:         'student',
      school_level: track,
    })

    // TEMP LAUNCH: no email confirmation required; redirecting directly to project editor
    router.replace('/submit/project')
  }

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,900,500,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#F5F3EF;font-family:"Inter",system-ui,sans-serif;min-height:100vh;}
        .sr-page{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 20px;}
        .sr-card{background:#fff;border:1px solid rgba(13,13,13,.09);border-radius:20px;box-shadow:0 8px 40px -12px rgba(13,13,13,.12);padding:36px 32px;width:100%;max-width:420px;}
        .sr-heading{font-family:"Satoshi",sans-serif;font-weight:900;font-size:22px;color:#0D0D0D;margin-bottom:6px;}
        .sr-sub{font-size:14px;color:#6B6B6B;margin-bottom:24px;line-height:1.5;}
        .sr-school-badge{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#EBF3FC;border:1px solid #B3D1F0;border-radius:10px;margin-bottom:20px;font-size:13.5px;font-weight:600;color:#1A4E7A;}
        .sr-field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
        .sr-label{font-size:12.5px;font-weight:600;color:#2D2D2D;}
        .sr-input{padding:14px 16px;border:1.5px solid #E0DDD8;border-radius:10px;font-size:15px;font-family:inherit;background:#fff;color:#0D0D0D;outline:none;transition:border-color .2s;width:100%;}
        .sr-input:focus{border-color:#0D0D0D;}
        .sr-input::placeholder{color:#b0ada8;}
        .sr-error{font-size:13px;color:#C0392B;background:#FFF5F5;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;margin-bottom:16px;}
        .sr-btn{width:100%;min-height:52px;background:#C0392B;color:#fff;border:none;border-radius:12px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;cursor:pointer;transition:background .2s;margin-top:4px;}
        .sr-btn:hover:not(:disabled){background:#a93226;}
        .sr-btn:disabled{opacity:.5;cursor:not-allowed;}
        .sr-link{text-align:center;font-size:13px;color:#6B6B6B;margin-top:20px;}
        .sr-link a{color:#C0392B;text-decoration:none;font-weight:600;}
        .sr-tracks{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px;}
        .sr-track{padding:14px 12px;border:2px solid #E0DDD8;border-radius:12px;cursor:pointer;transition:all .18s;text-align:center;background:#fff;}
        .sr-track:hover{border-color:#C0392B;}
        .sr-track.selected{border-color:#C0392B;background:rgba(192,57,43,.05);}
        .sr-track-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;color:#0D0D0D;margin-bottom:3px;}
        .sr-track-sub{font-size:11.5px;color:#6B6B6B;line-height:1.4;}
        .sr-back{background:none;border:none;cursor:pointer;color:#6B6B6B;font-size:13px;font-family:inherit;padding:0;margin-bottom:20px;display:flex;align-items:center;gap:5px;transition:color .15s;}
        .sr-back:hover{color:#0D0D0D;}
      `}</style>

      <div className="sr-page">
        <Logo />
        <div className="sr-card">
          <Progress step={1} />

          {step === 'code' ? (
            <>
              <div className="sr-heading">Regístrate</div>
              <div className="sr-sub">Ingresa el código de tu colegio para comenzar</div>

              <form onSubmit={handleCodeSubmit}>
                <div className="sr-field">
                  <label className="sr-label">Código del colegio</label>
                  <input
                    className="sr-input"
                    value={schoolCode}
                    onChange={e => setSchoolCode(e.target.value)}
                    placeholder="Ej: BF-2026"
                    maxLength={20}
                    autoFocus
                    required
                  />
                </div>
                {codeError && <div className="sr-error">{codeError}</div>}
                <button className="sr-btn" type="submit" disabled={codeLoading || !schoolCode.trim()}>
                  {codeLoading ? 'Verificando…' : 'Verificar código'}
                </button>
              </form>
            </>
          ) : (
            <>
              <button className="sr-back" onClick={() => setStep('code')}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 12L4 7l5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Cambiar colegio
              </button>

              <div className="sr-school-badge">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1l7 4v2H1V5l7-4Z" fill="#1A4E7A"/><rect x="2" y="7" width="12" height="7" rx="1" stroke="#1A4E7A" strokeWidth="1.3"/></svg>
                {schoolName}
              </div>

              <div className="sr-heading">Completa tu perfil</div>
              <div className="sr-sub">Un paso más para subir tu proyecto</div>

              <form onSubmit={handleInfoSubmit}>
                <div className="sr-field">
                  <label className="sr-label">Nombre completo</label>
                  <input className="sr-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Tu nombre y apellido" required autoFocus />
                </div>
                <div className="sr-field">
                  <label className="sr-label">Email</label>
                  <input className="sr-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
                </div>
                <div className="sr-field">
                  <label className="sr-label">Contraseña</label>
                  <input className="sr-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" minLength={8} required />
                </div>
                <div className="sr-field">
                  <label className="sr-label">Tu track</label>
                  <div className="sr-tracks">
                    <div className={`sr-track${track === 'junior' ? ' selected' : ''}`} onClick={() => setTrack('junior')}>
                      <div className="sr-track-name">🌱 Junior</div>
                      <div className="sr-track-sub">9 a 13 años</div>
                    </div>
                    <div className={`sr-track${track === 'senior' ? ' selected' : ''}`} onClick={() => setTrack('senior')}>
                      <div className="sr-track-name">⚡ Senior</div>
                      <div className="sr-track-sub">14 a 18 años</div>
                    </div>
                  </div>
                </div>
                {formError && <div className="sr-error">{formError}</div>}
                <button className="sr-btn" type="submit" disabled={formLoading || !fullName || !email || !password || !track}>
                  {formLoading ? 'Creando cuenta…' : 'Crear cuenta y continuar →'}
                </button>
              </form>
            </>
          )}

          <div className="sr-link">
            ¿Ya tienes cuenta? <a href="/submit/login">Ingresar</a>
          </div>
        </div>
      </div>
    </>
  )
}
