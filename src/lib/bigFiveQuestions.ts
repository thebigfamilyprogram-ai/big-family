// BFI-44 — John & Srivastava (1999) — Dominio público
// Traducido al español en segunda persona con el tono del programa Big Family

export interface BFIQuestion {
  id: number
  text: string
  textJunior?: string  // Lenguaje simplificado para 9-13 años
  dimension: 'O' | 'C' | 'E' | 'A' | 'N'
  reversed: boolean
  track: 'both' | 'senior_only'
}

export const DIMENSION_LABELS: Record<BFIQuestion['dimension'], string> = {
  O: 'APERTURA',
  C: 'RESPONSABILIDAD',
  E: 'EXTROVERSIÓN',
  A: 'AMABILIDAD',
  N: 'ESTABILIDAD EMOCIONAL',
}

// Big Leader Model pillars
export const PILLARS = ['Norte', 'Acción', 'Legado', 'Vínculo', 'Yo'] as const
export type Pillar = typeof PILLARS[number]

// Big Five dimension → Big Leader Model pillar (1:1)
export const DIM_TO_PILLAR: Record<BFIQuestion['dimension'], Pillar> = {
  O: 'Norte',    // Openness → Vision / Purpose
  E: 'Acción',   // Extraversion → Energy / Impact
  N: 'Legado',   // Emotional Stability (inverted) → Resilience / Long-term
  A: 'Vínculo',  // Agreeableness → Connection / Empathy
  C: 'Yo',       // Conscientiousness → Self / Discipline
}

// Pentagon vertex angles (degrees, clockwise from top)
// Norte=top, Acción=top-right, Legado=bottom-right, Vínculo=bottom-left, Yo=top-left
export const PILLAR_ANGLES: Record<Pillar, number> = {
  Norte:  -90,
  Acción: -18,
  Legado:  54,
  Vínculo: 126,
  Yo:      198,
}

