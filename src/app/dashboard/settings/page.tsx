'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { showToast } from '@/components/Toast'
import DashboardSidebar from '@/components/DashboardSidebar'

type Section = 'profile' | 'appearance' | 'account' | 'notifications'

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: 'profile', label: 'Perfil',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2 13c0-2.76 2.686-5 6-5s6 2.24 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  },
  {
    id: 'appearance', label: 'Apariencia',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 1.5v13M1.5 8h13" stroke="currentColor" strokeWidth="1.4"/></svg>,
  },
  {
    id: 'account', label: 'Cuenta',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="6" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 6V4.5a3 3 0 0 1 6 0V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  },
  {
    id: 'notifications', label: 'Notificaciones',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5A4.5 4.5 0 0 0 3.5 6v2.5L2 11h12l-1.5-2.5V6A4.5 4.5 0 0 0 8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M6.5 11v.5a1.5 1.5 0 0 0 3 0V11" stroke="currentColor" strokeWidth="1.4"/></svg>,
  },
]

const THEME_CARDS: { id: Theme; label: string; desc: string }[] = [
  { id: 'light', label: 'Claro',       desc: 'Interfaz luminosa' },
  { id: 'dark',  label: 'Oscuro',      desc: 'Modo nocturno' },
  { id: 'auto',  label: 'Automático',  desc: 'Sigue el sistema' },
]

