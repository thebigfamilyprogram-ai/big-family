'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE, MOCK } from '@/lib/mockData'
import { showToast } from '@/components/Toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Suggestion {
  id:          string
  category:    'bug' | 'idea' | 'queja' | 'otro'
  message:     string
  page_url:    string | null
  status:      'pending' | 'reviewed' | 'resolved' | 'dismissed'
  admin_notes: string | null
  created_at:  string
  user_name:   string | null
}

type FilterCat    = 'all' | 'bug' | 'idea' | 'queja' | 'otro'
type FilterStatus = 'all' | 'pending' | 'reviewed' | 'resolved' | 'dismissed'

interface Props {
  role: 'coordinator' | 'admin'
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

const CAT_COLOR: Record<string, string> = {
  bug:   '#C0392B',
  idea:  'var(--accent-teal,#0F7B6C)',
  queja: 'var(--accent-amber,#D4821A)',
  otro:  'var(--mute,#6B6B6B)',
}

const STATUS_COLOR: Record<string, string> = {
  pending:   'var(--accent-amber,#D4821A)',
  reviewed:  'var(--accent-blue,#3B82F6)',
  resolved:  '#22c55e',
  dismissed: 'var(--mute,#6B6B6B)',
}

function ColorBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      padding:      '2px 8px',
      borderRadius: 999,
      fontSize:     11,
      fontWeight:   700,
      fontFamily:   'Satoshi,sans-serif',
      background:   `${color}18`,
      color,
      border:       `1px solid ${color}40`,
      whiteSpace:   'nowrap',
    }}>
      {label}
    </span>
  )
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 60)   return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24)  return `hace ${hours}h`
  const days  = Math.floor(hours / 24)
  if (days < 30)   return `hace ${days}d`
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

const PAGE_SIZE = 20

// ── Component ─────────────────────────────────────────────────────────────────

