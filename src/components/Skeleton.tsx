/**
 * Skeleton placeholder generic untuk loading state per modul.
 * Lebih informatif daripada spinner — meniru bentuk konten asli.
 */

interface SkeletonRowProps {
  cols?: number
  rows?: number
}

export function SkeletonTable({ cols = 5, rows = 8 }: SkeletonRowProps) {
  return (
    <div className="card-base overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-50)] border-b border-[var(--color-surface-200)]">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="skeleton h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-surface-100)]">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-4 py-3">
                    <div className="skeleton h-3" style={{ width: `${50 + ((r + c) % 4) * 10}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface SkeletonCardGridProps {
  count?: number
}

export function SkeletonCardGrid({ count = 6 }: SkeletonCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-base p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-4 w-3/4" />
            </div>
            <div className="skeleton w-8 h-8 rounded-lg" />
          </div>
          <div className="skeleton h-3 w-full" />
          <div className="flex gap-2">
            <div className="skeleton h-6 w-16 rounded-full" />
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
          <div className="skeleton h-4 w-32" />
        </div>
      ))}
    </div>
  )
}

interface SkeletonStatsProps {
  count?: number
}

export function SkeletonStats({ count = 4 }: SkeletonStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-base p-4 space-y-3">
          <div className="skeleton w-9 h-9 rounded-xl" />
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-7 w-16" />
          <div className="skeleton h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonChartCard() {
  return (
    <div className="card-base p-5 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-3 w-48" />
        </div>
        <div className="skeleton h-3 w-12" />
      </div>
      <div className="flex items-center gap-4">
        <div className="skeleton w-24 h-24 rounded-full" />
        <div className="space-y-2 flex-1">
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-2/3" />
        </div>
      </div>
    </div>
  )
}
