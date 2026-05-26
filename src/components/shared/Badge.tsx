interface BadgeProps {
  label: string
  color: string
  bg: string
}

export default function Badge({ label, color, bg }: BadgeProps) {
  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: 999,
      fontSize: 11.5,
      fontWeight: 700,
      color,
      background: bg,
      fontFamily: 'Satoshi,sans-serif',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}
