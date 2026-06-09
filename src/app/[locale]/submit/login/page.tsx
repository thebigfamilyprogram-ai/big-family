'use client'

export const dynamic = 'force-dynamic'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase'

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

export default function SubmitLoginPage() {
  const router      = useRouter()
  const t           = useTranslations('submit.login')
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setLoading(false)
      setError(t('invalidCredentials'))
      return
    }

    router.replace('/submit/project')
  }

  return (
    <>
      <style>{`
                *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:var(--bg);font-family:"Satoshi",sans-serif;min-height:100vh;}
        .sl-page{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 20px;}
        .sl-card{background:#fff;border:1px solid rgba(13,13,13,.09);border-radius:20px;box-shadow:0 8px 40px -12px rgba(13,13,13,.12);padding:36px 32px;width:100%;max-width:400px;}
        .sl-heading{font-family:"Satoshi",sans-serif;font-weight:900;font-size:24px;color:#0D0D0D;margin-bottom:6px;}
        .sl-sub{font-size:14px;color:#6B6B6B;margin-bottom:28px;line-height:1.5;}
        .sl-field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
        .sl-label{font-size:12.5px;font-weight:600;color:#2D2D2D;}
        .sl-input{padding:14px 16px;border:1.5px solid #E0DDD8;border-radius:10px;font-size:15px;font-family:inherit;background:#fff;color:#0D0D0D;outline:none;transition:border-color .2s;width:100%;}
        .sl-input:focus{border-color:#0D0D0D;}
        .sl-input::placeholder{color:#b0ada8;}
        .sl-error{font-size:13px;color:#C0392B;background:#FFF5F5;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;margin-bottom:16px;}
        .sl-btn{width:100%;min-height:52px;background:#C0392B;color:#fff;border:none;border-radius:12px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;cursor:pointer;transition:background .2s;}
        .sl-btn:hover:not(:disabled){background:#a93226;}
        .sl-btn:disabled{opacity:.5;cursor:not-allowed;}
        .sl-link{text-align:center;font-size:13px;color:#6B6B6B;margin-top:20px;}
        .sl-link a{color:#C0392B;text-decoration:none;font-weight:600;}
      `}</style>

      <div className="sl-page">
        <Logo />
        <div className="sl-card">
          <div className="sl-heading">{t('heading')}</div>
          <div className="sl-sub">{t('sub')}</div>

          <form onSubmit={handleSubmit}>
            <div className="sl-field">
              <label className="sl-label">{t('emailLabel')}</label>
              <input
                className="sl-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoFocus
                required
              />
            </div>
            <div className="sl-field">
              <label className="sl-label">{t('passwordLabel')}</label>
              <input
                className="sl-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                required
              />
            </div>
            {error && <div className="sl-error">{error}</div>}
            <button className="sl-btn" type="submit" disabled={loading || !email || !password}>
              {loading ? t('signingIn') : t('submitBtn')}
            </button>
          </form>

          <div className="sl-link">
            {t('noAccount')} <a href="/submit/register">{t('registerLink')}</a>
          </div>
        </div>
      </div>
    </>
  )
}
