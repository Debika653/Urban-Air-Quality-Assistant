export function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="space-y-6 rounded-xl border border-slate-200 bg-white p-6"
    >
      <p className="text-sm font-medium text-teal-800">
        Generating your personalized urban air-quality and low-emission guidance plan...
      </p>

      <div className="space-y-3">
        <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
      </div>

      <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-3">
        {[0, 1, 2].map((idx) => (
          <div key={idx} className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-12 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
