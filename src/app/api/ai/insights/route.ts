import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `Eres un analista de datos experto en programas de liderazgo juvenil.
Analiza estos datos del programa Big Family en La Guajira, Colombia y genera insights accionables en español.
Sé específico, usa los números reales, identifica patrones, señala colegios que necesitan atención,
y sugiere acciones concretas para el coordinador.
Responde en formato estructurado usando markdown: ## encabezados, **negrita** para énfasis, - listas.
Máximo 600 palabras.`

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
  }

  let body: { messages: { role: 'user' | 'assistant'; content: string }[]; dataContext: object }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { messages, dataContext } = body
  if (!messages?.length) {
    return NextResponse.json({ error: 'messages requerido' }, { status: 400 })
  }

  try {
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1200,
      system:     `${SYSTEM_PROMPT}\n\nDatos actuales del programa:\n${JSON.stringify(dataContext, null, 2)}`,
      messages,
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    return NextResponse.json({ text })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
