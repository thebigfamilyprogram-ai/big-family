'use client'

export const dynamic = 'force-dynamic'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

const expoOut = [0.22, 1, 0.36, 1] as const

export default function ForgotPasswordPage() {
  const pref        = useReducedMotion()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://big-family-nu.vercel.app/auth/callback',
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  return (
    <>
      <style>{`
                *{box-sizing:border-box;margin:0;padding:0;}
        body{background:var(--bg);font-family:"Inter",system-ui,sans-serif;min-height:100vh;
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");}
        .page{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;}
        .logo-wrap{display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:32px;}
        .logo-mark{width:52px;height:52px;}
        .logo-name{font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;letter-spacing:.06em;color:#0D0D0D;}
        .card{background:rgba(255,255,255,0.72);backdrop-filter:blur(20px) saturate(160%);border:1px solid rgba(255,255,255,0.9);border-radius:20px;box-shadow:0 30px 80px -20px rgba(13,13,13,0.14),0 8px 24px -8px rgba(13,13,13,0.08);padding:40px 36px;width:100%;max-width:420px;}
        .card-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:24px;letter-spacing:-0.02em;color:#0D0D0D;text-align:center;}
        .card-sub{font-size:14px;color:#6B6B6B;text-align:center;margin-top:6px;margin-bottom:28px;line-height:1.5;}
        .field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}
        .field label{font-size:12.5px;font-weight:500;color:#2D2D2D;letter-spacing:.02em;}
        .field input{padding:12px 16px;border:1px solid #e0ddd8;border-radius:10px;font-size:14px;font-family:inherit;background:#fff;color:#0D0D0D;outline:none;transition:border-color .2s,box-shadow .2s;}
        .field input:focus{border-color:#0D0D0D;box-shadow:0 0 0 3px rgba(192,57,43,.12);}
        .field input::placeholder{color:#b0ada8;}
        .btn-main{width:100%;padding:13px;background:#0D0D0D;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;font-family:"Satoshi",sans-serif;cursor:pointer;transition:background .25s ease;margin-top:4px;overflow:hidden;}
        .btn-main:hover:not(:disabled){background:#C0392B;}
        .btn-main:disabled{opacity:0.6;cursor:not-allowed;}
        @keyframes btnShimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        .btn-main.shimmer{background:linear-gradient(90deg,#1a1a1a 0%,#3a3a3a 40%,#1a1a1a 100%);background-size:200% 100%;animation:btnShimmer 1.2s ease infinite;}
        .err{background:rgba(192,57,43,0.08);border:1px solid rgba(192,57,43,0.2);border-radius:8px;padding:10px 14px;font-size:13px;color:#C0392B;margin-bottom:14px;}
        .success{background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.3);border-radius:12px;padding:20px;text-align:center;}
        .success-icon{font-size:32px;margin-bottom:10px;}
        .success-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:#065F46;margin-bottom:6px;}
        .success-sub{font-size:13px;color:#047857;line-height:1.5;}
        .footer-links{margin-top:24px;text-align:center;font-size:13px;color:#6B6B6B;}
        .footer-links a{color:#0D0D0D;font-weight:500;text-decoration:none;}
        .footer-links a:hover{color:#C0392B;}
      `}</style>

      <div className="page">
        <motion.div
          className="logo-wrap"
          initial={pref ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: expoOut }}
        >
          <svg className="logo-mark" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="26" cy="10" r="6" fill="#0D0D0D"/>
            <path d="M26 16 L44 48 H8 Z" fill="#0D0D0D"/>
            <circle cx="9" cy="18" r="4" fill="#6B6B6B"/>
            <circle cx="43" cy="18" r="4" fill="#6B6B6B"/>
          </svg>
          <span className="logo-name">BIG FAMILY</span>
        </motion.div>

        <motion.div
          className="card"
          initial={pref ? false : { opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 140, damping: 20, delay: 0.08 }}
        >
          <h1 className="card-title">Recuperar contraseña</h1>
          <p className="card-sub">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>

          {sent ? (
            <div className="success">
              <div className="success-icon">✉️</div>
              <div className="success-title">Correo enviado</div>
              <div className="success-sub">
                Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue las instrucciones para restablecer tu contraseña.
              </div>
            </div>
          ) : (
            <>
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="err"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: expoOut }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit}>
                <motion.div
                  className="field"
                  initial={pref ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: expoOut, delay: 0.22 }}
                >
                  <label htmlFor="email">Correo electrónico</label>
                  <input
                    id="email" type="email" placeholder="tu@correo.com"
                    value={email} onChange={e => setEmail(e.target.value)} required
                  />
                </motion.div>
                <motion.div
                  initial={pref ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: expoOut, delay: 0.26 }}
                >
                  <button className={`btn-main${loading ? ' shimmer' : ''}`} type="submit" disabled={loading}>
                    {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
                  </button>
                </motion.div>
              </form>
            </>
          )}

          <div className="footer-links">
            <a href="/login">← Volver al inicio de sesión</a>
          </div>
        </motion.div>
      </div>
    </>
  )
}
