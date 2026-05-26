interface StatCardProps {
  num: number
  label: string
  accent?: boolean
}

export default function StatCard({ num, label, accent = false }: StatCardProps) {
  return (
    <div style={{
      background: 'var(--card-bg,#fff)',
      border: '1px solid var(--card-border,rgba(13,13,13,.07))',
      borderRadius: 16,
      padding: '24px 28px',
      boxShadow: '0 2px 12px -4px rgba(13,13,13,.07)',
    }}>
      <div style={{
        fontFamily: 'Satoshi,sans-serif',
        fontWeight: 900,
        fontSize: 40,
        letterSpacing: '-.03em',
        lineHeight: 1,
        color: accent ? 'var(--accent,#C0392B)' : 'var(--ink,#0D0D0D)',
      }}>
        {num.toLocaleString('es-CO')}
      </div>
      <div style={{
        fontSize: 12,
        color: 'var(--mute,#6B6B6B)',
        marginTop: 8,
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        fontWeight: 500,
      }}>
        {label}
      </div>
    </div>
  )
}