export default function SuggestionsPanel({ role: _role }: Props) {
  const t = useTranslations('suggestions')

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filterCat,   setFilterCat]   = useState<FilterCat>('all')
  const [filterStatus,setFilterStatus]= useState<FilterStatus>('all')
  const [page,        setPage]        = useState(0)
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [adminNotes,  setAdminNotes]  = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        if (MOCK_MODE) {
          const mockSuggestions = (MOCK.suggestions as unknown as Suggestion[])
          setSuggestions(mockSuggestions)
          return
        }

        if (!supabaseRef.current) supabaseRef.current = createClient()
        const sb = supabaseRef.current
        if (!sb) return

        const { data, error } = await sb
          .from('suggestions')
          .select(`
            id, category, message, page_url, status, admin_notes, created_at,
            profiles!suggestions_user_id_fkey(display_name)
          `)
          .order('created_at', { ascending: false })

        if (error) throw error

        setSuggestions(
          (data ?? []).map((row: {
            id: string; category: string; message: string; page_url: string | null;
            status: string; admin_notes: string | null; created_at: string;
            profiles: { display_name: string | null } | null
          }) => ({
            id:          row.id,
            category:    row.category as Suggestion['category'],
            message:     row.message,
            page_url:    row.page_url,
            status:      row.status as Suggestion['status'],
            admin_notes: row.admin_notes,
            created_at:  row.created_at,
            user_name:   row.profiles?.display_name ?? null,
          }))
        )
      } catch {
        showToast('error', 'Error al cargar sugerencias')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function updateStatus(id: string, newStatus: Suggestion['status'], notes?: string) {
    if (MOCK_MODE) {
      setSuggestions(prev => prev.map(s =>
        s.id === id ? { ...s, status: newStatus, admin_notes: notes ?? s.admin_notes } : s
      ))
      setEditingId(null)
      showToast('success', 'Estado actualizado')
      return
    }

    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return

    const update: Record<string, string | null> = {
      status:      newStatus,
      admin_notes: notes ?? null,
    }
    if (newStatus === 'resolved') update.resolved_at = new Date().toISOString()

    const { error } = await sb.from('suggestions').update(update).eq('id', id)
    if (error) { showToast('error', 'Error al actualizar'); return }

    setSuggestions(prev => prev.map(s =>
      s.id === id ? { ...s, status: newStatus, admin_notes: notes ?? s.admin_notes } : s
    ))
    setEditingId(null)
    showToast('success', 'Estado actualizado')
  }

  // Filtering + pagination
  const filtered = suggestions.filter(s => {
    if (filterCat    !== 'all' && s.category !== filterCat)    return false
    if (filterStatus !== 'all' && s.status   !== filterStatus) return false
    return true
  })
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const visible    = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const CATS:    FilterCat[]    = ['all', 'bug', 'idea', 'queja', 'otro']
  const STATUSES: FilterStatus[] = ['all', 'pending', 'reviewed', 'resolved', 'dismissed']

  function FilterPill<T extends string>({ value, active, onSelect, label }: { value: T; active: boolean; onSelect: (v: T) => void; label: string }) {
    return (
      <button
        onClick={() => { onSelect(value); setPage(0) }}
        style={{
          padding:      '4px 12px',
          borderRadius: 999,
          fontSize:     12,
          fontWeight:   600,
          fontFamily:   'Satoshi,sans-serif',
          cursor:       'pointer',
          background:   active ? 'var(--text,#1A1A1A)' : 'var(--surface-2,#F7F7F7)',
          color:        active ? 'var(--surface,#fff)'  : 'var(--mute,#6B6B6B)',
          border:       active ? '1.5px solid var(--text,#1A1A1A)' : '1.5px solid var(--border,#E5E5E5)',
          transition:   'all 0.15s ease',
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', minWidth: 0 }}>
      {/* Title */}
      <h1 style={{ fontFamily: 'Satoshi,sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--text,#1A1A1A)', marginBottom: 4 }}>
        {t('panelTitle')}
      </h1>
      <p style={{ fontSize: 13, color: 'var(--mute,#6B6B6B)', marginBottom: 24, fontFamily: 'Satoshi,sans-serif' }}>
        {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {CATS.map(c => (
          <FilterPill key={c} value={c} active={filterCat === c} onSelect={setFilterCat}
            label={c === 'all' ? t('filterAll') : t(`categories.${c}`)} />
        ))}
        <span style={{ width: 1, height: 24, background: 'var(--border,#E5E5E5)', alignSelf: 'center', margin: '0 4px' }} />
        {STATUSES.map(s => (
          <FilterPill key={s} value={s} active={filterStatus === s} onSelect={setFilterStatus}
            label={s === 'all' ? t('filterAll') : t(`status.${s}`)} />
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ color: 'var(--mute,#6B6B6B)', fontFamily: 'Satoshi,sans-serif', fontSize: 14 }}>
          Cargando…
        </div>
      )}

      {/* Empty */}
      {!loading && visible.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: 'var(--mute,#6B6B6B)',
          fontFamily: 'Satoshi,sans-serif', fontSize: 14,
        }}>
          {t('empty')}
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.map(s => (
          <div key={s.id} style={{
            background:   'var(--surface,#fff)',
            border:       '1.5px solid var(--border,#E5E5E5)',
            borderRadius: 12,
            padding:      '16px 20px',
          }}>
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <ColorBadge label={t(`categories.${s.category}`)} color={CAT_COLOR[s.category]} />
              <ColorBadge label={t(`status.${s.status}`)}       color={STATUS_COLOR[s.status]} />
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--mute,#6B6B6B)', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap' }}>
                {relativeDate(s.created_at)}
              </span>
            </div>

            {/* Message */}
            <p style={{ fontSize: 14, color: 'var(--text,#1A1A1A)', fontFamily: 'Satoshi,sans-serif', lineHeight: 1.5, marginBottom: 8 }}>
              {s.message}
            </p>

            {/* Meta */}
            <div style={{ fontSize: 11, color: 'var(--mute,#6B6B6B)', fontFamily: 'Satoshi,sans-serif', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {s.user_name && <span>{t('student')}: <strong>{s.user_name}</strong></span>}
              {s.page_url  && <span>{t('page')}: <code style={{ fontSize: 11 }}>{s.page_url}</code></span>}
            </div>

            {/* Admin notes display */}
            {s.admin_notes && editingId !== s.id && (
              <div style={{
                marginTop:    10,
                padding:      '8px 12px',
                borderRadius: 8,
                background:   'var(--surface-2,#F7F7F7)',
                fontSize:     12,
                color:        'var(--text,#1A1A1A)',
                fontFamily:   'Satoshi,sans-serif',
              }}>
                <strong>{t('notes')}:</strong> {s.admin_notes}
              </div>
            )}

            {/* Edit notes inline */}
            {editingId === s.id && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder={t('notes')}
                  rows={2}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: '1.5px solid var(--border,#E5E5E5)', background: 'var(--surface-2,#F7F7F7)',
                    color: 'var(--text,#1A1A1A)', fontFamily: 'Satoshi,sans-serif', fontSize: 13,
                    resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent,#C0392B)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border,#E5E5E5)' }}
                />
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {(['reviewed', 'resolved', 'dismissed'] as Suggestion['status'][]).map(st => (
                s.status !== st && (
                  <ActionBtn key={st} label={t(`status.${st}`)} color={STATUS_COLOR[st]}
                    onClick={() => {
                      if (editingId === s.id) {
                        updateStatus(s.id, st, adminNotes)
                      } else {
                        updateStatus(s.id, st)
                      }
                    }}
                  />
                )
              ))}
              {s.status !== 'pending' && (
                <ActionBtn label={t('status.pending')} color={STATUS_COLOR['pending']}
                  onClick={() => updateStatus(s.id, 'pending')}
                />
              )}
              <button
                onClick={() => {
                  if (editingId === s.id) { setEditingId(null) }
                  else { setEditingId(s.id); setAdminNotes(s.admin_notes ?? '') }
                }}
                style={{
                  marginLeft: 'auto', padding: '4px 10px', borderRadius: 6,
                  fontSize: 11, fontWeight: 600, fontFamily: 'Satoshi,sans-serif',
                  background: 'var(--surface-2,#F7F7F7)', color: 'var(--mute,#6B6B6B)',
                  border: '1px solid var(--border,#E5E5E5)', cursor: 'pointer',
                }}
              >
                {editingId === s.id ? t('save') : t('notes')} ✏️
              </button>
              {editingId === s.id && (
                <button
                  onClick={() => updateStatus(s.id, s.status, adminNotes)}
                  style={{
                    padding: '4px 12px', borderRadius: 6,
                    fontSize: 11, fontWeight: 700, fontFamily: 'Satoshi,sans-serif',
                    background: '#C0392B', color: '#fff', border: 'none', cursor: 'pointer',
                  }}
                >
                  {t('save')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={paginationBtnStyle(page === 0)}>← Anterior</button>
          <span style={{ fontSize: 13, color: 'var(--mute,#6B6B6B)', fontFamily: 'Satoshi,sans-serif', alignSelf: 'center' }}>
            {page + 1} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            style={paginationBtnStyle(page === totalPages - 1)}>Siguiente →</button>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, fontFamily: 'Satoshi,sans-serif',
      background: `${color}14`, color, border: `1px solid ${color}40`, cursor: 'pointer',
    }}>
      {label}
    </button>
  )
}

function paginationBtnStyle(disabled: boolean) {
  return {
    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    fontFamily: 'Satoshi,sans-serif', cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? 'var(--surface-2,#F7F7F7)' : 'var(--surface,#fff)',
    color: disabled ? 'var(--border,#E5E5E5)' : 'var(--text,#1A1A1A)',
    border: '1.5px solid var(--border,#E5E5E5)',
  }
}
