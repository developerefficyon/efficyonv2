"use client"

import { useCallback } from "react"
import { getBackendToken } from "@/lib/auth-hooks"
import { useApiCache } from "@/lib/use-api-cache"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, AlertTriangle } from "lucide-react"

interface SavingsData {
  success: boolean
  totalWasteIdentified: number
  savingsRealized: number
  analysisCount: number
  appliedCount: number
  trackingSince: string | null
}

export function SavingsCounter() {
  const fetchSavings = useCallback(async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    const accessToken = await getBackendToken()
    if (!accessToken) return null

    const res = await fetch(`${apiBase}/api/dashboard/savings-summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    return res.json()
  }, [])

  const { data } = useApiCache<SavingsData>("savings-summary", fetchSavings)

  if (!data?.success || (data.totalWasteIdentified === 0 && data.savingsRealized === 0)) {
    return null
  }

  const trackingSince = data.trackingSince
    ? new Date(data.trackingSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Total Waste Identified */}
      <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl relative overflow-hidden group">
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/[0.05] rounded-full blur-3xl group-hover:bg-amber-500/[0.08] transition-all duration-700" />
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Total Waste Identified</span>
          </div>
          <p className="text-3xl sm:text-4xl font-semibold text-amber-400 tracking-tight">
            ${data.totalWasteIdentified.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-[11px] text-white/25 mt-1">
            Across {data.analysisCount} analysis{data.analysisCount !== 1 ? "es" : ""}
            {trackingSince ? ` since ${trackingSince}` : ""}
          </p>
        </CardContent>
      </Card>

      {/* Savings Realized */}
      <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl relative overflow-hidden group">
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/[0.05] rounded-full blur-3xl group-hover:bg-emerald-500/[0.08] transition-all duration-700" />
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Savings Realized</span>
          </div>
          <p className="text-3xl sm:text-4xl font-semibold text-emerald-400 tracking-tight">
            ${data.savingsRealized.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-[11px] text-white/25 mt-1">
            From {data.appliedCount} applied recommendation{data.appliedCount !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
