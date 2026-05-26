type BadgeVariant = 'approved' | 'pending' | 'rejected' | 'draft'

const VARIANT_STYLES: Record<BadgeVariant, { color: string; bg: string }> = {
  approved: { color: 'var(--accent-teal,#0F7B6C)',   bg: 'rgba(15,123,108,0.1)'  },
  pending:  { color: 'var(--accent-amber,#D4821A)',  bg: 'rgba(212,130,26,0.1)'  },
  rejected: { color: 'var(--accent,#C0392B)',        bg: 'rgba(192,57,43,0.1)'   },
  draft:    { color: 'var(--accent-muted,#8C7B6E)',  bg: 'rgba(13,13,13,0.07)'   },
}

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  color?: string
  bg?: string
}

export default function Badge({ label, variant, color, bg }: BadgeProps) {
  const styles = variant
    ? VARIANT_STYLES[variant]
    : { color: color ?? 'var(--mute,#6B6B6B)', bg: bg ?? 'rgba(13,13,13,0.07)' }

  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: 999,
      fontSize: 11.5,
      fontWeight: 700,
      color: styles.color,
      background: styles.bg,
      fontFamily: '"Satoshi",sans-serif',
      whiteSpace: 'nowrap',
      letterSpacing: '.03em',
    }}>
      {label}
    </span>
  )
}
