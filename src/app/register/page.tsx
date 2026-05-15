'use client'

export const dynamic = 'force-dynamic'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Step     = 1 | 'level' | 2
type UserType = 'student' | 'coordinator' | 'expositor'
type Level    = 'junior' | 'senior'

interface ResolvedCode {
  schoolId:     string
  schoolName:   string
  userType:     UserType
  coordCodeId?: string
  expoCodeId?:  string
}

const GOOGLE_SVG = (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
)

const TRACKS: { id: Level; emoji: string; iconBg: string; title: string; sub: string; desc: string }[] = [
  {
    id: 'junior', emoji: '🌱', iconBg: '#FEF3C7',
    title: 'Junior Leader', sub: 'Primaria a 7° bachillerato · 9 a 13 años',
    desc: 'Da tus primeros pasos en el liderazgo',
  },
  {
    id: 'senior', emoji: '⚡', iconBg: 'rgba(192,57,43,0.1)',
    title: 'Senior Leader', sub: '8° bachillerato a 11° · 14 a 18 años',
    desc: 'Lidera proyectos que transforman comunidades',
  },
]

export default function RegisterPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [step,          setStep]          = useState<Step>(1)
  const [schoolCode,    setSchoolCode]    = useState('')
  const [resolved,      setResolved]      = useState<ResolvedCode | null>(null)
  const [codeError,     setCodeError]     = useState('')
  const [codeLoading,   setCodeLoading]   = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null)

  const [fullName,    setFullName]    = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [formError,   setFormError]   = useState('')
  const [formLoading, setFormLoading] = useState(false)

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setCodeError('')
    setCodeLoading(true)
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    const input = schoolCode.trim().toUpperCase()

    const { data: school } = await supabase
      .from('schools')
      .select('id, name')
      .eq('code', input)
      .maybeSingle()

    if (school) {
      setResolved({ schoolId: school.id, schoolName: school.name, userType: 'student' })
      setCodeLoading(false)
      setStep('level')
      return
    }

    const { data: coord } = await supabase
      .from('coordinator_codes')
      .select('id, school_id, schools(name)')
      .eq('code', input)
      .eq('used', false)
      .maybeSingle()

    if (coord) {
      setCodeLoading(false)
      const schoolName = (coord.schools as any)?.name ?? 'Colegio'
      setResolved({
        schoolId:    coord.school_id,
        schoolName,
        userType:    'coordinator',
        coordCodeId: coord.id,
      })
      setStep(2)
      return
    }

    const { data: expo } = await supabase
      .from('expositor_codes')
      .select('id')
      .eq('code', input)
      .eq('used', false)
      .maybeSingle()

    setCodeLoading(false)

    if (expo) {
      setResolved({
        schoolId:   '',
        schoolName: 'Big Family',
        userType:   'expositor',
        expoCodeId: expo.id,
      })
      setStep(2)
      return
    }

    setCodeError('Código inválido. Verifica con tu coordinador.')
  }

  function buildCallbackUrl(extra: Record<string, string>) {
    const base = `${window.location.origin}/auth/callback`
    const params = Object.entries(extra)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
    return `${base}?${params}`
  }

  async function handleGoogle() {
    setFormError('')
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    const { schoolId, userType, coordCodeId, expoCodeId } = resolved!
    const extra: Record<string, string> = { school_id: schoolId, role: userType }
    if (coordCodeId) extra.coord_code_id = coordCodeId
    if (expoCodeId)  extra.expo_code_id  = expoCodeId
    if (selectedLevel) extra.level = selectedLevel

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: buildCallbackUrl(extra) },
    })
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (password.length < 8) { setFormError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (password !== confirmPass) { setFormError('Las contraseñas no coinciden.'); return }
    setFormLoading(true)
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current

    const { schoolId, userType, coordCodeId, expoCodeId } = resolved!

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (error || !data.user) {
      setFormLoading(false)
      setFormError(error?.message ?? 'Error al crear la cuenta.')
      return
    }

    const uid = data.user.id

    await supabase.from('profiles').insert({
      id:           uid,
      full_name:    fullName,
      email,
      school_id:    schoolId || null,
      role:         userType,
      school_level: userType === 'student' ? (selectedLevel ?? 'senior') : null,
    })

    if (userType === 'coordinator' && coordCodeId) {
      await supabase
        .from('coordinator_codes')
        .update({ used: true, used_by: uid })
        .eq('id', coordCodeId)
    }

    if (userType === 'expositor' && expoCodeId) {
      await supabase
        .from('expositor_codes')
        .update({ used: true, used_by: uid })
        .eq('id', expoCodeId)
    }

    setFormLoading(false)
    router.push(
      userType === 'coordinator' ? '/coordinator' :
      userType === 'expositor'   ? '/expositor'   :
      '/dashboard'
    )
  }

  const isCoord = resolved?.userType === 'coordinator'
  const isExpo  = resolved?.userType === 'expositor'

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#F5F3EF;font-family:"Inter",system-ui,sans-serif;min-height:100vh;
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");}
        .page{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;}
        .logo-wrap{display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:32px;}
        .logo-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;letter-spacing:.06em;color:#0D0D0D;}
        .card{background:rgba(255,255,255,0.72);backdrop-filter:blur(20px) saturate(160%);border:1px solid rgba(255,255,255,0.9);border-radius:20px;box-shadow:0 30px 80px -20px rgba(13,13,13,0.14),0 8px 24px -8px rgba(13,13,13,0.08);padding:40px 36px;width:100%;max-width:440px;}
        .card-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:28px;letter-spacing:-0.02em;color:#0D0D0D;text-align:center;}
        .card-sub{font-size:15px;color:#6B6B6B;text-align:center;margin-top:6px;margin-bottom:28px;line-height:1.5;}
        .steps{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:28px;}
        .step-dot{width:28px;height:28px;border-radius:50%;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;transition:all .3s;}
        .step-dot.active{background:#0D0D0D;color:#fff;}
        .step-dot.done{background:#27500A;color:#fff;}
        .step-dot.idle{background:#e8e4df;color:#6B6B6B;}
        .step-line{width:32px;height:1px;background:#e8e4df;}
        .badge{display:flex;align-items:center;gap:10px;padding:11px 15px;border-radius:10px;margin-bottom:20px;font-size:13px;font-weight:600;}
        .badge.student{background:#EBF3FC;border:1px solid #B3D1F0;color:#1A4E7A;}
        .badge.coordinator{background:#FFF4E6;border:1px solid #FFD699;color:#7A4A00;}
        .badge.expositor{background:#EDE9FE;border:1px solid #C4B5FD;color:#4C1D95;}
        .field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}
        .field label{font-size:12.5px;font-weight:500;color:#2D2D2D;letter-spacing:.02em;}
        .field input{padding:12px 16px;border:1px solid #e0ddd8;border-radius:10px;font-size:14px;font-family:inherit;background:#fff;color:#0D0D0D;outline:none;transition:border-color .2s;}
        .field input:focus{border-color:#0D0D0D;}
        .field input::placeholder{color:#b0ada8;}
        .hint{font-size:11.5px;color:#9a9690;}
        .btn-main{width:100%;padding:13px;background:#0D0D0D;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;font-family:"Satoshi",sans-serif;cursor:pointer;transition:all .25s ease;margin-top:4px;}
        .btn-main:hover:not(:disabled){background:#C0392B;}
        .btn-main:disabled{opacity:0.6;cursor:not-allowed;}
        .btn-google{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px 16px;background:#fff;border:1px solid #e0ddd8;border-radius:10px;font-size:14px;font-weight:500;color:#0D0D0D;cursor:pointer;transition:all .2s ease;box-shadow:0 2px 6px rgba(13,13,13,0.06);}
        .btn-google:hover{border-color:#c5c2bc;box-shadow:0 4px 14px rgba(13,13,13,0.10);transform:translateY(-1px);}
        .divider{display:flex;align-items:center;gap:12px;margin:18px 0;color:#b0ada8;font-size:12px;letter-spacing:.08em;}
        .divider::before,.divider::after{content:"";flex:1;height:1px;background:#e8e4df;}
        .err{background:rgba(192,57,43,0.08);border:1px solid rgba(192,57,43,0.2);border-radius:8px;padding:10px 14px;font-size:13px;color:#C0392B;margin-bottom:14px;}
        .footer-links{margin-top:22px;text-align:center;font-size:13px;color:#6B6B6B;}
        .footer-links a{color:#0D0D0D;font-weight:500;text-decoration:none;}
        .footer-links a:hover{color:#C0392B;}
        .back-btn{background:none;border:none;color:#6B6B6B;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:4px;margin-bottom:20px;padding:0;}
        .back-btn:hover{color:#0D0D0D;}
        .level-card{width:100%;display:flex;align-items:center;gap:14px;padding:20px;border:1px solid rgba(13,13,13,0.08);border-radius:14px;background:#fff;cursor:pointer;text-align:left;position:relative;transition:border-color .15s,background .15s;}
        .level-card--selected{border-color:#C0392B !important;background:rgba(192,57,43,0.04);}
        .level-card:hover:not(.level-card--selected){border-color:rgba(13,13,13,0.2);}
        .level-icon{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
        .level-body{flex:1;min-width:0;}
        .level-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:17px;color:#0D0D0D;margin-bottom:2px;}
        .level-sub{font-size:13px;color:#6B6B6B;margin-bottom:2px;}
        .level-desc{font-size:12px;color:#aaa;}
        .level-check{position:absolute;top:12px;right:12px;color:#C0392B;}
        .btn-continue{width:100%;padding:13px;background:#C0392B;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;font-family:"Satoshi",sans-serif;transition:background .2s;margin-top:4px;}
        .btn-continue:not(:disabled){cursor:pointer;}
        .btn-continue:disabled{opacity:0.4;cursor:not-allowed;}
        .btn-continue:hover:not(:disabled){background:#a93226;}
      `}</style>

      <div className="page">
        <div className="logo-wrap">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="10" r="6" fill="#0D0D0D"/>
            <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
            <circle cx="9" cy="18" r="4" fill="#6B6B6B"/>
            <circle cx="43" cy="18" r="4" fill="#6B6B6B"/>
          </svg>
          <span className="logo-name">BIG FAMILY</span>
        </div>

        <div className="card">
          <div className="steps">
            <div className={`step-dot ${step === 1 ? 'active' : 'done'}`}>
              {step === 1 ? '1' : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <div className="step-line" />
            <div className={`step-dot ${step === 2 ? 'active' : 'idle'}`}>2</div>
          </div>

          {/* ── Step 1: Code verification ── */}
          {step === 1 && (
            <>
              <h1 className="card-title">Crear cuenta</h1>
              <p className="card-sub">Ingresa el código que te dio tu coordinador</p>

              {codeError && <div className="err">{codeError}</div>}

              <form onSubmit={verifyCode}>
                <div className="field">
                  <label htmlFor="code">Código de acceso</label>
                  <input
                    id="code" type="text" placeholder="BF-COL-2026"
                    value={schoolCode}
                    onChange={e => { setSchoolCode(e.target.value); setCodeError('') }}
                    required
                    style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                </div>
                <button className="btn-main" type="submit" disabled={codeLoading}>
                  {codeLoading ? 'Verificando…' : 'Verificar código'}
                </button>
              </form>

              <div className="footer-links" style={{ marginTop: 20 }}>
                ¿Ya tienes cuenta? <a href="/login">Inicia sesión</a>
              </div>
            </>
          )}

          {/* ── Step 1.5: Level selection (students only) ── */}
          {step === 'level' && resolved && (
            <>
              <button
                className="back-btn"
                onClick={() => { setStep(1); setResolved(null); setSchoolCode('') }}
                type="button"
              >
                ← Cambiar código
              </button>

              <h1 className="card-title">¿Cuál es tu track?</h1>
              <p className="card-sub">
                Selecciona tu rango escolar para acceder al contenido adecuado para ti
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {TRACKS.map(lv => (
                  <button
                    key={lv.id}
                    className={`level-card${selectedLevel === lv.id ? ' level-card--selected' : ''}`}
                    onClick={() => setSelectedLevel(lv.id)}
                    type="button"
                  >
                    <div className="level-icon" style={{ background: lv.iconBg }}>
                      {lv.emoji}
                    </div>
                    <div className="level-body">
                      <div className="level-title">{lv.title}</div>
                      <div className="level-sub">{lv.sub}</div>
                      <div className="level-desc">{lv.desc}</div>
                    </div>
                    {selectedLevel === lv.id && (
                      <div className="level-check">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                className="btn-continue"
                disabled={!selectedLevel}
                onClick={() => { if (selectedLevel) setStep(2) }}
                type="button"
              >
                Continuar
              </button>
            </>
          )}

          {/* ── Step 2: Account creation ── */}
          {step === 2 && resolved && (
            <>
              <button
                className="back-btn"
                onClick={() => {
                  if (resolved.userType === 'student') {
                    setStep('level')
                  } else {
                    setStep(1)
                    setResolved(null)
                    setSchoolCode('')
                  }
                }}
                type="button"
              >
                ← {resolved.userType === 'student' ? 'Cambiar nivel' : 'Cambiar código'}
              </button>

              <h1 className="card-title">Crear cuenta</h1>
              <p className="card-sub" style={{ marginBottom: 20 }}>Completa tu registro</p>

              <div className={`badge ${isCoord ? 'coordinator' : isExpo ? 'expositor' : 'student'}`}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="currentColor" opacity=".18"/>
                  <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isCoord ? 'Coordinador' : isExpo ? 'Expositor' : 'Estudiante'} · {resolved.schoolName}
              </div>

              <button className="btn-google" onClick={handleGoogle} type="button">
                {GOOGLE_SVG}
                Registrarse con Google
              </button>

              <div className="divider">o</div>

              {formError && <div className="err">{formError}</div>}

              <form onSubmit={handleEmail}>
                <div className="field">
                  <label htmlFor="name">Nombre completo</label>
                  <input
                    id="name" type="text" placeholder="Juan García"
                    value={fullName} onChange={e => setFullName(e.target.value)} required
                  />
                </div>
                <div className="field">
                  <label htmlFor="email">Correo electrónico</label>
                  <input
                    id="email" type="email" placeholder="tu@correo.com"
                    value={email} onChange={e => setEmail(e.target.value)} required
                  />
                </div>
                <div className="field">
                  <label htmlFor="password">Contraseña</label>
                  <input
                    id="password" type="password" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required
                  />
                  <span className="hint">Mínimo 8 caracteres</span>
                </div>
                <div className="field">
                  <label htmlFor="confirm">Confirmar contraseña</label>
                  <input
                    id="confirm" type="password" placeholder="••••••••"
                    value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required
                  />
                </div>
                <button className="btn-main" type="submit" disabled={formLoading}>
                  {formLoading ? 'Creando cuenta…' : 'Crear cuenta'}
                </button>
              </form>

              <div className="footer-links">
                ¿Ya tienes cuenta? <a href="/login">Inicia sesión</a>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
