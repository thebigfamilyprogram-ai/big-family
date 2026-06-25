'use client'

export const dynamic = 'force-dynamic'

import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { m } from 'framer-motion'

import SchoolTicker from '@/components/SchoolTicker'
import WorldMapPublic from '@/components/WorldMapPublic'
import AlumniSection from '@/components/AlumniSection'
import { createClient } from '@/lib/supabase'
import { MOCK_MODE } from '@/lib/mockData'

export default function RedPage() {
  const t = useTranslations()

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const [featuredStories, setFeaturedStories] = useState<{ id: string; title: string; story: string; cover_url: string | null; student_name: string | null; school_name: string | null }[]>([])

  useEffect(() => {
    if (MOCK_MODE) { setFeaturedStories([]); return }
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const sb = supabaseRef.current
    if (!sb) return
    async function loadStories() {
      const { data: rows } = await sb!.from('success_stories').select('id, title, story, cover_url, published_at, student_id, school_id').eq('published', true).order('published_at', { ascending: false }).limit(3)
      if (!rows || rows.length === 0) return
      const userIds   = rows.map((r: { student_id: string }) => r.student_id)
      const schoolIds = rows.map((r: { school_id: string | null }) => r.school_id).filter(Boolean) as string[]
      const [{ data: profiles }, { data: schools }] = await Promise.all([
        sb!.from('profiles').select('id, display_name').in('id', userIds),
        schoolIds.length ? sb!.from('schools').select('id, name').in('id', schoolIds) : Promise.resolve({ data: [] }),
      ])
      const pMap: Record<string, string> = {}
      profiles?.forEach((p: { id: string; display_name: string | null }) => { pMap[p.id] = p.display_name ?? '' })
      const sMap: Record<string, string> = {}
      schools?.forEach((s: { id: string; name: string }) => { sMap[s.id] = s.name })
      setFeaturedStories(rows.map((r: { id: string; title: string; story: string; cover_url: string | null; student_id: string; school_id: string | null }) => ({ id: r.id, title: r.title, story: r.story, cover_url: r.cover_url, student_name: pMap[r.student_id] ?? null, school_name: r.school_id ? (sMap[r.school_id] ?? null) : null })))
    }
    loadStories()
  }, [])

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — NUESTRA RED
      ══════════════════════════════════════════════════════════════════ */}
      <SchoolTicker />

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — ALIANZAS GLOBALES
      ══════════════════════════════════════════════════════════════════ */}
      <WorldMapPublic />

      {/* ══════════════════════════════════════════════════════════════════
          SECCIÓN — ALUMNI
      ══════════════════════════════════════════════════════════════════ */}
      <AlumniSection />

      {/* ══════════════════════════════════════════════════════════════════
          HISTORIAS DE ÉXITO
      ══════════════════════════════════════════════════════════════════ */}
      {featuredStories.length > 0 && (
        <section style={{ padding: '100px 40px', background: 'var(--bg,#F5F3EF)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 140, damping: 20 }}
              style={{ textAlign: 'center', marginBottom: 48 }}
            >
              <div style={{ fontFamily: '"Satoshi",sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#C0392B', marginBottom: 14 }}>{t('landing.successStoriesSection.eyebrow')}</div>
              <h2 style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 900, fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-.025em', color: 'var(--ink,#0D0D0D)', marginBottom: 12 }}>{t('successStories.title')}</h2>
              <p style={{ fontSize: 15, color: 'var(--mute,#6B6B6B)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>{t('landing.successStoriesSection.subtitle')}</p>
            </m.div>

            <m.div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 140, damping: 20 }}
            >
              {featuredStories.map((s, i) => (
                <m.a
                  key={s.id}
                  href={`/success-stories/${s.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20, delay: i * 0.08 }}
                  whileHover={{ y: -4 }}
                  style={{ display: 'block', textDecoration: 'none', background: '#fff', border: '1px solid rgba(13,13,13,.07)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px -4px rgba(13,13,13,.08)' }}
                >
                  {s.cover_url
                    ? <img src={s.cover_url} alt={s.title} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                    : <div style={{ width: '100%', height: 110, background: 'linear-gradient(135deg,#C0392B,#8B1A1A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2l1.8 4.9H18l-4.1 3 1.5 4.9L12 12.2l-3.4 2.6L10 9.9 5.9 6.9H11L12 2Z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                      </div>
                  }
                  <div style={{ padding: '16px 18px 18px' }}>
                    <div style={{ fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15.5, color: '#0D0D0D', marginBottom: 6, lineHeight: 1.3 }}>{s.title}</div>
                    <div style={{ fontSize: 13, color: '#4a4a4a', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 10 } as CSSProperties}>{s.story}</div>
                    <div style={{ fontSize: 12, color: '#9a9690' }}>
                      {s.student_name && <span style={{ fontWeight: 600 }}>{s.student_name}</span>}
                      {s.school_name && <span style={{ marginLeft: 6 }}>· {s.school_name}</span>}
                    </div>
                  </div>
                </m.a>
              ))}
            </m.div>

            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <a href="/success-stories" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 24px', border: '1.5px solid rgba(13,13,13,.14)', borderRadius: 999, fontFamily: '"Satoshi",sans-serif', fontWeight: 600, fontSize: 14, color: 'var(--ink,#0D0D0D)', textDecoration: 'none', transition: 'all .2s' }}>
                {t('landing.successStoriesSection.viewAllBtn')}
              </a>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
