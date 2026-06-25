import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { MOCK_MODE } from '@/lib/mockData'

interface RsvpBody {
  event_id: string
  status:   'confirmed' | 'declined'
}

export async function POST(req: NextRequest) {
  if (MOCK_MODE) {
    return NextResponse.json({ success: true, status: 'confirmed' })
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: RsvpBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { event_id, status } = body
  if (!event_id || !['confirmed', 'declined'].includes(status)) {
    return NextResponse.json({ error: 'event_id y status válido son requeridos' }, { status: 400 })
  }

  const { error } = await supabase
    .from('event_rsvps')
    .upsert(
      { event_id, user_id: user.id, status, responded_at: new Date().toISOString() },
      { onConflict: 'event_id,user_id' },
    )

  if (error) {
    console.error('[events/rsvp] upsert error:', error)
    return NextResponse.json({ error: 'Error al registrar tu respuesta' }, { status: 500 })
  }

  return NextResponse.json({ success: true, status })
}
