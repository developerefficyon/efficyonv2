"use client"

import { useState, useEffect } from "react"
import { getBackendToken } from "@/lib/auth-hooks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Coins, TrendingDown, RefreshCw, Clock, ChevronDown } from "lucide-react"

interface UsageEntry {
  id: string
  tokens_consumed: number
  action_type: string
  description: string | null
  created_at: string
  balance_after: number
}

export function TokenUsageHistory() {
  const [history, setHistory] = useState<UsageEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()
      if (!accessToken) return

      const response = await fetch(`${apiBase}/api/stripe/token-history?limit=20`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (response.ok) {
        const data = await response.json()
        setHistory(data.history || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error("Error fetching token history:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      single_source_analysis: "Single Source Analysis",
      dual_source_analysis: "Dual Source Analysis",
      triple_source_analysis: "Multi-Source Analysis",
      advanced_ai_deep_dive: "AI Deep Dive",
      token_refund: "Token Refund",
      admin_adjustment: "Admin Adjustment",
      monthly_reset: "Monthly Reset",
    }
    return labels[actionType] || actionType
  }

  const getActionIcon = (actionType: string, tokensConsumed: number) => {
    if (actionType === "monthly_reset") {
      return <RefreshCw className="w-4 h-4 text-blue-400" />
    }
    if (tokensConsumed > 0) {
      return <TrendingDown className="w-4 h-4 text-orange-400" />
    }
    return <RefreshCw className="w-4 h-4 text-green-400" />
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    }
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
  }

  if (isLoading) {
    return (
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Token Usage History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse bg-white/5 rounded-lg h-16"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayedHistory = showAll ? history : history.slice(0, 5)

  return (
    <Card className="bg-black/80 backdrop-blur-xl border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          Token Usage History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8">
            <Coins className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No token usage yet</p>
            <p className="text-gray-500 text-xs mt-1">
              Your token transactions will appear here
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {displayedHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        entry.action_type === "monthly_reset"
                          ? "bg-blue-500/20 border border-blue-500/30"
                          : entry.tokens_consumed > 0
                            ? "bg-orange-500/20 border border-orange-500/30"
                            : "bg-green-500/20 border border-green-500/30"
                      }`}
                    >
                      {getActionIcon(entry.action_type, entry.tokens_consumed)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {getActionLabel(entry.action_type)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(entry.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={
                        entry.action_type === "monthly_reset"
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : entry.tokens_consumed > 0
                            ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                            : "bg-green-500/20 text-green-400 border-green-500/30"
                      }
                    >
                      {entry.action_type === "monthly_reset"
                        ? "Reset"
                        : entry.tokens_consumed > 0
                          ? `-${entry.tokens_consumed}`
                          : `+${Math.abs(entry.tokens_consumed)}`}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      Balance: {entry.balance_after}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {history.length > 5 && (
              <Button
                variant="ghost"
                className="w-full mt-4 text-gray-400 hover:text-white hover:bg-white/5"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? "Show Less" : `Show All (${total} entries)`}
                <ChevronDown
                  className={`w-4 h-4 ml-2 transition-transform ${showAll ? "rotate-180" : ""}`}
                />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
