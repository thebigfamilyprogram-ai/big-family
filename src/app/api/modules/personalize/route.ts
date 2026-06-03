import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const {
    moduleName, modulePilar, arquetipo, track,
  } = await req.json()

  // ANTHROPIC_API_KEY pendiente — retornar mock hasta que llegue
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(getMockPersonalization(arquetipo, modulePilar, track))
  }

  // TODO: descomentar cuando llegue la API key
  /*
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Eres el sistema de personalización del programa The Big Family — Big Leader Model.
        Estudiante: ${track}, arquetipo: ${arquetipo}
        Módulo: ${moduleName} — Pilar: ${modulePilar}
        Genera en JSON exacto sin markdown:
        {
          "intro": "2-3 oraciones personalizadas...",
          "reflexiones": [
            {"pregunta": "...", "placeholder": "..."},
            {"pregunta": "...", "placeholder": "..."},
            {"pregunta": "...", "placeholder": "..."}
          ],
          "entregable_enfoque": "1-2 oraciones...",
          "autoevaluacion": [
            {"pregunta": "...", "escala": "1-4"},
            {"pregunta": "...", "escala": "1-4"},
            {"pregunta": "...", "escala": "1-4"},
            {"pregunta": "...", "escala": "1-4"}
          ]
        }`
      }],
    }),
  })
  const data = await response.json()
  const text = data.content?.[0]?.text ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (match) return NextResponse.json(JSON.parse(match[0]))
  */

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
        pregunta: `¿Cómo aplicarías lo aprendido en este módulo a tu Great Venture?`,
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
