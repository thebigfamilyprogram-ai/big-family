'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardSidebar from '@/components/DashboardSidebar'
import { showToast } from '@/components/Toast'

type Tab = 'team' | 'ranking' | 'chat' | 'projects'

interface TeamMember {
  id: string
  full_name: string
  avatar_url: string | null
  school_level: string
  total_xp: number
  modules_completed: number
}

interface ChatMessage {
  id: string
  user_id: string
  content: string
  created_at: string
  profiles: { full_name: string; avatar_url: string | null; school_level: string } | null
}

interface TeamProject {
  id: string
  title: string
  description: string
  category: string
  status: string
  created_by: string
  school_id: string
  created_at: string
  creator_name: string
  member_count: number
  member_names: string[]
}

const LEVEL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  junior: { bg: '#FEF3C7',             text: '#92400E', label: 'Junior' },
  senior: { bg: 'rgba(192,57,43,0.1)', text: '#C0392B', label: 'Senior' },
}

const RANKING_DATA = [
  { name: 'María García',     xp: 2400, modules: 7, level: 'senior', position: 1 },
  { name: 'Carlos Rodríguez', xp: 2100, modules: 6, level: 'senior', position: 2 },
  { name: 'Ana Martínez',     xp: 1850, modules: 5, level: 'senior', position: 3 },
  { name: 'Luis Pérez',       xp: 1600, modules: 5, level: 'senior', position: 4 },
  { name: 'Sofia Torres',     xp: 1400, modules: 4, level: 'junior', position: 5 },
  { name: 'Diego López',      xp: 1200, modules: 4, level: 'junior', position: 6 },
  { name: 'Valentina Cruz',   xp:  980, modules: 3, level: 'junior', position: 7 },
  { name: 'Sebastián Mora',   xp:  750, modules: 2, level: 'junior', position: 8 },
]

const PROJECT_CATEGORIES = [
  'Liderazgo', 'Medioambiente', 'Educación', 'Arte y Cultura',
  'Deporte', 'Tecnología', 'Salud', 'Comunidad',
]

