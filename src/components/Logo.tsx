interface LogoProps {
  size?: number
  style?: React.CSSProperties
}

export default function Logo({ size = 24, style }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      style={style}
      aria-hidden="true"
    >
      <rect x="4" y="38" width="14" height="14" rx="2.5" fill="currentColor"/>
      <rect x="22" y="24" width="14" height="28" rx="2.5" fill="currentColor"/>
      <rect x="40" y="10" width="14" height="42" rx="2.5" fill="currentColor"/>
      <path d="M54 18 C62 18, 62 36, 54 36" stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <rect x="0" y="56" width="58" height="3.5" rx="1.75" fill="currentColor"/>
    </svg>
  )
}
