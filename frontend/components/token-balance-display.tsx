"use client"

import { useTokens } from "@/lib/token-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Coins, AlertTriangle, Sparkles } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface TokenBalanceDisplayProps {
  variant?: "header" | "sidebar" | "card" | "compact"
  showUpgrade?: boolean
}

export function TokenBalanceDisplay({
  variant = "header",
  showUpgrade = true,
}: TokenBalanceDisplayProps) {
  const { tokenBalance, isLoading, lowTokenWarning } = useTokens()

  if (isLoading) {
    return <div className="animate-pulse bg-white/5 rounded h-8 w-24" />
  }

  if (!tokenBalance) return null

  const usagePercent =
    tokenBalance.total > 0
      ? Math.round((tokenBalance.used / tokenBalance.total) * 100)
      : 0

  // Compact variant - just shows tokens/total
  if (variant === "compact") {
    return (
      <Badge
        className={cn(
          "px-2 py-1",
          lowTokenWarning
            ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
            : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
        )}
      >
        <Coins className="w-3 h-3 mr-1" />
        {tokenBalance.available}/{tokenBalance.total}
      </Badge>
    )
  }

  // Header variant - for top navigation
  if (variant === "header") {
    return (
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
            lowTokenWarning
              ? "bg-orange-500/10 border-orange-500/30"
              : "bg-cyan-500/10 border-cyan-500/30"
          )}
        >
          {lowTokenWarning ? (
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          ) : (
            <Coins className="w-4 h-4 text-cyan-400" />
          )}
          <span
            className={cn(
              "text-sm font-medium",
              lowTokenWarning ? "text-orange-400" : "text-cyan-400"
            )}
          >
            {tokenBalance.available} tokens
          </span>
        </div>
      </div>
    )
  }

  // Card variant - detailed display
  if (variant === "card") {
    return (
      <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
              <Coins className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Token Balance</p>
              <p className="text-xs text-gray-400 capitalize">
                {tokenBalance.planTier} plan
              </p>
            </div>
          </div>
          {lowTokenWarning && (
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Low
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Available</span>
            <span className="text-white font-semibold">
              {tokenBalance.available} / {tokenBalance.total}
            </span>
          </div>
          <Progress value={100 - usagePercent} className="h-2 bg-white/10" />
          <p className="text-xs text-gray-500">{usagePercent}% used this month</p>
        </div>

        {showUpgrade && tokenBalance.available <= 2 && tokenBalance.total > 0 && (
          <Link href="/dashboard/settings">
            <Button
              size="sm"
              className="w-full mt-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          </Link>
        )}
      </div>
    )
  }

  // Sidebar variant
  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">Tokens</span>
        <span className="text-sm font-medium text-white">
          {tokenBalance.available}
        </span>
      </div>
      <Progress value={100 - usagePercent} className="h-1.5 bg-white/10" />
    </div>
  )
}
