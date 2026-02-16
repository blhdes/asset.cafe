import type { CSSProperties } from 'react'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer ${className}`}
      style={{ borderRadius: 'var(--radius-md)', ...style }}
    />
  )
}

export function ListCardSkeleton() {
  return (
    <div
      className="p-5 space-y-3"
      style={{
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <Skeleton className="h-5 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-14" style={{ borderRadius: 'var(--radius-pill)' }} />
        <Skeleton className="h-5 w-18" style={{ borderRadius: 'var(--radius-pill)' }} />
      </div>
      <Skeleton className="h-4 w-1/4" />
    </div>
  )
}
