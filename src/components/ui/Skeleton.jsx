export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-stone-200/70 rounded-lg ${className}`} />;
}

/** A skeleton shaped like the KPI-tile grid on the Dashboard. */
export function SkeletonKpiGrid({ count = 5 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-3xl p-4 border border-stone-100 bg-white">
          <Skeleton className="w-6 h-6 mb-2" />
          <Skeleton className="w-12 h-6 mb-1" />
          <Skeleton className="w-20 h-3" />
        </div>
      ))}
    </div>
  );
}

/** A skeleton shaped like a list of white rounded cards (Customers/Orders/etc rows). */
export function SkeletonList({ rows = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-stone-100 shadow-warm p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="w-40 h-4" />
              <Skeleton className="w-56 h-3" />
            </div>
            <Skeleton className="w-16 h-5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A skeleton shaped like a data table with a header row. */
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white rounded-3xl border border-stone-100 shadow-warm overflow-hidden">
      <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="w-20 h-3" />)}
      </div>
      <div className="divide-y divide-stone-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-6">
            {Array.from({ length: cols }).map((_, j) => <Skeleton key={j} className="w-24 h-4" />)}
          </div>
        ))}
      </div>
    </div>
  );
}
