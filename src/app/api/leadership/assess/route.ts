import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import {
  calcBigFive,
  getArchetype,
  getPillarScores,
  getStrengths,
  getGrowthAreas,
} from '@/lib/bigFiveQuestions'

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

export async function POST(req: NextRequest) {
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
    const msg = err instanceof Error ? err.message : 'Error al generar perfil'
    return NextResponse.json({ error: msg }, { status: 500 })
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
