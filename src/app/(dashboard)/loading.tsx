export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse" aria-label="Memuat halaman" role="status">
      {/* Hero skeleton */}
      <div className="rounded-2xl bg-[var(--color-navy-900)]/10 h-28 md:h-32" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-base p-4 space-y-3">
            <div className="w-9 h-9 rounded-xl skeleton" />
            <div className="h-3 w-16 skeleton" />
            <div className="h-7 w-20 skeleton" />
            <div className="h-2.5 w-28 skeleton" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-base p-5 space-y-4">
          <div className="h-4 w-32 skeleton" />
          <div className="h-24 w-24 rounded-full skeleton mx-auto" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-14 skeleton rounded-lg" />
            <div className="h-14 skeleton rounded-lg" />
          </div>
        </div>
        <div className="card-base p-5 space-y-4">
          <div className="h-4 w-24 skeleton" />
          <div className="h-8 w-36 skeleton mx-auto" />
          <div className="h-3 skeleton rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-14 skeleton rounded-lg" />
            <div className="h-14 skeleton rounded-lg" />
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-base p-5 space-y-3">
          <div className="h-4 w-32 skeleton" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-lg skeleton" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 skeleton" />
                <div className="h-2.5 w-1/2 skeleton" />
              </div>
            </div>
          ))}
        </div>
        <div className="card-base p-5 space-y-3">
          <div className="h-3 w-20 skeleton" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 skeleton rounded-lg" />
          ))}
        </div>
      </div>
      <span className="sr-only">Memuat data dashboard...</span>
    </div>
  )
}
