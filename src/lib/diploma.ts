// Shared types + pure helpers for the diploma — used by both the real
// /certificacion/[id] page and the landing preview modal, so both stay
// visually identical instead of drifting apart as two copies.

export interface LeaderProfile {
  arquetipo: string
  big_five:  { O: number; C: number; E: number; A: number; N: number; ES: number }
}

export interface DiplomaData {
  studentName:      string
  schoolName:       string
  resultado:        'certificado' | 'mencion_honor'
  certDate:         string
  totalXP:          number
  modulesCompleted: number
  leaderProfile:    LeaderProfile | null
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function certNumber(id: string, date: string): string {
  const hex = id.replace(/[^0-9a-f]/gi, '') || '0'
  const num = (parseInt(hex.slice(-6) || hex, 16) % 9000) + 1000 // always 1000–9999
  return `CERT-${new Date(date).getFullYear()}-${String(num).padStart(4, '0')}`
}

// Deterministic cert ID for QR/verification — first 8 chars of UUID + year
export function makeCertId(userId: string, date: string): string {
  const year = new Date(date).getFullYear()
  const part = userId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `BF${year}${part}`
}

export function arquetipoCode(arquetipo: string | undefined): string {
  if (!arquetipo) return ''
  const parts = arquetipo.trim().split(/\s+/)
  return parts[parts.length - 1].toUpperCase()
}