export const BFI44: BFIQuestion[] = [
  // ── EXTRAVERSION ──────────────────────────────────────────────────────────────
  {
    id: 1, dimension: 'E', reversed: false, track: 'both',
    text: 'Me veo como alguien que habla mucho con los demás.',
    textJunior: 'Me gusta hablar y conversar con las personas que conozco.',
  },
  {
    id: 6, dimension: 'E', reversed: true, track: 'senior_only',
    text: 'Me veo como alguien reservado/a y callado/a.',
  },
  {
    id: 11, dimension: 'E', reversed: false, track: 'both',
    text: 'Me veo como alguien que tiene mucha energía.',
    textJunior: 'Tengo mucha energía para hacer las cosas.',
  },
  {
    id: 16, dimension: 'E', reversed: false, track: 'both',
    text: 'Me veo como alguien que genera entusiasmo a su alrededor.',
    textJunior: 'Cuando estoy emocionado/a, los demás también se emocionan.',
  },
  {
    id: 21, dimension: 'E', reversed: true, track: 'senior_only',
    text: 'Me veo como alguien que tiende a quedarse callado/a en grupos.',
  },
  {
    id: 26, dimension: 'E', reversed: false, track: 'senior_only',
    text: 'Me veo como alguien con una personalidad asertiva y directa.',
  },
  {
    id: 31, dimension: 'E', reversed: true, track: 'senior_only',
    text: 'Me veo como alguien que a veces es tímido/a o se inhibe en ciertos contextos.',
  },
  {
    id: 36, dimension: 'E', reversed: false, track: 'both',
    text: 'Me veo como alguien sociable y extrovertido/a.',
    textJunior: 'Me gusta conocer gente nueva y estar con grupos de personas.',
  },

  // ── AGREEABLENESS ─────────────────────────────────────────────────────────────
  {
    id: 2, dimension: 'A', reversed: true, track: 'senior_only',
    text: 'Me veo como alguien que tiende a señalar los errores de los demás.',
  },
  {
    id: 7, dimension: 'A', reversed: false, track: 'both',
    text: 'Me veo como alguien que ayuda a los demás sin esperar nada a cambio.',
    textJunior: 'Me gusta ayudar a otros cuando lo necesitan.',
  },
  {
    id: 12, dimension: 'A', reversed: true, track: 'senior_only',
    text: 'Me veo como alguien que puede generar discusiones o conflictos con otros.',
  },
  {
    id: 17, dimension: 'A', reversed: false, track: 'both',
    text: 'Me veo como alguien que tiene facilidad para perdonar.',
    textJunior: 'Cuando alguien me hace algo mal, puedo perdonarlo con el tiempo.',
  },
  {
    id: 22, dimension: 'A', reversed: false, track: 'senior_only',
    text: 'Me veo como alguien que confía en las personas en general.',
  },
  {
    id: 27, dimension: 'A', reversed: true, track: 'senior_only',
    text: 'Me veo como alguien que puede ser frío/a o distante con los demás.',
  },
  {
    id: 32, dimension: 'A', reversed: false, track: 'both',
    text: 'Me veo como alguien considerado/a y amable con casi todos.',
    textJunior: 'Trato de ser amable con todos, no solo con mis amigos cercanos.',
  },
  {
    id: 37, dimension: 'A', reversed: true, track: 'senior_only',
    text: 'Me veo como alguien que a veces puede ser brusco/a o poco delicado/a con otros.',
  },
  {
    id: 42, dimension: 'A', reversed: false, track: 'both',
    text: 'Me veo como alguien que disfruta cooperar y trabajar en equipo.',
    textJunior: 'Me gusta trabajar en equipo con mis compañeros.',
  },

  // ── CONSCIENTIOUSNESS ─────────────────────────────────────────────────────────
  {
    id: 3, dimension: 'C', reversed: false, track: 'both',
    text: 'Me veo como alguien que hace las cosas a fondo y con cuidado.',
    textJunior: 'Cuando hago algo, lo hago bien y con cuidado.',
  },
  {
    id: 8, dimension: 'C', reversed: true, track: 'senior_only',
    text: 'Me veo como alguien que a veces puede ser descuidado/a.',
  },
  {
    id: 13, dimension: 'C', reversed: false, track: 'both',
    text: 'Me veo como una persona de confianza y responsable.',
    textJunior: 'Cuando digo que voy a hacer algo, lo cumplo.',
  },
  {
    id: 18, dimension: 'C', reversed: true, track: 'senior_only',
    text: 'Me veo como alguien que tiende a ser desorganizado/a.',
  },
  {
    id: 23, dimension: 'C', reversed: true, track: 'senior_only',
    text: 'Me veo como alguien que puede ser perezoso/a cuando no quiere hacer algo.',
  },
  {
    id: 28, dimension: 'C', reversed: false, track: 'both',
    text: 'Me veo como alguien que persiste hasta terminar lo que empieza.',
    textJunior: 'Si empiezo una tarea, la termino aunque sea difícil.',
  },
  {
    id: 33, dimension: 'C', reversed: false, track: 'senior_only',
    text: 'Me veo como alguien que hace las cosas de manera eficiente.',
  },
  {
    id: 38, dimension: 'C', reversed: false, track: 'both',
    text: 'Me veo como alguien que hace planes y los sigue hasta el final.',
    textJunior: 'Me gusta organizarme y tener un plan antes de hacer las cosas.',
  },
  {
    id: 43, dimension: 'C', reversed: true, track: 'senior_only',
    text: 'Me veo como alguien que se distrae con facilidad.',
  },

  // ── NEUROTICISM ───────────────────────────────────────────────────────────────
  {
    id: 4, dimension: 'N', reversed: false, track: 'both',
    text: 'Me veo como alguien que a veces se siente deprimido/a o sin ánimo.',
    textJunior: 'A veces me siento triste o sin ganas de nada.',
  },
  {
    id: 9, dimension: 'N', reversed: true, track: 'senior_only',
    text: 'Me veo como alguien relajado/a que maneja bien la presión.',
  },
  {
    id: 14, dimension: 'N', reversed: false, track: 'senior_only',
    text: 'Me veo como alguien que puede ponerse tenso/a con facilidad.',
  },
  {
    id: 19, dimension: 'N', reversed: false, track: 'both',
    text: 'Me veo como alguien que se preocupa mucho por las cosas.',
    textJunior: 'Me preocupo por muchas cosas.',
  },
  {
    id: 24, dimension: 'N', reversed: true, track: 'senior_only',
    text: 'Me veo como alguien emocionalmente estable, que no se altera fácilmente.',
  },
  {
    id: 29, dimension: 'N', reversed: false, track: 'both',
    text: 'Me veo como alguien que puede cambiar mucho de humor.',
    textJunior: 'Mi estado de ánimo cambia mucho a lo largo del día.',
  },
  {
    id: 34, dimension: 'N', reversed: true, track: 'senior_only',
    text: 'Me veo como alguien que mantiene la calma en situaciones tensas.',
  },
  {
    id: 39, dimension: 'N', reversed: false, track: 'both',
    text: 'Me veo como alguien que se pone nervioso/a con facilidad.',
    textJunior: 'Me pongo nervioso/a cuando tengo que hacer algo importante.',
  },

  // ── OPENNESS ──────────────────────────────────────────────────────────────────
  {
    id: 5, dimension: 'O', reversed: false, track: 'both',
    text: 'Me veo como alguien que tiene ideas originales.',
    textJunior: 'Se me ocurren ideas nuevas que a otros no se les habían ocurrido.',
  },
  {
    id: 10, dimension: 'O', reversed: false, track: 'both',
    text: 'Me veo como alguien con curiosidad por muchas cosas diferentes.',
    textJunior: 'Soy curioso/a y me gusta aprender sobre temas distintos.',
  },
  {
    id: 15, dimension: 'O', reversed: false, track: 'senior_only',
    text: 'Me veo como alguien que piensa profundo y es ingenioso/a.',
  },
  {
    id: 20, dimension: 'O', reversed: false, track: 'both',
    text: 'Me veo como alguien con una imaginación activa y vívida.',
    textJunior: 'Tengo mucha imaginación.',
  },
  {
    id: 25, dimension: 'O', reversed: false, track: 'both',
    text: 'Me veo como alguien inventivo/a, lleno/a de ideas nuevas.',
    textJunior: 'Invento cosas o formas de hacer algo de manera diferente.',
  },
  {
    id: 30, dimension: 'O', reversed: false, track: 'senior_only',
    text: 'Me veo como alguien que valora las experiencias artísticas y estéticas.',
  },
  {
    id: 35, dimension: 'O', reversed: true, track: 'senior_only',
    text: 'Me veo como alguien que prefiere el trabajo rutinario y predecible.',
  },
  {
    id: 40, dimension: 'O', reversed: false, track: 'senior_only',
    text: 'Me veo como alguien que disfruta reflexionar y jugar con ideas abstractas.',
  },
  {
    id: 41, dimension: 'O', reversed: true, track: 'senior_only',
    text: 'Me veo como alguien que tiene poco interés en el arte o la música.',
  },
  {
    id: 44, dimension: 'O', reversed: false, track: 'senior_only',
    text: 'Me veo como alguien con buen gusto por el arte, la música o la literatura.',
  },
]

