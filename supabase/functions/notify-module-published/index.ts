// Supabase Edge Function — notify-module-published
// Triggered by a Supabase Database Webhook on the modules table (UPDATE events).
//
// Setup in Supabase Dashboard → Database → Webhooks:
//   Table: modules
//   Events: UPDATE
//   URL: https://<project-ref>.supabase.co/functions/v1/notify-module-published
//   Headers: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
//
// Required secrets (supabase secrets set):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   RESEND_API_KEY   (optional — falls back to console log if not set)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.log(`[notify-module-published] No RESEND_API_KEY — would send to ${to}: ${subject}`)
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
    console.error(`[notify-module-published] Resend error ${res.status}: ${body}`)
  }
}

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json()

    const record     = payload.record     as Record<string, unknown>
    const old_record = payload.old_record as Record<string, unknown> | null

    const newStatus = record?.status as string | undefined
    const oldStatus = old_record?.status as string | undefined

    // Only fire when transitioning specifically to 'published'
    if (newStatus !== 'published' || oldStatus === 'published') {
      return new Response('no-op', { status: 200 })
    }

    const createdBy   = record.created_by as string | undefined
    const moduleTitle = (record.title as string) ?? 'Sin título'

    if (!createdBy) return new Response('no created_by', { status: 200 })

    const { data: expositor } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', createdBy)
      .maybeSingle()

    if (!expositor?.email) return new Response('no expositor email', { status: 200 })

    await sendEmail(
      expositor.email,
      `Tu módulo fue publicado — ${moduleTitle}`,
      `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
        <h2 style="color:#065F46;margin-bottom:8px;">✓ Módulo publicado</h2>
        <p style="color:#6B6B6B;line-height:1.6;margin-bottom:24px;">
          Hola <strong>${expositor.full_name ?? 'expositor'}</strong>, tu módulo
          <em>"${moduleTitle}"</em> ha sido revisado y está ahora <strong>publicado</strong>
          para todos los estudiantes de la plataforma Big Family.
        </p>
        <a href="https://big-family-nu.vercel.app/expositor"
           style="display:inline-block;padding:12px 28px;background:#065F46;color:#fff;border-radius:999px;text-decoration:none;font-weight:700;font-size:15px;">
          Ver mis módulos →
        </a>
        <p style="color:#9a9690;font-size:12px;margin-top:32px;">Big Family · The Big Leader Program</p>
      </div>
      `,
    )

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('[notify-module-published] error:', err)
    return new Response(String(err), { status: 500 })
  }
})
