// Supabase Edge Function — notify-project-status
// Triggered by a Supabase Database Webhook on the projects table (UPDATE events).
//
// Setup in Supabase Dashboard → Database → Webhooks:
//   Table: projects
//   Events: UPDATE
//   URL: https://<project-ref>.supabase.co/functions/v1/notify-project-status
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
    console.log(`[notify-project-status] No RESEND_API_KEY — would send to ${to}: ${subject}`)
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
    console.error(`[notify-project-status] Resend error ${res.status}: ${body}`)
  }
}

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json()

    // Supabase webhook payload shape: { type, table, schema, record, old_record }
    const record     = payload.record     as Record<string, unknown>
    const old_record = payload.old_record as Record<string, unknown> | null

    const newStatus = record?.status as string | undefined
    const oldStatus = old_record?.status as string | undefined

    if (!newStatus || newStatus === oldStatus) {
      return new Response('no-op', { status: 200 })
    }

    const projectId = record.id as string
    const userId    = record.user_id as string
    const schoolId  = record.school_id as string | null

    // ── Project submitted (pending) → notify coordinator ─────────────────────
    if (newStatus === 'pending') {
      if (!schoolId) return new Response('no school_id', { status: 200 })

      // Find coordinator(s) for this school
      const { data: coordinators } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('school_id', schoolId)
        .eq('role', 'coordinator')

      if (!coordinators?.length) return new Response('no coordinators', { status: 200 })

      // Get student name and project title
      const [{ data: student }, { data: school }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
        supabase.from('schools').select('name').eq('id', schoolId).maybeSingle(),
      ])

      const projectTitle = (record.title as string) ?? 'Sin título'
      const studentName  = student?.full_name ?? 'Un estudiante'
      const schoolName   = (school as { name: string } | null)?.name ?? 'tu colegio'

      for (const coord of coordinators) {
        if (!coord.email) continue
        await sendEmail(
          coord.email,
          `Nuevo proyecto para revisar — ${projectTitle}`,
          `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
            <h2 style="color:#0D0D0D;margin-bottom:8px;">Nuevo proyecto enviado</h2>
            <p style="color:#6B6B6B;line-height:1.6;margin-bottom:24px;">
              <strong>${studentName}</strong> de <strong>${schoolName}</strong> ha enviado su proyecto
              <em>"${projectTitle}"</em> para revisión.
            </p>
            <a href="https://big-family-nu.vercel.app/coordinator/projects"
               style="display:inline-block;padding:12px 28px;background:#C0392B;color:#fff;border-radius:999px;text-decoration:none;font-weight:700;font-size:15px;">
              Revisar proyecto →
            </a>
            <p style="color:#9a9690;font-size:12px;margin-top:32px;">Big Family · The Big Leader Program</p>
          </div>
          `,
        )
      }
    }

    // ── Project approved/rejected → notify student ────────────────────────────
    if (newStatus === 'approved' || newStatus === 'rejected') {
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .maybeSingle()

      if (!studentProfile?.email) return new Response('no student email', { status: 200 })

      const projectTitle    = (record.title as string) ?? 'Sin título'
      const rejectionReason = record.rejection_reason as string | null
      const isApproved      = newStatus === 'approved'

      await sendEmail(
        studentProfile.email,
        isApproved
          ? `¡Tu proyecto fue aprobado! — ${projectTitle}`
          : `Tu proyecto necesita cambios — ${projectTitle}`,
        `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
          <h2 style="color:${isApproved ? '#065F46' : '#991B1B'};margin-bottom:8px;">
            ${isApproved ? '✓ Proyecto aprobado' : 'Proyecto devuelto para revisión'}
          </h2>
          <p style="color:#6B6B6B;line-height:1.6;margin-bottom:${rejectionReason ? '8px' : '24px'};">
            Tu proyecto <em>"${projectTitle}"</em> ha sido <strong>${isApproved ? 'aprobado' : 'devuelto'}</strong>
            por tu coordinador.
          </p>
          ${rejectionReason ? `
          <div style="padding:14px 18px;background:#FEE2E2;border-radius:10px;margin-bottom:24px;color:#991B1B;font-size:14px;line-height:1.6;">
            <strong>Motivo:</strong> ${rejectionReason}
          </div>
          ` : ''}
          <a href="https://big-family-nu.vercel.app/dashboard/projects"
             style="display:inline-block;padding:12px 28px;background:${isApproved ? '#065F46' : '#C0392B'};color:#fff;border-radius:999px;text-decoration:none;font-weight:700;font-size:15px;">
            ${isApproved ? 'Ver mis proyectos →' : 'Editar y reenviar →'}
          </a>
          <p style="color:#9a9690;font-size:12px;margin-top:32px;">Big Family · The Big Leader Program</p>
        </div>
        `,
      )
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('[notify-project-status] error:', err)
    return new Response(String(err), { status: 500 })
  }
})