// Returns questions for the given track (senior = all 44, junior = 20)
export function getQuestions(track: 'senior' | 'junior'): BFIQuestion[] {
  if (track === 'senior') return BFI44
  return BFI44.filter(q => q.track === 'both')
}

// Calculates Big Five scores from answers (1-5 scale) → returns 0-100 percentages
export function calcBigFive(
  answers: Record<number, number>,
  track: 'senior' | 'junior'
): { O: number; C: number; E: number; A: number; N: number; ES: number } {
  const questions = getQuestions(track)
  const raw: Record<string, number[]> = { O: [], C: [], E: [], A: [], N: [] }

  for (const q of questions) {
    const val = answers[q.id]
    if (!val) continue
    const score = q.reversed ? 6 - val : val
    raw[q.dimension].push(score)
  }

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 3
  const pct = (arr: number[]) => Math.round((avg(arr) - 1) / 4 * 100)

  const N = pct(raw.N)
  return {
    O:  pct(raw.O),
    C:  pct(raw.C),
    E:  pct(raw.E),
    A:  pct(raw.A),
    N,
    ES: 100 - N,
  }
}

// Determines leadership archetype from top 2 dimensions
export function getArchetype(scores: { O: number; C: number; E: number; A: number; ES: number }): string {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const top = new Set([sorted[0][0], sorted[1][0]])

  if (top.has('O') && top.has('E'))  return 'Líder Visionario/a'
  if (top.has('C') && top.has('A'))  return 'Líder Constructor/a'
  if (top.has('C') && top.has('ES')) return 'Líder Resiliente'
  if (top.has('A') && top.has('E'))  return 'Líder Conector/a'
  if (top.has('O') && top.has('ES')) return 'Líder Estratega'
  return 'Líder Estratega'
}

// Maps Big Five scores to Big Leader Model pillar scores
export function getPillarScores(
  scores: { O: number; C: number; E: number; A: number; ES: number }
): Record<Pillar, number> {
  return {
    Norte:  scores.O,
    Acción: scores.E,
    Legado: scores.ES,
    Vínculo: scores.A,
    Yo:     scores.C,
  }
}

// Pillars scoring >= 60% (strong)
export function getStrengths(pillarScores: Record<Pillar, number>): Pillar[] {
  return (Object.entries(pillarScores) as [Pillar, number][])
    .filter(([, v]) => v >= 60)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
}

// Pillars scoring < 45% (areas to grow)
export function getGrowthAreas(pillarScores: Record<Pillar, number>): Pillar[] {
  return (Object.entries(pillarScores) as [Pillar, number][])
    .filter(([, v]) => v < 45)
    .sort((a, b) => a[1] - b[1])
    .map(([k]) => k)
}
