/**
 * Temporary placeholder view used during the HIGH-11 migration.
 * Each legacy tool points at this until its dedicated view component lands
 * (later tasks). Deleted after migration completes.
 */
import type { ToolViewProps } from "@/lib/tools/types"

export function PendingToolView(_: ToolViewProps) {
  return (
    <div className="p-8 text-center text-white/40 text-sm">
      Detail view migration pending.
    </div>
  )
}
