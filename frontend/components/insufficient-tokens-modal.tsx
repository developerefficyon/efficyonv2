"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { XCircle, Sparkles, ArrowRight } from "lucide-react"
import Link from "next/link"

interface InsufficientTokensModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  available: number
  required: number
}

export function InsufficientTokensModal({
  open,
  onOpenChange,
  available,
  required,
}: InsufficientTokensModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-red-500/30 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <DialogTitle className="text-white">Insufficient Tokens</DialogTitle>
          </div>
          <DialogDescription className="text-gray-400">
            This analysis requires{" "}
            <span className="text-white font-semibold">{required} tokens</span>, but
            you only have{" "}
            <span className="text-red-400 font-semibold">{available} tokens</span>{" "}
            available. Upgrade your plan to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 rounded-lg bg-white/5 border border-white/10 mt-4">
          <p className="text-sm text-gray-300 mb-2">Token costs:</p>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>- Single source analysis: 1 token</li>
            <li>- Dual source analysis: 2 tokens</li>
            <li>- Triple+ source analysis: 3 tokens</li>
            <li>- Advanced AI deep dive: +1 token</li>
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
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
