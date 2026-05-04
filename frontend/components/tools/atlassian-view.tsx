"use client"

import type { ToolViewProps } from "@/lib/tools/types"

export function AtlassianView({ isLoading }: ToolViewProps) {
  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>
  }

  return (
    <div className="p-6 text-sm text-muted-foreground">
      Atlassian data view — populated after the Data endpoint is wired.
    </div>
  )
}
