export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="bg-white rounded-xl border border-gray-soft p-4 animate-pulse">
      <div className="h-4 bg-gray-soft/60 rounded w-2/3 mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 bg-gray-soft/40 rounded mb-2 ${i === lines - 1 ? 'w-1/2' : 'w-full'}`} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-8 bg-gray-soft/40 rounded" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-10 bg-gray-soft/30 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="bg-white rounded-xl border border-gray-soft p-4 animate-pulse">
      <div className="h-3 bg-gray-soft/40 rounded w-1/2 mb-2" />
      <div className="h-7 bg-gray-soft/60 rounded w-2/3 mb-1" />
      <div className="h-2.5 bg-gray-soft/30 rounded w-1/3" />
    </div>
  )
}

export default function Skeleton({ className = 'h-4' }) {
  return <div className={`bg-gray-soft/40 rounded animate-pulse ${className}`} />
}
