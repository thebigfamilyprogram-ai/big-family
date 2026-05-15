'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { showToast } from '@/components/Toast'

declare global {
  interface Window {
    YT: {
      Player: new (id: string, opts: object) => YTPlayer
      PlayerState: { PLAYING: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

interface YTPlayer {
  getCurrentTime: () => number
  getDuration: () => number
  pauseVideo: () => void
  destroy: () => void
}

interface Props {
  videoUrl: string
  moduleId: string
  userId: string
}

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
  return m?.[1] ?? null
}

export default function VideoPlayer({ videoUrl, moduleId, userId }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const playerRef    = useRef<YTPlayer | null>(null)
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const isPlayingRef = useRef(false)
  const tabSwitchRef = useRef(0)

  const [watchedPct,  setWatchedPct]  = useState(0)
  const [playerReady, setPlayerReady] = useState(false)

  const videoId = extractVideoId(videoUrl)

  // Load saved progress
  useEffect(() => {
    supabase
      .from('video_progress')
      .select('watched_percentage')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .maybeSingle()
      .then(({ data }) => { if (data) setWatchedPct(data.watched_percentage ?? 0) })
  }, [userId, moduleId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Init YouTube IFrame API
  useEffect(() => {
    if (!videoId) return

    function initPlayer() {
      if (playerRef.current) return
      playerRef.current = new window.YT.Player('yt-player', {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => setPlayerReady(true),
          onStateChange: (e: { data: number }) => {
            isPlayingRef.current = e.data === 1
          },
        },
      })
    }

    if (window.YT?.Player) {
      initPlayer()
    } else {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { prev?.(); initPlayer() }
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [videoId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save progress every 5 s
  useEffect(() => {
    if (!playerReady) return
    intervalRef.current = setInterval(async () => {
      const p = playerRef.current
      if (!p) return
      const cur = p.getCurrentTime()
      const dur = p.getDuration()
      if (!dur) return
      const pct = Math.min(100, Math.floor((cur / dur) * 100))
      setWatchedPct(prev => Math.max(prev, pct))
      await supabase.from('video_progress').upsert(
        { user_id: userId, module_id: moduleId,
          watched_percentage: pct,
          last_position_seconds: Math.floor(cur),
          completed: pct >= 80 },
        { onConflict: 'user_id,module_id' }
      )
    }, 5000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playerReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Anti-cheat: pause on tab switch
  useEffect(() => {
    function onVisibility() {
      if (document.hidden && isPlayingRef.current) {
        playerRef.current?.pauseVideo()
        tabSwitchRef.current += 1
        localStorage.setItem('tab_switches_video', String(tabSwitchRef.current))
        showToast('warning', '⚠ï¸ Saliste de la página — el video se pausó')
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const canProceed = watchedPct >= 80

  return (
    <div>
      {videoId ? (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 14, overflow: 'hidden', background: '#000' }}>
          <div
            id="yt-player"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          />
        </div>
      ) : (
        <div style={{ aspectRatio: '16/9', background: '#f0ede8', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9a9690', fontSize: 14 }}>
          Video no disponible
        </div>
      )}

      {/* Progress bar */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#6B6B6B' }}>
            Has visto el{' '}
            <strong style={{ color: canProceed ? '#16a34a' : '#0D0D0D' }}>{watchedPct}%</strong>
            {' '}del video
          </span>
          {canProceed && (
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ Listo para el cuestionario</span>
          )}
        </div>
        <div style={{ height: 4, background: '#f0ede8', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${watchedPct}%`, background: '#C0392B', borderRadius: 999, transition: 'width .6s ease' }} />
        </div>
      </div>

      {/* Quiz button */}
      <div style={{ marginTop: 22 }}>
        {canProceed ? (
          <button
            onClick={() => router.push(`/dashboard/modules/${moduleId}/quiz`)}
            style={{ width: '100%', padding: '14px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 999, fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
            onMouseOver={e => (e.currentTarget.style.background = '#a93226')}
            onMouseOut={e => (e.currentTarget.style.background = '#C0392B')}
          >
            Ir al cuestionario →
          </button>
        ) : (
          <div>
            <button
              disabled
              style={{ width: '100%', padding: '14px', background: '#e8e4df', color: '#b0ada8', border: 'none', borderRadius: 999, fontFamily: '"Satoshi",sans-serif', fontWeight: 700, fontSize: 15, cursor: 'not-allowed' }}
            >
              Ir al cuestionario
            </button>
            <p style={{ marginTop: 8, fontSize: 12, color: '#9a9690', textAlign: 'center' }}>
              Debes ver al menos el 80% del video para continuar
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
