import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { MOCK_MODE } from '@/lib/mockData'

export async function POST(req: NextRequest) {
  // ── MOCK_MODE bypass ─────────────────────────────────────────────────────────
  if (MOCK_MODE) {
    const body = await req.json().catch(() => ({}))
    return NextResponse.json(getMockPersonalization(body.arquetipo ?? '—', body.modulePilar ?? '—', body.track ?? 'senior'))
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // ── Rate limit: 20 requests per hour per user ────────────────────────────────
  const rl = checkRateLimit(`personalize-${user.id}`, 20, 60 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta más tarde.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  // ── Parse ────────────────────────────────────────────────────────────────────
  let moduleName: string, modulePilar: string, arquetipo: string, track: string
  try {
    const body = await req.json()
    moduleName = body.moduleName ?? ''
    modulePilar = body.modulePilar ?? ''
    arquetipo = body.arquetipo ?? ''
    track = body.track ?? 'senior'
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  // ANTHROPIC_API_KEY pendiente — retornar mock hasta que llegue
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(getMockPersonalization(arquetipo, modulePilar, track))
  }

  // TODO: descomentar cuando llegue la API key — ver comentario en assess/route.ts

  return NextResponse.json(getMockPersonalization(arquetipo, modulePilar, track))
}

function getMockPersonalization(
  arquetipo: string,
  pilar: string,
  track: string,
) {
  const esFortaleza = ['Norte', 'Acción'].includes(pilar)
  const esJunior    = track === 'junior'

  return {
    intro: `Como ${arquetipo}, este módulo sobre ${pilar} es ${
      esFortaleza
        ? 'una oportunidad de profundizar tu fortaleza natural'
        : 'tu mayor área de crecimiento en el programa'
    }. ${esJunior ? 'Tómate tu tiempo con cada actividad.' : 'Conecta cada concepto con tu proyecto de liderazgo.'} Presta especial atención a cómo cada idea transforma tu manera de liderar desde La Guajira.`,
    reflexiones: [
      {
        pregunta: esFortaleza
          ? `¿Cómo has aplicado ${pilar} en tu vida sin darte cuenta?`
          : `¿Qué te ha impedido desarrollar ${pilar} hasta ahora?`,
        placeholder: 'Escribe tu reflexión aquí...',
      },
      {
        pregunta: `¿Qué persona en tu equipo de poder puede ayudarte a fortalecer ${pilar}?`,
        placeholder: 'Piensa en alguien específico...',
      },
      {
        pregunta: '¿Cómo aplicarías lo aprendido en este módulo a tu Great Venture?',
        placeholder: 'Conecta con tu meta núcleo...',
      },
    ],
    entregable_enfoque: `Para tu perfil de ${arquetipo}, enfoca tu entregable en cómo ${pilar} se manifiesta en el contexto específico de tu comunidad en La Guajira.`,
    autoevaluacion: [
      { pregunta: `¿Qué tan claro está para mí el concepto de ${pilar}?`,          escala: '1-4' },
      { pregunta: '¿Puedo aplicar esto en mi proyecto esta semana?',                escala: '1-4' },
      { pregunta: '¿Qué tan cómodo me siento liderando desde este pilar?',         escala: '1-4' },
      { pregunta: '¿Qué tanto ha cambiado mi perspectiva después de este módulo?', escala: '1-4' },
    ],
  }
}
