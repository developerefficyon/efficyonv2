"use client"

import { useCallback, useState } from "react"
import { getBackendToken } from "@/lib/auth-hooks"
import { useApiCache } from "@/lib/use-api-cache"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, RefreshCw, X, Loader2 } from "lucide-react"

interface Renewal {
  id: string
  supplier_name: string
  average_amount: number
  currency: string
  cadence: string
  projected_renewal_date: string
  confidence: number
}

interface RenewalData {
  success: boolean
  renewals: Renewal[]
  count: number
}

export function RenewalAlertsWidget() {
  const [refreshing, setRefreshing] = useState(false)

  const fetchRenewals = useCallback(async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    const accessToken = await getBackendToken()
    if (!accessToken) return null

    const res = await fetch(`${apiBase}/api/dashboard/renewal-alerts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    return res.json()
  }, [])

  const { data, refresh } = useApiCache<RenewalData>("renewal-alerts", fetchRenewals)

  if (!data?.success || data.count === 0) {
    return null
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()
      if (accessToken) {
        await fetch(`${apiBase}/api/dashboard/renewal-alerts/refresh`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        refresh()
      }
    } finally {
      setRefreshing(false)
    }
  }

  const handleDismiss = async (id: string) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    const accessToken = await getBackendToken()
    if (accessToken) {
      await fetch(`${apiBase}/api/dashboard/renewal-alerts/${id}/dismiss`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      refresh()
    }
  }

  const getDaysUntil = (dateStr: string) => {
    const now = new Date()
    const target = new Date(dateStr)
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getUrgencyColor = (days: number) => {
    if (days <= 30) return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/15", dot: "bg-red-400" }
    if (days <= 60) return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/15", dot: "bg-amber-400" }
    return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/15", dot: "bg-emerald-400" }
  }

  return (
    <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-white/[0.04] flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-white/40" />
            </div>
            <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Upcoming Renewals</span>
            <Badge className="bg-white/[0.04] text-white/40 border-white/[0.06] text-[10px] h-5 px-1.5 rounded-full">
              {data.count}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white hover:bg-white/[0.05] h-7 px-2 text-[11px] rounded-lg"
          >
            {refreshing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
          </Button>
        </div>

        <div className="space-y-2">
          {data.renewals.slice(0, 5).map((renewal) => {
            const daysUntil = getDaysUntil(renewal.projected_renewal_date)
            const urgency = getUrgencyColor(daysUntil)
            const renewalDate = new Date(renewal.projected_renewal_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })

            return (
              <div
                key={renewal.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${urgency.dot}`} />
                  <div className="min-w-0">
                    <p className="text-[13px] text-white/70 font-medium truncate">{renewal.supplier_name}</p>
                    <p className="text-[11px] text-white/25">
                      ~{renewal.average_amount.toLocaleString()} {renewal.currency} / {renewal.cadence}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`${urgency.bg} ${urgency.text} ${urgency.border} text-[10px] h-5 px-2 rounded-full font-medium`}>
                    {daysUntil <= 0 ? "Overdue" : `${daysUntil}d`}
                  </Badge>
                  <span className="text-[11px] text-white/20">{renewalDate}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(renewal.id)}
                    className="h-6 w-6 p-0 text-white/15 hover:text-white/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
