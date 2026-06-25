import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { createNotificationBatch } from '@/lib/createNotification'
import { MOCK_MODE } from '@/lib/mockData'

interface CreateEventBody {
  title:                     string
  description?:              string
  event_date:                string
  event_time:                string
  location?:                 string
  meeting_link?:             string
  audience_schools:          string[]
  audience_roles:            string[]
  is_recurring?:             boolean
  recurrence_interval_days?: number
  recurrence_count?:         number
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function POST(req: NextRequest) {
  // ── MOCK_MODE: skip Supabase + Edge Function entirely ────────────────────────
  if (MOCK_MODE) {
    return NextResponse.json({ success: true, event_id: 'mock-event-1', events_created: 1, notified_count: 12 })
  }

  // ── Auth — admin only ─────────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = await createSupabaseAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // ── Rate limit: 20 requests per hour per admin ───────────────────────────────
  const rl = checkRateLimit(`events-create-${user.id}`, 20, 60 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta más tarde.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  // ── Parse + validate ──────────────────────────────────────────────────────────
  let body: CreateEventBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const {
    title, description, event_date, event_time, location, meeting_link,
    audience_schools, audience_roles, is_recurring, recurrence_interval_days,
    recurrence_count,
  } = body

  if (!title?.trim() || !event_date || !event_time || !audience_schools?.length) {
    return NextResponse.json(
      { error: 'title, event_date, event_time y audience_schools son requeridos' },
      { status: 400 },
    )
  }

  const roles = audience_roles?.length ? audience_roles : ['student', 'coordinator']

  // ── Build the list of event dates (1, or N if recurring) ─────────────────────
  const dates = [event_date]
  if (is_recurring && recurrence_interval_days && recurrence_count) {
    for (let i = 1; i < recurrence_count; i++) {
      dates.push(addDays(event_date, recurrence_interval_days * i))
    }
  }

  const basePayload = {
    title: title.trim(),
    description: description?.trim() || null,
    location: location?.trim() || null,
    meeting_link: meeting_link?.trim() || null,
    event_time,
    created_by: user.id,
    audience_schools,
    audience_roles: roles,
    is_recurring: !!is_recurring,
    recurrence_interval_days: is_recurring ? (recurrence_interval_days ?? null) : null,
  }

  const { data: insertedEvents, error: insertError } = await admin
    .from('calendar_events')
    .insert(dates.map(d => ({ ...basePayload, event_date: d })))
    .select('id, event_date')

  if (insertError || !insertedEvents?.length) {
    console.error('[events/create] insert error:', insertError)
    return NextResponse.json({ error: 'Error al crear el evento' }, { status: 500 })
  }

  // ── Resolve audience: profiles matching school + role ────────────────────────
  const { data: recipients } = await admin
    .from('profiles')
    .select('id, email, display_name')
    .in('school_id', audience_schools)
    .in('role', roles)

  const recipientList = recipients ?? []

  // ── Pre-create pending RSVP rows for every event × every recipient ───────────
  if (recipientList.length) {
    const rsvpRows = insertedEvents.flatMap(ev =>
      recipientList.map(r => ({ event_id: ev.id, user_id: r.id, status: 'pending' as const }))
    )
    const { error: rsvpError } = await admin.from('event_rsvps').insert(rsvpRows)
    if (rsvpError) console.error('[events/create] rsvp pre-create error:', rsvpError)
  }

  // ── Notify (in-app) — only for the first event, not every recurring session ──
  const firstEvent = insertedEvents[0]
  if (recipientList.length) {
    await createNotificationBatch(admin, recipientList.map(r => r.id), {
      type: 'event_created',
      title: `Nuevo evento: ${title.trim()}`,
      body: `${event_date} · ${event_time} · ${location || meeting_link || ''}`.trim(),
      link: '/dashboard/calendar',
    })
  }

  // ── Email — fire and forget, never blocks the response ───────────────────────
  const emails = recipientList.map(r => r.email).filter(Boolean)
  if (emails.length) {
    const functionsUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-event-created`
    fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        event_id: firstEvent.id,
        title: title.trim(),
        description,
        event_date,
        event_time,
        location,
        meeting_link,
        recipient_emails: emails,
      }),
    }).catch(err => console.error('[events/create] notify-event-created fetch error:', err))
  }

  return NextResponse.json({
    success: true,
    event_id: firstEvent.id,
    events_created: insertedEvents.length,
    notified_count: recipientList.length,
  })
}
