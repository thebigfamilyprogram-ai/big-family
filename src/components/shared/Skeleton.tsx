interface SkeletonProps {
  w?: string | number
  h?: number
  r?: number
}

export default function Skeleton({ w = '100%', h = 18, r = 8 }: SkeletonProps) {
  return (
    <div style={{
      width: w,
      height: h,
      borderRadius: r,
      background: 'linear-gradient(90deg,var(--bg-2) 25%,var(--card-bg) 50%,var(--bg-2) 75%)',
      backgroundSize: '400% 100%',
      animation: 'shimmer 1.4s ease infinite',
    }} />
  )
}
