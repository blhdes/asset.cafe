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
      {/* W chart pattern (ascending breakout) */}
      <path
        d="M 4,16 L 16,50 L 32,24 L 48,50 L 60,8"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