export default function SettingsPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

  const [loading,       setLoading]       = useState(true)
  const [section,       setSection]       = useState<Section>('profile')
  const [userName,      setUserName]      = useState('…')
  const [userInitial,   setUserInitial]   = useState('L')
  const [userId,        setUserId]        = useState('')
  const [email,         setEmail]         = useState('')
  const [school,        setSchool]        = useState('')
  const [role,          setRole]          = useState('')
  const [badges,        setBadges]        = useState<string[]>([])

  // Profile form
  const [displayName,   setDisplayName]   = useState('')
  const [bio,           setBio]           = useState('')
  const [avatarUrl,     setAvatarUrl]     = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [saving,        setSaving]        = useState(false)

  // Notifications (placeholder state)
  const [notifEmail,    setNotifEmail]    = useState(true)
  const [notifPush,     setNotifPush]     = useState(false)
  const [notifWeekly,   setNotifWeekly]   = useState(true)

  // Account
  const [resetSent,     setResetSent]     = useState(false)
  const [deleteModal,   setDeleteModal]   = useState(false)
  const [deleteInput,   setDeleteInput]   = useState('')
  const [deleting,      setDeleting]      = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setUserId(user.id)
      setEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, display_name, bio, avatar_url, school_id, role, user_badges')
        .eq('id', user.id)
        .maybeSingle()

      const dn   = profile?.display_name || profile?.full_name || user.email || 'Leader'
      setUserName(dn)
      setUserInitial(dn.charAt(0).toUpperCase())
      setDisplayName(profile?.display_name ?? profile?.full_name ?? '')
      setBio(profile?.bio ?? '')
      setAvatarUrl(profile?.avatar_url ?? '')
      setRole(profile?.role ?? 'student')
      setBadges(Array.isArray(profile?.user_badges) ? profile.user_badges : [])

      if (profile?.school_id) {
        const { data: sc } = await supabase
          .from('schools').select('name').eq('id', profile.school_id).maybeSingle()
        setSchool(sc?.name ?? '')
      }

      setLoading(false)
    }
    boot()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSaveProfile() {
    setSaving(true)
    try {
      let newUrl = avatarUrl

      if (avatarFile) {
        const ext  = avatarFile.name.split('.').pop()
        const path = `${userId}/avatar.${ext}`
        const { error: upErr } = await supabase.storage
          .from('avatars').upload(path, avatarFile, { upsert: true })
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
        newUrl = pub.publicUrl
        setAvatarUrl(newUrl)
        setAvatarFile(null)
      }

      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName, bio, avatar_url: newUrl })
        .eq('id', userId)

      if (error) throw error

      const name = displayName || userName
      setUserName(name)
      setUserInitial(name.charAt(0).toUpperCase())
      showToast('success', 'Perfil actualizado correctamente')
    } catch {
      showToast('error', 'Error al guardar el perfil')
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordReset() {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    if (error) {
      showToast('error', 'Error al enviar el correo')
    } else {
      setResetSent(true)
      showToast('success', 'Correo de restablecimiento enviado')
    }
  }

  async function handleSignOutAll() {
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/login')
  }

  async function handleDeleteAccount() {
    if (deleteInput !== 'ELIMINAR') return
    setDeleting(true)
    try {
      const res = await fetch('/api/delete-account', { method: 'POST' })
      if (!res.ok) throw new Error()
      await supabase.auth.signOut()
      router.push('/')
    } catch {
      showToast('error', 'Error al eliminar la cuenta. Contacta soporte.')
      setDeleting(false)
    }
  }

  const displayAvatar = avatarPreview || avatarUrl

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
        <DashboardSidebar activePage="settings" />
        <div style={{ flex: 1, padding: 40, overflow: 'auto' }}>
          <div style={{ height: 36, width: 200, borderRadius: 8, background: 'rgba(13,13,13,.07)', marginBottom: 32 }} />
          <div style={{ height: 480, borderRadius: 16, background: 'rgba(13,13,13,.05)' }} />
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap');
        .st-header{padding:36px 40px 0;}
        .st-eyebrow{font-family:"Satoshi",sans-serif;font-size:11px;letter-spacing:.18em;color:#C0392B;text-transform:uppercase;font-weight:700;margin-bottom:10px;}
        .st-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:28px;color:var(--ink);letter-spacing:-.02em;margin-bottom:0;}
        .st-body{display:flex;gap:32px;padding:28px 40px 60px;align-items:flex-start;}
        .st-sidenav{width:190px;flex-shrink:0;background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:8px;position:sticky;top:24px;}
        .st-nav-btn{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border-radius:10px;border:none;background:none;font-size:13.5px;font-weight:500;color:var(--mute);cursor:pointer;transition:all .18s;text-align:left;}
        .st-nav-btn:hover{background:var(--line);color:var(--ink);}
        .st-nav-btn.active{background:#C0392B;color:#fff;}
        .st-content{flex:1;min-width:0;}
        .st-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:20px;padding:32px;margin-bottom:20px;}
        .st-card-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:16px;color:var(--ink);margin-bottom:4px;}
        .st-card-sub{font-size:13px;color:var(--mute);margin-bottom:24px;}
        .st-field{margin-bottom:20px;}
        .st-label{display:block;font-size:12px;font-weight:600;color:var(--mute);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px;}
        .st-input{width:100%;padding:11px 14px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:14px;font-family:Inter,sans-serif;outline:none;box-sizing:border-box;transition:border-color .2s;}
        .st-input:focus{border-color:#C0392B;}
        .st-input:disabled{opacity:.5;cursor:not-allowed;}
        .st-textarea{width:100%;padding:11px 14px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:14px;font-family:Inter,sans-serif;outline:none;box-sizing:border-box;resize:vertical;min-height:90px;transition:border-color .2s;}
        .st-textarea:focus{border-color:#C0392B;}
        .st-char{font-size:11px;color:var(--mute);text-align:right;margin-top:4px;}
        .st-badge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:600;background:rgba(192,57,43,.1);color:#C0392B;margin-right:6px;margin-bottom:6px;}
        .st-save-row{display:flex;justify-content:flex-end;margin-top:8px;}
        .btn-save{padding:11px 28px;border-radius:999px;background:#C0392B;color:#fff;border:none;font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:background .2s;}
        .btn-save:hover:not(:disabled){background:#a93226;}
        .btn-save:disabled{opacity:.6;cursor:not-allowed;}

        /* Avatar */
        .st-avatar-wrap{display:flex;align-items:center;gap:20px;margin-bottom:24px;}
        .st-avatar{width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#C0392B 0%,#8B1A1A 100%);color:#fff;font-family:"Satoshi",sans-serif;font-weight:700;font-size:36px;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;position:relative;flex-shrink:0;}
        .st-avatar img{width:100%;height:100%;object-fit:cover;}
        .st-avatar-overlay{position:absolute;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;}
        .st-avatar:hover .st-avatar-overlay{opacity:1;}
        .st-avatar-hint{font-size:13px;color:var(--mute);line-height:1.5;}

        /* Appearance cards */
        .theme-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
        .theme-card{border:2px solid var(--line);border-radius:14px;padding:16px;cursor:pointer;transition:border-color .2s,box-shadow .2s;position:relative;}
        .theme-card:hover{border-color:rgba(192,57,43,.4);}
        .theme-card.selected{border-color:#C0392B;box-shadow:0 0 0 3px rgba(192,57,43,.12);}
        .theme-preview{border-radius:8px;height:80px;margin-bottom:12px;overflow:hidden;border:1px solid rgba(0,0,0,.08);}
        .theme-label{font-family:"Satoshi",sans-serif;font-weight:700;font-size:13.5px;color:var(--ink);margin-bottom:2px;}
        .theme-desc{font-size:12px;color:var(--mute);}
        .theme-check{position:absolute;top:10px;right:10px;width:20px;height:20px;border-radius:50%;background:#C0392B;display:flex;align-items:center;justify-content:center;}

        /* Account */
        .st-danger-box{border:1px solid #FCA5A5;border-radius:14px;padding:24px;background:rgba(254,226,226,.3);}
        .st-danger-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:14px;color:#991B1B;margin-bottom:4px;}
        .st-danger-sub{font-size:13px;color:#B91C1C;margin-bottom:16px;}
        .btn-danger{padding:10px 22px;border-radius:999px;background:#EF4444;color:#fff;border:none;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:background .2s;margin-right:10px;}
        .btn-danger:hover{background:#DC2626;}
        .btn-outline-danger{padding:10px 22px;border-radius:999px;background:transparent;color:#EF4444;border:1.5px solid #EF4444;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:all .2s;}
        .btn-outline-danger:hover{background:#EF4444;color:#fff;}
        .btn-secondary{padding:10px 22px;border-radius:999px;background:var(--line);color:var(--ink);border:none;font-family:"Satoshi",sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:background .2s;}
        .btn-secondary:hover{background:var(--line-soft);}

        /* Notifications */
        .notif-row{display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid var(--line);}
        .notif-row:last-child{border-bottom:none;}
        .notif-label{font-size:14px;color:var(--ink);font-weight:500;}
        .notif-sub{font-size:12px;color:var(--mute);margin-top:2px;}
        .toggle{position:relative;width:44px;height:24px;flex-shrink:0;}
        .toggle input{opacity:0;width:0;height:0;}
        .toggle-track{position:absolute;inset:0;border-radius:999px;background:var(--line);cursor:pointer;transition:background .2s;}
        .toggle input:checked+.toggle-track{background:#C0392B;}
        .toggle-thumb{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.2);}
        .toggle input:checked~.toggle-thumb{transform:translateX(20px);}

        /* Delete modal */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;}
        .modal-box{background:var(--card-bg);border-radius:20px;padding:32px;max-width:420px;width:100%;box-shadow:0 20px 60px -10px rgba(0,0,0,.3);}
        .modal-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:18px;color:var(--ink);margin-bottom:8px;}
        .modal-sub{font-size:13.5px;color:var(--mute);margin-bottom:20px;line-height:1.6;}
        .modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px;}

        @media(max-width:900px){
          .st-body{flex-direction:column;padding-left:20px;padding-right:20px;}
          .st-header{padding-left:20px;padding-right:20px;}
          .st-sidenav{width:100%;position:static;}
          .theme-grid{grid-template-columns:1fr 1fr;}
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <DashboardSidebar activePage="settings" userName={userName} userInitial={userInitial} />

        <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          <div className="st-header">
            <div className="st-eyebrow">THE BIG LEADER</div>
            <h1 className="st-title">Configuración</h1>
          </div>

          <div className="st-body">
            {/* Left nav */}
            <nav className="st-sidenav">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  className={`st-nav-btn ${section === s.id ? 'active' : ''}`}
                  onClick={() => setSection(s.id)}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </nav>

            {/* Content */}
            <div className="st-content">

              {/* ── PROFILE ── */}
              {section === 'profile' && (
                <>
                  <div className="st-card">
                    <div className="st-card-title">Información personal</div>
                    <div className="st-card-sub">Tu perfil visible para coordinadores y compañeros.</div>

                    {/* Avatar */}
                    <div className="st-avatar-wrap">
                      <div className="st-avatar" onClick={() => fileRef.current?.click()}>
                        {displayAvatar
                          ? <img src={displayAvatar} alt="avatar" />
                          : userInitial}
                        <div className="st-avatar-overlay">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="#fff" strokeWidth="1.6"/>
                            <path d="M3 9l2-4h14l2 4v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9Z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleAvatarPick}
                      />
                      <div className="st-avatar-hint">
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)', marginBottom: 4 }}>Foto de perfil</div>
                        <div>Haz clic para subir una imagen.</div>
                        <div>JPG, PNG o WEBP · máx. 2MB</div>
                      </div>
                    </div>

                    {/* Display name */}
                    <div className="st-field">
                      <label className="st-label">Nombre para mostrar</label>
                      <input
                        className="st-input"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value.slice(0, 60))}
                        placeholder="Tu nombre"
                        maxLength={60}
                      />
                    </div>

                    {/* Bio */}
                    <div className="st-field">
                      <label className="st-label">Biografía</label>
                      <textarea
                        className="st-textarea"
                        value={bio}
                        onChange={e => setBio(e.target.value.slice(0, 160))}
                        placeholder="Cuéntanos un poco sobre ti..."
                        maxLength={160}
                      />
                      <div className="st-char">{bio.length} / 160</div>
                    </div>

                    {/* School + Role (readonly) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                      <div className="st-field" style={{ marginBottom: 0 }}>
                        <label className="st-label">Institución</label>
                        <input className="st-input" value={school} disabled />
                      </div>
                      <div className="st-field" style={{ marginBottom: 0 }}>
                        <label className="st-label">Rol</label>
                        <input className="st-input" value={role} disabled />
                      </div>
                    </div>

                    <div className="st-save-row">
                      <button className="btn-save" onClick={handleSaveProfile} disabled={saving}>
                        {saving ? 'Guardando…' : 'Guardar cambios'}
                      </button>
                    </div>
                  </div>

                  {/* Badges */}
                  {badges.length > 0 && (
                    <div className="st-card">
                      <div className="st-card-title">Insignias</div>
                      <div className="st-card-sub" style={{ marginBottom: 16 }}>Reconocimientos obtenidos en el programa.</div>
                      <div>{badges.map((b, i) => <span key={i} className="st-badge">{b}</span>)}</div>
                    </div>
                  )}
                </>
              )}

              {/* ── APPEARANCE ── */}
              {section === 'appearance' && (
                <div className="st-card">
                  <div className="st-card-title">Apariencia</div>
                  <div className="st-card-sub">Elige cómo se ve la interfaz de Big Family.</div>

                  <div className="theme-grid">
                    {THEME_CARDS.map(card => (
                      <div
                        key={card.id}
                        className={`theme-card ${theme === card.id ? 'selected' : ''}`}
                        onClick={() => setTheme(card.id)}
                      >
                        {/* Preview */}
                        <div className="theme-preview">
                          {card.id === 'light' && (
                            <div style={{ background: '#F5F3EF', height: '100%', padding: 10 }}>
                              <div style={{ height: 8, width: '60%', borderRadius: 4, background: '#0D0D0D', marginBottom: 6 }} />
                              <div style={{ height: 6, width: '80%', borderRadius: 4, background: 'rgba(13,13,13,.2)', marginBottom: 4 }} />
                              <div style={{ height: 6, width: '70%', borderRadius: 4, background: 'rgba(13,13,13,.2)' }} />
                              <div style={{ height: 24, width: 60, borderRadius: 6, background: '#C0392B', marginTop: 12 }} />
                            </div>
                          )}
                          {card.id === 'dark' && (
                            <div style={{ background: '#0F0F0F', height: '100%', padding: 10 }}>
                              <div style={{ height: 8, width: '60%', borderRadius: 4, background: '#F0EEE9', marginBottom: 6 }} />
                              <div style={{ height: 6, width: '80%', borderRadius: 4, background: 'rgba(240,238,233,.25)', marginBottom: 4 }} />
                              <div style={{ height: 6, width: '70%', borderRadius: 4, background: 'rgba(240,238,233,.25)' }} />
                              <div style={{ height: 24, width: 60, borderRadius: 6, background: '#E05247', marginTop: 12 }} />
                            </div>
                          )}
                          {card.id === 'auto' && (
                            <div style={{ height: '100%', display: 'flex' }}>
                              <div style={{ flex: 1, background: '#F5F3EF', padding: 10 }}>
                                <div style={{ height: 8, width: '70%', borderRadius: 4, background: '#0D0D0D', marginBottom: 6 }} />
                                <div style={{ height: 6, borderRadius: 4, background: 'rgba(13,13,13,.2)' }} />
                              </div>
                              <div style={{ flex: 1, background: '#0F0F0F', padding: 10 }}>
                                <div style={{ height: 8, width: '70%', borderRadius: 4, background: '#F0EEE9', marginBottom: 6 }} />
                                <div style={{ height: 6, borderRadius: 4, background: 'rgba(240,238,233,.25)' }} />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="theme-label">{card.label}</div>
                        <div className="theme-desc">{card.desc}</div>

                        {theme === card.id && (
                          <div className="theme-check">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── ACCOUNT ── */}
              {section === 'account' && (
                <>
                  <div className="st-card">
                    <div className="st-card-title">Correo electrónico</div>
                    <div className="st-card-sub">Tu dirección de correo vinculada a la cuenta.</div>
                    <div className="st-field">
                      <label className="st-label">Correo</label>
                      <input className="st-input" value={email} disabled />
                    </div>
                  </div>

                  <div className="st-card">
                    <div className="st-card-title">Contraseña</div>
                    <div className="st-card-sub">Recibirás un correo con instrucciones para restablecer tu contraseña.</div>
                    {resetSent ? (
                      <div style={{ padding: '12px 16px', borderRadius: 10, background: '#D1FAE5', color: '#065F46', fontSize: 13.5, fontWeight: 500 }}>
                        ✓ Correo enviado. Revisa tu bandeja de entrada.
                      </div>
                    ) : (
                      <button className="btn-secondary" onClick={handlePasswordReset}>
                        Enviar correo de restablecimiento
                      </button>
                    )}
                  </div>

                  <div className="st-card">
                    <div className="st-card-title" style={{ color: '#991B1B' }}>Zona de peligro</div>
                    <div className="st-card-sub">Estas acciones son permanentes y no se pueden deshacer.</div>

                    <div className="st-danger-box" style={{ marginBottom: 16 }}>
                      <div className="st-danger-title">Cerrar sesión en todos los dispositivos</div>
                      <div className="st-danger-sub">Se cerrará la sesión en todos los dispositivos donde hayas iniciado sesión.</div>
                      <button className="btn-outline-danger" onClick={handleSignOutAll}>
                        Cerrar sesión en todos los dispositivos
                      </button>
                    </div>

                    <div className="st-danger-box">
                      <div className="st-danger-title">Eliminar cuenta</div>
                      <div className="st-danger-sub">Se borrarán todos tus datos, proyectos y progreso de forma permanente.</div>
                      <button className="btn-danger" onClick={() => setDeleteModal(true)}>
                        Eliminar mi cuenta
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ── NOTIFICATIONS ── */}
              {section === 'notifications' && (
                <div className="st-card">
                  <div className="st-card-title">Notificaciones</div>
                  <div className="st-card-sub">Elige cómo quieres recibir actualizaciones del programa.</div>

                  {[
                    { label: 'Notificaciones por correo', sub: 'Actualizaciones sobre proyectos y módulos', val: notifEmail, set: setNotifEmail },
                    { label: 'Notificaciones push', sub: 'Alertas en tiempo real en el navegador', val: notifPush, set: setNotifPush },
                    { label: 'Resumen semanal', sub: 'Un correo cada lunes con tu progreso', val: notifWeekly, set: setNotifWeekly },
                  ].map((row, i) => (
                    <div key={i} className="notif-row">
                      <div>
                        <div className="notif-label">{row.label}</div>
                        <div className="notif-sub">{row.sub}</div>
                      </div>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={row.val}
                          onChange={e => row.set(e.target.checked)}
                        />
                        <div className="toggle-track" />
                        <div className="toggle-thumb" />
                      </label>
                    </div>
                  ))}

                  <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn-save" onClick={() => showToast('success', 'Preferencias guardadas')}>
                      Guardar preferencias
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>

      {/* Delete account modal */}
      {deleteModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDeleteModal(false) }}>
          <div className="modal-box">
            <div className="modal-title">¿Eliminar tu cuenta?</div>
            <p className="modal-sub">
              Esta acción es <strong>irreversible</strong>. Se eliminarán todos tus datos, proyectos, insignias y progreso del programa.
              <br /><br />
              Escribe <strong>ELIMINAR</strong> para confirmar.
            </p>
            <input
              className="st-input"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="ELIMINAR"
              style={{ fontFamily: 'monospace', letterSpacing: '.08em' }}
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { setDeleteModal(false); setDeleteInput('') }}>
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={handleDeleteAccount}
                disabled={deleteInput !== 'ELIMINAR' || deleting}
                style={{ opacity: deleteInput !== 'ELIMINAR' ? 0.5 : 1, cursor: deleteInput !== 'ELIMINAR' ? 'not-allowed' : 'pointer' }}
              >
                {deleting ? 'Eliminando…' : 'Eliminar cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