function getInitials(name: string) {
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

export default function TeamHubPage() {
  const router       = useRouter()
  const supabaseRef  = useRef<ReturnType<typeof createClient> | null>(null)

  const [loading,     setLoading]     = useState(true)
  const [activeTab,   setActiveTab]   = useState<Tab>('team')
  const [userName,    setUserName]    = useState('…')
  const [userInitial, setUserInitial] = useState('L')
  const [userId,      setUserId]      = useState('')
  const [schoolId,    setSchoolId]    = useState<string | null>(null)
  const [schoolName,  setSchoolName]  = useState('tu colegio')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [messages,    setMessages]    = useState<ChatMessage[]>([])
  const [msgText,     setMsgText]     = useState('')
  const [sending,     setSending]     = useState(false)
  const [projects,    setProjects]    = useState<TeamProject[]>([])
  const [memberIds,   setMemberIds]   = useState<string[]>([])
  const [showModal,   setShowModal]   = useState(false)
  const [newTitle,    setNewTitle]    = useState('')
  const [newDesc,     setNewDesc]     = useState('')
  const [newCat,      setNewCat]      = useState(PROJECT_CATEGORIES[0])
  const [creating,    setCreating]    = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, school_id, school_name')
        .eq('id', user.id)
        .maybeSingle()

      const name = profile?.full_name ?? user.email ?? 'Leader'
      setUserName(name)
      setUserInitial(name.charAt(0).toUpperCase())
      if (profile?.school_name) setSchoolName(profile.school_name)

      const sid = profile?.school_id ?? null
      setSchoolId(sid)

      if (sid) {
        await Promise.all([
          loadTeam(user.id, sid),
          loadMessages(sid),
          loadProjects(user.id, sid),
        ])
      }
      setLoading(false)
    }
    boot()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime chat subscription
  useEffect(() => {
    if (!schoolId || !supabaseRef.current) return
    const supabase = supabaseRef.current
    const channel = supabase
      .channel('team-chat-' + schoolId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'team_messages',
        filter: 'school_id=eq.' + schoolId,
      }, async (payload) => {
        const { data } = await supabase
          .from('team_messages')
          .select('*, profiles(full_name, avatar_url, school_level)')
          .eq('id', (payload.new as { id: string }).id)
          .maybeSingle()
        if (data) setMessages(prev => [...prev, data as ChatMessage])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [schoolId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadTeam(uid: string, sid: string) {
    if (!supabaseRef.current) return
    const supabase = supabaseRef.current
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, school_level')
      .eq('school_id', sid)
      .eq('role', 'student')
    if (!data) return

    const ids = data.map(p => p.id)
    const [{ data: xpRows }, { data: progressRows }] = await Promise.all([
      supabase.from('xp_log').select('user_id, amount').in('user_id', ids),
      supabase.from('progress').select('user_id, id').eq('completed', true).in('user_id', ids),
    ])

    const members: TeamMember[] = data.map(p => ({
      ...p,
      total_xp: xpRows?.filter(x => x.user_id === p.id).reduce((s, x) => s + (x.amount ?? 0), 0) ?? 0,
      modules_completed: progressRows?.filter(pr => pr.user_id === p.id).length ?? 0,
    })).sort((a, b) => b.total_xp - a.total_xp)

    setTeamMembers(members)
  }

  async function loadMessages(sid: string) {
    if (!supabaseRef.current) return
    const supabase = supabaseRef.current
    const { data } = await supabase
      .from('team_messages')
      .select('*, profiles(full_name, avatar_url, school_level)')
      .eq('school_id', sid)
      .order('created_at', { ascending: true })
      .limit(50)
    if (data) setMessages(data as ChatMessage[])
  }

  async function loadProjects(uid: string, sid: string) {
    if (!supabaseRef.current) return
    const supabase = supabaseRef.current
    const { data: projData } = await supabase
      .from('team_projects')
      .select('*')
      .eq('school_id', sid)
      .order('created_at', { ascending: false })
    if (!projData) return

    const ids = projData.map(p => p.id)
    const [{ data: membersData }, { data: creatorProfiles }] = await Promise.all([
      supabase.from('team_project_members').select('project_id, user_id, profiles(full_name)').in('project_id', ids),
      supabase.from('profiles').select('id, full_name').in('id', projData.map(p => p.created_by)),
    ])

    setMemberIds(membersData?.filter(m => m.user_id === uid).map(m => m.project_id) ?? [])
    setProjects(projData.map(p => ({
      ...p,
      creator_name: creatorProfiles?.find(c => c.id === p.created_by)?.full_name ?? '—',
      member_count: membersData?.filter(m => m.project_id === p.id).length ?? 0,
      member_names: membersData?.filter(m => m.project_id === p.id)
        .map(m => (m.profiles as unknown as { full_name: string } | null)?.full_name ?? '?') ?? [],
    })))
  }

  async function sendMessage() {
    if (!msgText.trim() || !schoolId || sending || !supabaseRef.current) return
    const supabase = supabaseRef.current
    setSending(true)
    const { error } = await supabase.from('team_messages').insert({
      school_id: schoolId,
      user_id: userId,
      content: msgText.trim(),
    })
    if (error) showToast('error', 'No se pudo enviar el mensaje')
    else setMsgText('')
    setSending(false)
  }

  async function joinProject(projectId: string) {
    if (!supabaseRef.current) return
    const supabase = supabaseRef.current
    const { error } = await supabase.from('team_project_members').insert({ project_id: projectId, user_id: userId })
    if (error) { showToast('error', 'Error al unirse al proyecto'); return }
    showToast('success', '¡Te uniste al proyecto!')
    setMemberIds(prev => [...prev, projectId])
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, member_count: p.member_count + 1, member_names: [...p.member_names, userName] } : p))
  }

  async function createProject() {
    if (!newTitle.trim() || !schoolId || creating || !supabaseRef.current) return
    const supabase = supabaseRef.current
    setCreating(true)
    const { data: proj, error } = await supabase.from('team_projects').insert({
      title: newTitle.trim(),
      description: newDesc.trim(),
      category: newCat,
      status: 'active',
      created_by: userId,
      school_id: schoolId,
    }).select().maybeSingle()

    if (error || !proj) { showToast('error', 'Error al crear el proyecto'); setCreating(false); return }
    await supabase.from('team_project_members').insert({ project_id: proj.id, user_id: userId })
    showToast('success', '¡Proyecto creado!')
    setProjects(prev => [{ ...proj, creator_name: userName, member_count: 1, member_names: [userName] }, ...prev])
    setMemberIds(prev => [...prev, proj.id])
    setShowModal(false)
    setNewTitle(''); setNewDesc(''); setNewCat(PROJECT_CATEGORIES[0])
    setCreating(false)
  }

  const maxXp = Math.max(...teamMembers.map(m => m.total_xp), 1)
  const maxRankXp = RANKING_DATA[0].xp

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <DashboardSidebar activePage="team-hub" />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--mute)', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>Cargando Team Hub…</div>
        </main>
      </div>
    )
  }

  return (
    <>
      <style>{`
        .th-layout{display:flex;min-height:100vh;background:var(--bg);}
        .th-main{flex:1;overflow:auto;min-width:0;}
        .th-header{padding:40px 48px 0;}
        .th-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:28px;color:var(--ink);margin:0 0 4px;}
        .th-sub{font-family:Inter,sans-serif;font-size:14px;color:#6B6B6B;margin:0;}
        .th-tabs{display:flex;border-bottom:1px solid var(--line);padding:0 48px;margin-top:28px;overflow-x:auto;}
        .th-tab{padding:12px 20px;font-family:"Satoshi",sans-serif;font-weight:600;font-size:14px;color:#6B6B6B;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;transition:color .15s;white-space:nowrap;margin-bottom:-1px;}
        .th-tab:hover{color:#0D0D0D;}
        .th-tab.active{color:#C0392B;border-bottom-color:#C0392B;}
        .th-content{padding:32px 48px 48px;}

        .th-team-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
        .th-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:20px;transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s;}
        .th-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,0.08);}
        .th-avatar-wrap{position:relative;width:56px;height:56px;margin-bottom:12px;}
        .th-avatar{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#C0392B 0%,#8B1A1A 100%);color:#fff;font-family:"Satoshi",sans-serif;font-weight:700;font-size:20px;display:flex;align-items:center;justify-content:center;}
        .th-avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover;}
        .th-lvl-badge{position:absolute;top:-4px;right:-4px;border-radius:999px;padding:2px 7px;font-size:9px;font-weight:700;font-family:"Satoshi",sans-serif;letter-spacing:.06em;border:1.5px solid var(--card-bg);}
        .th-member-name{font-family:"Satoshi",sans-serif;font-weight:600;font-size:15px;color:var(--ink);margin:0 0 4px;}
        .th-member-stats{font-family:Inter,sans-serif;font-size:12px;color:#6B6B6B;margin-bottom:10px;}
        .th-xp-bar{height:3px;border-radius:999px;background:#f0ede8;overflow:hidden;margin-bottom:14px;}
        .th-xp-fill{height:100%;border-radius:999px;background:#C0392B;}
        .th-profile-btn{width:100%;padding:7px 0;border:1px solid rgba(13,13,13,0.1);border-radius:999px;font-size:12px;font-family:"Satoshi",sans-serif;font-weight:600;color:var(--mute);background:none;cursor:pointer;transition:border-color .15s,color .15s;}
        .th-profile-btn:hover{border-color:#C0392B;color:#C0392B;}

        .th-podium{display:flex;align-items:flex-end;justify-content:center;gap:12px;margin-bottom:32px;}
        .th-podium-card{border-radius:16px;padding:20px 16px;text-align:center;flex:1;max-width:180px;}
        .th-p1{background:linear-gradient(135deg,#FEF3C7,#FDE68A);border:1px solid #F59E0B;max-width:210px;padding:28px 16px;}
        .th-p2{background:linear-gradient(135deg,#F1F5F9,#E2E8F0);border:1px solid #CBD5E1;}
        .th-p3{background:linear-gradient(135deg,#FEF3C7,#FED7AA);border:1px solid #F97316;}
        .th-rank-table{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;overflow:hidden;}
        .th-rank-row{display:grid;grid-template-columns:48px 1fr 90px 72px 80px 120px;align-items:center;padding:12px 20px;border-bottom:1px solid var(--line-soft);gap:8px;}
        .th-rank-row:last-child{border-bottom:none;}
        .th-rank-head{background:var(--bg-2);font-family:"Satoshi",sans-serif;font-weight:700;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);}

        .th-chat-wrap{display:flex;flex-direction:column;height:calc(100vh - 280px);min-height:400px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;overflow:hidden;}
        .th-chat-msgs{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:4px;}
        .th-chat-input-row{display:flex;align-items:center;gap:10px;padding:14px 16px;border-top:1px solid var(--line);}
        .th-chat-input{flex:1;border:1px solid rgba(13,13,13,0.12);border-radius:999px;padding:11px 20px;font-size:14px;font-family:Inter,sans-serif;background:var(--bg);color:var(--ink);outline:none;transition:border-color .15s;}
        .th-chat-input:focus{border-color:#C0392B;}
        .th-send-btn{width:40px;height:40px;border-radius:50%;background:#C0392B;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s;}
        .th-send-btn:hover{background:#a93226;}
        .th-send-btn:disabled{opacity:.5;cursor:default;}
        .th-msg-group{margin-bottom:8px;}
        .th-msg-own{display:flex;flex-direction:column;align-items:flex-end;}
        .th-msg-other{display:flex;flex-direction:column;align-items:flex-start;}
        .th-bubble-own{background:#C0392B;color:#fff;border-radius:18px 18px 4px 18px;padding:10px 14px;max-width:70%;font-size:14px;font-family:Inter,sans-serif;line-height:1.5;}
        .th-bubble-other{background:var(--bg);color:var(--ink);border:1px solid rgba(13,13,13,0.08);border-radius:18px 18px 18px 4px;padding:10px 14px;max-width:70%;font-size:14px;font-family:Inter,sans-serif;line-height:1.5;}
        .th-time-own{font-size:10px;color:rgba(255,255,255,0.7);margin-top:3px;}
        .th-time-other{font-size:10px;color:#aaa;margin-top:3px;}
        .th-msg-sender{font-family:"Satoshi",sans-serif;font-weight:600;font-size:11px;color:#C0392B;margin-bottom:3px;margin-left:40px;}
        .th-mini-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#C0392B,#8B1A1A);color:#fff;font-size:11px;font-weight:700;font-family:"Satoshi",sans-serif;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:8px;}

        .th-proj-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;}
        .th-proj-card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;padding:24px;}
        .th-cat-badge{border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600;font-family:"Satoshi",sans-serif;background:rgba(192,57,43,0.08);color:#C0392B;}
        .th-status-badge{border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600;font-family:"Satoshi",sans-serif;}
        .th-s-active{background:rgba(16,185,129,0.1);color:#065F46;}
        .th-s-done{background:rgba(107,114,128,0.1);color:#374151;}
        .th-proj-title{font-family:"Satoshi",sans-serif;font-weight:700;font-size:18px;color:var(--ink);margin:12px 0 8px;}
        .th-proj-desc{font-family:Inter,sans-serif;font-size:14px;color:#6B6B6B;margin:0 0 16px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        .th-overlap-avatars{display:flex;margin-bottom:8px;}
        .th-mini-av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#C0392B,#8B1A1A);color:#fff;font-size:10px;font-weight:700;font-family:"Satoshi",sans-serif;display:flex;align-items:center;justify-content:center;border:2px solid var(--card-bg);margin-left:-8px;}
        .th-mini-av:first-child{margin-left:0;}
        .th-proj-meta{font-family:Inter,sans-serif;font-size:12px;color:#aaa;margin-bottom:16px;}
        .th-join-btn{padding:8px 20px;background:#C0392B;color:#fff;border:none;border-radius:999px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:background .15s;}
        .th-join-btn:hover{background:#a93226;}
        .th-view-btn{padding:8px 20px;background:none;color:#C0392B;border:1px solid #C0392B;border-radius:999px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:background .15s;}
        .th-view-btn:hover{background:rgba(192,57,43,0.06);}
        .th-new-btn{padding:11px 22px;background:#C0392B;color:#fff;border:none;border-radius:999px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:background .15s;}
        .th-new-btn:hover{background:#a93226;}

        .th-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999;display:flex;align-items:flex-end;justify-content:center;}
        .th-modal{background:var(--card-bg);border-radius:24px 24px 0 0;padding:32px 32px 40px;width:100%;max-width:640px;}
        .th-modal-title{font-family:"Satoshi",sans-serif;font-weight:900;font-size:22px;color:var(--ink);margin:0 0 24px;}
        .th-input{width:100%;padding:12px 16px;border:1px solid var(--line);border-radius:10px;font-size:14px;font-family:Inter,sans-serif;background:var(--bg);color:var(--ink);margin-bottom:14px;outline:none;transition:border-color .15s;box-sizing:border-box;}
        .th-input:focus{border-color:#C0392B;}
        .th-textarea{resize:vertical;min-height:80px;}
        .th-select{width:100%;padding:12px 16px;border:1px solid var(--line);border-radius:10px;font-size:14px;font-family:Inter,sans-serif;background:var(--bg);color:var(--ink);margin-bottom:20px;outline:none;cursor:pointer;}
        .th-create-btn{width:100%;padding:14px;background:#C0392B;color:#fff;border:none;border-radius:12px;font-family:"Satoshi",sans-serif;font-weight:700;font-size:15px;cursor:pointer;transition:background .15s;}
        .th-create-btn:hover{background:#a93226;}
        .th-create-btn:disabled{opacity:.6;cursor:default;}

        .th-empty{text-align:center;padding:60px 0;color:var(--mute);font-family:Inter,sans-serif;font-size:14px;}

        @media(max-width:1000px){
          .th-team-grid{grid-template-columns:repeat(2,1fr);}
          .th-proj-grid{grid-template-columns:1fr;}
          .th-rank-row{grid-template-columns:40px 1fr 70px 60px 60px 80px;}
        }
        @media(max-width:700px){
          .th-content{padding:24px 20px 40px;}
          .th-header{padding:28px 20px 0;}
          .th-tabs{padding:0 20px;}
          .th-team-grid{grid-template-columns:1fr;}
        }
      `}</style>

      <div className="th-layout">
        <DashboardSidebar activePage="team-hub" userName={userName} userInitial={userInitial} />

        <main className="th-main">
          <div className="th-header">
            <h1 className="th-title">Team Hub</h1>
            <p className="th-sub">Tu comunidad en {schoolName}</p>
          </div>

          <div className="th-tabs">
            {(['team', 'ranking', 'chat', 'projects'] as Tab[]).map(t => {
              const labels: Record<Tab, string> = { team: 'Tu Equipo', ranking: 'Ranking', chat: 'Chat', projects: 'Proyectos' }
              return (
                <button key={t} className={`th-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
                  {labels[t]}
                </button>
              )
            })}
          </div>

          <div className="th-content">
            <AnimatePresence mode="wait">

              {/* ── TAB 1: TU EQUIPO ── */}
              {activeTab === 'team' && (
                <motion.div key="team" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                  {teamMembers.length === 0
                    ? <div className="th-empty">No hay compañeros en tu colegio aún.</div>
                    : (
                      <div className="th-team-grid">
                        {teamMembers.map((m, i) => {
                          const lvl = LEVEL_COLORS[m.school_level] ?? LEVEL_COLORS.junior
                          return (
                            <motion.div
                              key={m.id}
                              className="th-card"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
                            >
                              <div className="th-avatar-wrap">
                                <div className="th-avatar">
                                  {m.avatar_url ? <img src={m.avatar_url} alt={m.full_name} /> : getInitials(m.full_name)}
                                </div>
                                <div className="th-lvl-badge" style={{ background: lvl.bg, color: lvl.text }}>{lvl.label}</div>
                              </div>
                              <div className="th-member-name">
                                {m.full_name}
                                {m.id === userId && <span style={{ color: '#6B6B6B', fontWeight: 400, fontSize: 13 }}> (Tú)</span>}
                              </div>
                              <div className="th-member-stats">⭐ {m.total_xp} XP · 📚 {m.modules_completed} módulos</div>
                              <div className="th-xp-bar">
                                <div className="th-xp-fill" style={{ width: `${Math.round((m.total_xp / maxXp) * 100)}%` }} />
                              </div>
                              <button className="th-profile-btn" onClick={() => showToast('info', 'Próximamente')}>Ver perfil</button>
                            </motion.div>
                          )
                        })}
                      </div>
                    )
                  }
                </motion.div>
              )}

              {/* ── TAB 2: RANKING ── */}
              {activeTab === 'ranking' && (
                <motion.div key="ranking" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                  {/* Podium */}
                  <div className="th-podium">
                    <PodiumCard r={RANKING_DATA[1]} cls="th-p2" icon="🥈" avatarBg="linear-gradient(135deg,#94A3B8,#64748B)" />
                    <PodiumCard r={RANKING_DATA[0]} cls="th-p1" icon="👑" avatarBg="linear-gradient(135deg,#F59E0B,#D97706)" large />
                    <PodiumCard r={RANKING_DATA[2]} cls="th-p3" icon="🥉" avatarBg="linear-gradient(135deg,#F97316,#C2410C)" />
                  </div>

                  {/* Table */}
                  <div className="th-rank-table">
                    <div className="th-rank-row th-rank-head">
                      <span>#</span><span>Nombre</span><span>Nivel</span><span>Módulos</span><span>XP</span><span>Progreso</span>
                    </div>
                    {RANKING_DATA.map((r, i) => {
                      const lvl = LEVEL_COLORS[r.level] ?? LEVEL_COLORS.junior
                      const posColor = r.position === 1 ? '#F59E0B' : r.position === 2 ? '#94A3B8' : r.position === 3 ? '#F97316' : '#6B6B6B'
                      return (
                        <div key={i} className="th-rank-row">
                          <span style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, color: posColor }}>{r.position}</span>
                          <span style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{r.name}</span>
                          <span><span style={{ background: lvl.bg, color: lvl.text, borderRadius: 999, padding: '3px 9px', fontSize: 11, fontFamily: '"Satoshi",sans-serif', fontWeight: 700 }}>{lvl.label}</span></span>
                          <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, color: 'var(--mute)' }}>{r.modules}</span>
                          <span style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{r.xp}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 4, borderRadius: 999, background: '#f0ede8', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 999, background: '#C0392B', width: `${Math.round((r.xp / maxRankXp) * 100)}%` }} />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--mute)', fontFamily: 'Inter,sans-serif', minWidth: 30, textAlign: 'right' }}>{Math.round((r.xp / maxRankXp) * 100)}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p style={{ textAlign: 'center', marginTop: 16, fontFamily: 'Inter,sans-serif', fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>
                    * Datos de ejemplo — se actualizarán pronto
                  </p>
                </motion.div>
              )}

              {/* ── TAB 3: CHAT ── */}
              {activeTab === 'chat' && (
                <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                  <div className="th-chat-wrap">
                    <div className="th-chat-msgs">
                      {messages.length === 0 && (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute)', fontFamily: 'Inter,sans-serif', fontSize: 14 }}>
                          Sé el primero en escribir algo 👋
                        </div>
                      )}
                      {messages.map((msg, i) => {
                        const isOwn = msg.user_id === userId
                        const prev  = messages[i - 1]
                        const isFirstInGroup = !prev || prev.user_id !== msg.user_id
                        const senderName = msg.profiles?.full_name ?? 'Usuario'

                        if (isOwn) return (
                          <motion.div key={msg.id} className="th-msg-group th-msg-own"
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
                            <div className="th-bubble-own">{msg.content}</div>
                            <div className="th-time-own">{fmtTime(msg.created_at)}</div>
                          </motion.div>
                        )

                        return (
                          <motion.div key={msg.id} className="th-msg-group th-msg-other"
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
                            {isFirstInGroup && <div className="th-msg-sender">{senderName}</div>}
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
                              {isFirstInGroup
                                ? <div className="th-mini-avatar">{getInitials(senderName)}</div>
                                : <div style={{ width: 40 }} />
                              }
                              <div>
                                <div className="th-bubble-other">{msg.content}</div>
                                <div className="th-time-other">{fmtTime(msg.created_at)}</div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                      <div ref={bottomRef} />
                    </div>

                    <div className="th-chat-input-row">
                      <input
                        className="th-chat-input"
                        value={msgText}
                        onChange={e => setMsgText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                        placeholder="Escribe un mensaje..."
                        disabled={!schoolId}
                      />
                      <button className="th-send-btn" onClick={sendMessage} disabled={!msgText.trim() || sending || !schoolId}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M2.5 9L15.5 2.5L10 15.5L8.5 9.5L2.5 9Z" fill="white" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── TAB 4: PROYECTOS ── */}
              {activeTab === 'projects' && (
                <motion.div key="projects" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                    <button className="th-new-btn" onClick={() => setShowModal(true)}>+ Nuevo proyecto en equipo</button>
                  </div>
                  {projects.length === 0
                    ? <div className="th-empty">No hay proyectos en equipo aún. ¡Crea el primero!</div>
                    : (
                      <div className="th-proj-grid">
                        {projects.map((p, i) => {
                          const isMember = memberIds.includes(p.id)
                          const shown = p.member_names.slice(0, 4)
                          const extra = p.member_count > 4 ? p.member_count - 4 : 0
                          return (
                            <motion.div key={p.id} className="th-proj-card"
                              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 24 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                <span className="th-cat-badge">{p.category}</span>
                                <span className={`th-status-badge ${p.status === 'active' ? 'th-s-active' : 'th-s-done'}`}>
                                  {p.status === 'active' ? 'Activo' : 'Completado'}
                                </span>
                              </div>
                              <h3 className="th-proj-title">{p.title}</h3>
                              <p className="th-proj-desc">{p.description}</p>
                              <div className="th-overlap-avatars">
                                {shown.map((name, j) => (
                                  <div key={j} className="th-mini-av" title={name}>{getInitials(name)}</div>
                                ))}
                                {extra > 0 && <div className="th-mini-av" style={{ background: 'var(--mute)', fontSize: 9 }}>+{extra}</div>}
                              </div>
                              <p className="th-proj-meta">{p.member_count} miembros · Creado por {p.creator_name}</p>
                              {isMember
                                ? <button className="th-view-btn" onClick={() => showToast('info', 'Próximamente')}>Ver proyecto</button>
                                : <button className="th-join-btn" onClick={() => joinProject(p.id)}>Unirse</button>
                              }
                            </motion.div>
                          )
                        })}
                      </div>
                    )
                  }
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── MODAL NUEVO PROYECTO ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="th-modal-bg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
            <motion.div className="th-modal"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
              <h2 className="th-modal-title">Nuevo proyecto en equipo</h2>
              <input className="th-input" placeholder="Título del proyecto *" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <textarea className="th-input th-textarea" placeholder="Descripción..." value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              <select className="th-select" value={newCat} onChange={e => setNewCat(e.target.value)}>
                {PROJECT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="th-create-btn" onClick={createProject} disabled={!newTitle.trim() || creating}>
                {creating ? 'Creando…' : 'Crear proyecto'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function PodiumCard({ r, cls, icon, avatarBg, large }: {
  r: typeof RANKING_DATA[0]
  cls: string
  icon: string
  avatarBg: string
  large?: boolean
}) {
  const size = large ? 52 : 44
  const fontSize = large ? 18 : 16
  const lvl = LEVEL_COLORS[r.level] ?? LEVEL_COLORS.junior
  return (
    <div className={`th-podium-card ${cls}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: large ? 28 : 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ width: size, height: size, borderRadius: '50%', background: avatarBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize, fontWeight: 700, fontFamily: '"Satoshi",sans-serif', marginBottom: 10 }}>
        {getInitials(r.name)}
      </div>
      <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: large ? 900 : 700, fontSize: large ? 16 : 14, color: '#0D0D0D', marginBottom: 4 }}>{r.name}</div>
      <div style={{ fontFamily: 'Inter,sans-serif', fontSize: large ? 14 : 13, color: '#6B6B6B', fontWeight: large ? 600 : 400 }}>{r.xp} XP</div>
      <div style={{ marginTop: 8 }}>
        <span style={{ background: lvl.bg, color: lvl.text, borderRadius: 999, padding: '3px 9px', fontSize: 11, fontFamily: '"Satoshi",sans-serif', fontWeight: 700 }}>{lvl.label}</span>
      </div>
    </div>
  )
}
