"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Trash2, Loader2 } from "lucide-react"
import { ToolLogo } from "@/components/tools/tool-logos"
import type { Integration, UnifiedToolConfig } from "@/lib/tools/types"
import type { ReactNode } from "react"

interface ToolDetailShellProps {
  integration: Integration
  config: UnifiedToolConfig
  canWrite: boolean
  onReconnect?: () => void
  onDelete: () => void
  isReconnecting: boolean
  isDeleting: boolean
  children: ReactNode
}

export function ToolDetailShell({
  integration,
  config,
  canWrite,
  onReconnect,
  onDelete,
  isReconnecting,
  isDeleting,
  children,
}: ToolDetailShellProps) {
  const status = integration.status

  const badge =
    status === "connected" ? (
      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/15">Connected</Badge>
    ) : status === "error" || status === "expired" ? (
      <Badge className="bg-red-500/10 text-red-400 border-red-500/15">
        {status === "expired" ? "Expired" : "Error"}
      </Badge>
    ) : status === "pending" ? (
      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/15">Pending</Badge>
    ) : status === "disconnected" ? (
      <Badge className="bg-white/[0.06] text-white/40 border-white/[0.08]">Disconnected</Badge>
    ) : (
      <Badge className="bg-white/[0.04] text-white/30 border-white/[0.06]">Unknown</Badge>
    )

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <ToolLogo name={config.id} size={44} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display text-white truncate">{config.label}</h2>
              {badge}
            </div>
            <p className="text-[12px] text-white/30">{config.description}</p>
          </div>
        </div>

        {canWrite && (
          <div className="flex items-center gap-2">
            {onReconnect && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReconnect}
                disabled={isReconnecting}
                className="h-8 px-3 text-[12px] text-white/60 hover:text-white hover:bg-white/[0.06] rounded-md"
              >
                {isReconnecting ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                )}
                Reconnect
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="h-8 px-3 text-[12px] text-white/40 hover:text-red-400 hover:bg-red-500/[0.08] rounded-md"
            >
              <Trash2 className="w-3 h-3 mr-1.5" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <div>{children}</div>
    </div>
  )
}
