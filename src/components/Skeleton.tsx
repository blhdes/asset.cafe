interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
  )
}

export function ListCardSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
      <Skeleton className="h-5 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-18 rounded-full" />
      </div>
      <Skeleton className="h-4 w-1/4" />
    </div>
  )
}
