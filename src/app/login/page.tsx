'use client'

export const dynamic = 'force-dynamic'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router      = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleGoogle() {
    setError('')
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setLoading(false); setError(error.message); return }

    console.log('[login] auth OK — user:', data.user?.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user!.id)
      .maybeSingle()

    console.log('[login] role from DB:', profile?.role)
    setLoading(false)
    router.push(
      profile?.role === 'coordinator' ? '/coordinator' :
      profile?.role === 'expositor'   ? '/expositor'   :
      '/dashboard'
    )
  }

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#F5F3EF;font-family:"Inter",system-ui,sans-serif;min-height:100vh;
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");}
        .page{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;}
        .logo-wrap{display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:32px;}
        .logo-mark{width:52px;height:52px;}
        .logo-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;letter-spacing:.06em;color:#0D0D0D;}
        .card{background:rgba(255,255,255,0.72);backdrop-filter:blur(20px) saturate(160%);border:1px solid rgba(255,255,255,0.9);border-radius:20px;box-shadow:0 30px 80px -20px rgba(13,13,13,0.14),0 8px 24px -8px rgba(13,13,13,0.08);padding:40px 36px;width:100%;max-width:420px;}
        .card-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:24px;letter-spacing:-0.02em;color:#0D0D0D;text-align:center;}
        .card-sub{font-size:14px;color:#6B6B6B;text-align:center;margin-top:6px;margin-bottom:28px;}
        .btn-google{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px 16px;background:#fff;border:1px solid #e0ddd8;border-radius:10px;font-size:14px;font-weight:500;color:#0D0D0D;cursor:pointer;transition:all .2s ease;box-shadow:0 2px 6px rgba(13,13,13,0.06);}
        .btn-google:hover{border-color:#c5c2bc;box-shadow:0 4px 14px rgba(13,13,13,0.10);transform:translateY(-1px);}
        .divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:#b0ada8;font-size:12px;letter-spacing:.08em;}
        .divider::before,.divider::after{content:"";flex:1;height:1px;background:#e8e4df;}
        .field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}
        .field label{font-size:12.5px;font-weight:500;color:#2D2D2D;letter-spacing:.02em;}
        .field input{padding:12px 16px;border:1px solid #e0ddd8;border-radius:10px;font-size:14px;font-family:inherit;background:#fff;color:#0D0D0D;outline:none;transition:border-color .2s;}
        .field input:focus{border-color:#0D0D0D;}
        .field input::placeholder{color:#b0ada8;}
        .btn-main{width:100%;padding:13px;background:#0D0D0D;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;font-family:"Satoshi",sans-serif;cursor:pointer;transition:all .25s ease;margin-top:4px;}
        .btn-main:hover:not(:disabled){background:#C0392B;}
        .btn-main:disabled{opacity:0.6;cursor:not-allowed;}
        .err{background:rgba(192,57,43,0.08);border:1px solid rgba(192,57,43,0.2);border-radius:8px;padding:10px 14px;font-size:13px;color:#C0392B;margin-bottom:14px;}
        .footer-links{margin-top:24px;text-align:center;font-size:13px;color:#6B6B6B;display:flex;flex-direction:column;gap:8px;}
        .footer-links a{color:#0D0D0D;font-weight:500;text-decoration:none;}
        .footer-links a:hover{color:#C0392B;}
      `}</style>

      <div className="page">
        <div className="logo-wrap">
          <svg className="logo-mark" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="26" cy="10" r="6" fill="#0D0D0D"/>
            <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
            <circle cx="9" cy="18" r="4" fill="#6B6B6B"/>
            <circle cx="43" cy="18" r="4" fill="#6B6B6B"/>
          </svg>
          <span className="logo-name">BIG FAMILY</span>
        </div>

        <div className="card">
          <h1 className="card-title">Bienvenido de vuelta</h1>
          <p className="card-sub">Ingresa a tu cuenta</p>

          <button className="btn-google" onClick={handleGoogle} type="button">
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          <div className="divider">o</div>

          {error && <div className="err">{error}</div>}

          <form onSubmit={handleEmail}>
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
            </div>
            <button className="btn-main" type="submit" disabled={loading}>
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <div className="footer-links">
            <span>¿Olvidaste tu contraseña? <a href="#">Recupérala</a></span>
            <span>¿No tienes cuenta? <a href="/register">Regístrate</a></span>
          </div>
        </div>
      </div>
    </>
  )
}
