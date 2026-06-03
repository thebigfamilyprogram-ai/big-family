import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'
import {
  calcBigFive,
  getArchetype,
  getPillarScores,
  getStrengths,
  getGrowthAreas,
} from '@/lib/bigFiveQuestions'
import { MOCK_MODE } from '@/lib/mockData'

interface AssessBody {
  answers: Record<number, number>
  track: 'senior' | 'junior'
  name?: string
}

interface ClaudeProfile {
  descripcion: string
  mensaje_bienvenida: string
  fortaleza_principal: string
  reto_principal: string
}

const MOCK_RESULT = {
  arquetipo:           'Líder Visionaria',
  descripcion:         'Tienes una capacidad natural para ver lo que otros no ven. Tu energía y apertura generan movimiento a tu alrededor, y tu capacidad de inspirar es genuina. Eres el tipo de líder que define hacia dónde va el grupo, no quien solo lo sigue.',
  mensaje_bienvenida:  'Valentina, tu manera de conectar ideas con acción es lo que el programa necesita. Tu ruta comienza ahora.',
  fortaleza_principal: 'Tu mayor fortaleza es la capacidad de transformar visiones abstractas en entusiasmo concreto.',
  reto_principal:      'Tu reto es aprender a construir estructuras que sostengan tus ideas cuando la energía inicial se agota.',
  fortalezas:          ['Norte', 'Acción'],
  areas_crecimiento:   ['Yo', 'Vínculo'],
  big_five:            { O: 85, C: 42, E: 78, A: 38, N: 35, ES: 65 },
}

export async function POST(req: NextRequest) {
  // ── MOCK_MODE: skip Anthropic + Supabase entirely ────────────────────────────
  if (MOCK_MODE) {
    return NextResponse.json(MOCK_RESULT)
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // ── Rate limit: 3 requests per hour per user ─────────────────────────────────
  const rl = checkRateLimit(`assess-${user.id}`, 3, 60 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta más tarde.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  // ── Parse request ────────────────────────────────────────────────────────────
  let body: AssessBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { answers, track, name = 'Estudiante' } = body
  if (!answers || !track) {
    return NextResponse.json({ error: 'answers y track son requeridos' }, { status: 400 })
  }
  // Validate that every answer is an integer between 1 and 5
  const validAnswers = typeof answers === 'object' && !Array.isArray(answers) &&
    Object.values(answers).every((v) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5)
  if (!validAnswers) {
    return NextResponse.json({ error: 'Respuestas inválidas' }, { status: 400 })
  }

  // ── Calculate Big Five ───────────────────────────────────────────────────────
  const big5 = calcBigFive(answers, track)
  const { O, C, E, A, ES, N } = big5
  const arquetipo = getArchetype({ O, C, E, A, ES })
  const pillarScores = getPillarScores({ O, C, E, A, ES })
  const fortalezas = getStrengths(pillarScores)
  const areas_crecimiento = getGrowthAreas(pillarScores)

  // ── Call Claude ──────────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
  }

  const ageLabel = track === 'senior' ? '15-18 años' : '9-13 años'
  const prompt = `Eres el sistema de perfil de liderazgo del programa The Big Family.

El estudiante ${name} (${ageLabel}) completó el test Big Five.
Resultados: O:${O}% C:${C}% E:${E}% A:${A}% ES:${ES}%

Arquetipo calculado: ${arquetipo}
Pilares fuertes (Big Leader Model): ${fortalezas.join(', ') || 'Ninguno definitivo aún'}
Pilares a desarrollar: ${areas_crecimiento.join(', ') || 'Ninguno definitivo aún'}

Genera en JSON exacto sin markdown:
{
  "descripcion": "2-3 oraciones sobre quién es como líder, directo y poderoso, en segunda persona",
  "mensaje_bienvenida": "1 oración personalizada que termine con 'Tu ruta comienza ahora.'",
  "fortaleza_principal": "1 oración sobre su fortaleza más distintiva",
  "reto_principal": "1 oración honesta sobre su mayor área de crecimiento"
}
Tono: directo, sin condescendencia, como hablarías con un amigo inteligente.
Lenguaje claro y traducible — el programa es global.`

  let claudeResult: ClaudeProfile
  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 600,
      messages:   [{ role: 'user', content: prompt }],
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Respuesta de Claude no contiene JSON válido')
    claudeResult = JSON.parse(jsonMatch[0]) as ClaudeProfile
  } catch (err) {
    console.error('[assess] Claude error:', err)
    return NextResponse.json({ error: 'Error al generar perfil. Intenta de nuevo.' }, { status: 500 })
  }

  // ── Build result ─────────────────────────────────────────────────────────────
  const result = {
    arquetipo,
    descripcion:         claudeResult.descripcion,
    mensaje_bienvenida:  claudeResult.mensaje_bienvenida,
    fortaleza_principal: claudeResult.fortaleza_principal,
    reto_principal:      claudeResult.reto_principal,
    fortalezas,
    areas_crecimiento,
    big_five: { O, C, E, A, N, ES },
  }

  // ── Save to Supabase ─────────────────────────────────────────────────────────
  const [profileRes, assessRes] = await Promise.all([
    supabase
      .from('profiles')
      .update({ leadership_profile: result, onboarding_completed: true })
      .eq('id', user.id),
    supabase
      .from('leadership_assessments')
      .insert({ user_id: user.id, answers, result }),
  ])

  if (profileRes.error) console.error('[assess] profile update error:', profileRes.error)
  if (assessRes.error)  console.error('[assess] assessment insert error:', assessRes.error)

  return NextResponse.json(result)
}
