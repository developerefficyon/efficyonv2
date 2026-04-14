"use client"

import type { Integration, UnifiedToolConfig, ToolInfo } from "@/lib/tools/types"

interface DataTabProps {
  integration: Integration
  config: UnifiedToolConfig
  info: ToolInfo | null
  isLoading: boolean
  reload: () => Promise<void>
}

export function DataTab({ integration, config, info, isLoading, reload }: DataTabProps) {
  const ViewComponent = config.viewComponent
  return (
    <ViewComponent
      integration={integration}
      info={info}
      isLoading={isLoading}
      reload={reload}
    />
  )
}
