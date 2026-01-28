export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-white/5 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 bg-white/5 rounded-xl border border-white/10" />
        <div className="h-32 bg-white/5 rounded-xl border border-white/10" />
        <div className="h-32 bg-white/5 rounded-xl border border-white/10" />
      </div>
      <div className="h-64 bg-white/5 rounded-xl border border-white/10" />
    </div>
  )
}
