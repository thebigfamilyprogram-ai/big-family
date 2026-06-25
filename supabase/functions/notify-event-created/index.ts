// Supabase Edge Function — notify-event-created
// Invoked DIRECTLY via fetch() from src/app/api/events/create/route.ts —
// NOT a database webhook (unlike notify-project-status / notify-module-published).
// The Route Handler already resolved the recipient list server-side, so this
// function just sends email — it does not query `profiles` again.
//
// Required secrets (supabase secrets set):
//   RESEND_API_KEY   (optional — falls back to console log if not set)

interface EventPayload {
  event_id:         string
  title:            string
  description?:     string | null
  event_date:       string
  event_time?:      string | null
  location?:        string | null
  meeting_link?:    string | null
  recipient_emails: string[]
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.log(`[notify-event-created] No RESEND_API_KEY — would send to ${to}: ${subject}`)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: 'Big Family <no-reply@bigfamily.edu.co>',
      to: [to],
      subject,
      html,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error(`[notify-event-created] Resend error ${res.status}: ${body}`)
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json() as EventPayload
    const {
      title, description, event_date, event_time,
      location, meeting_link, recipient_emails,
    } = payload

    if (!title || !event_date || !recipient_emails?.length) {
      return new Response('missing required fields', { status: 400 })
    }

    const whenLine = [formatDate(event_date), event_time].filter(Boolean).join(' · ')
    const whereLine = [location, meeting_link].filter(Boolean).join(' · ')

    const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#0D0D0D;margin-bottom:8px;">Nuevo evento: ${title}</h2>
      <p style="color:#6B6B6B;line-height:1.6;margin-bottom:8px;"><strong>${whenLine}</strong></p>
      ${whereLine ? `<p style="color:#6B6B6B;line-height:1.6;margin-bottom:16px;">${whereLine}</p>` : ''}
      ${description ? `<p style="color:#6B6B6B;line-height:1.6;margin-bottom:24px;">${description}</p>` : ''}
      <a href="https://big-family-nu.vercel.app/dashboard/calendar"
         style="display:inline-block;padding:12px 28px;background:#C0392B;color:#fff;border-radius:999px;text-decoration:none;font-weight:700;font-size:15px;">
        Ver evento →
      </a>
      <p style="color:#9a9690;font-size:12px;margin-top:32px;">Big Family · The Big Leader Program</p>
    </div>
    `

    let sent = 0
    for (const email of recipient_emails) {
      if (!email) continue
      await sendEmail(email, `Nuevo evento: ${title}`, html)
      sent++
    }

    return new Response(JSON.stringify({ ok: true, sent }), { status: 200 })
  } catch (err) {
    console.error('[notify-event-created] error:', err)
    return new Response(String(err), { status: 500 })
  }
})
