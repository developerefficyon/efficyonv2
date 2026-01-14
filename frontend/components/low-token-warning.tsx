"use client"

import { useEffect, useState } from "react"
import { useTokens } from "@/lib/token-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Sparkles, ArrowRight } from "lucide-react"
import Link from "next/link"

export function LowTokenWarning() {
  const { tokenBalance, lowTokenWarning } = useTokens()
  const [showWarning, setShowWarning] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Show warning once per session when tokens are low (but not zero)
    if (lowTokenWarning && !dismissed && tokenBalance && tokenBalance.available > 0) {
      // Small delay to avoid showing immediately on page load
      const timer = setTimeout(() => {
        setShowWarning(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [lowTokenWarning, dismissed, tokenBalance])

  // Don't show if no tokens at all (free plan or depleted)
  if (!showWarning || !tokenBalance || tokenBalance.available === 0) return null

  return (
    <Dialog
      open={showWarning}
      onOpenChange={(open) => {
        if (!open) {
          setShowWarning(false)
          setDismissed(true)
        }
      }}
    >
      <DialogContent className="bg-black border-orange-500/30 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
            </div>
            <DialogTitle className="text-white">Low Token Balance</DialogTitle>
          </div>
          <DialogDescription className="text-gray-400">
            You have only{" "}
            <span className="text-orange-400 font-semibold">
              {tokenBalance.available} tokens
            </span>{" "}
            remaining this month. Consider upgrading your plan for more analysis
            capacity.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 rounded-lg bg-white/5 border border-white/10 mt-4">
          <p className="text-sm text-gray-300 mb-2">Token costs reminder:</p>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>- Single source analysis: 1 token</li>
            <li>- Dual source analysis: 2 tokens</li>
            <li>- Triple+ source analysis: 3 tokens</li>
          </ul>
        </div>

        <div className="space-y-3 mt-4">
          <Link href="/dashboard/settings" className="block">
            <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500">
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade Plan
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Button
            variant="outline"
            className="w-full border-white/10 text-white hover:bg-white/5"
            onClick={() => {
              setShowWarning(false)
              setDismissed(true)
            }}
          >
            Remind Me Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
