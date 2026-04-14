/**
 * useToolInfo
 *
 * Single hook that replaces the five per-tool loaders + states that used to
 * live inline in `dashboard/tools/[id]/page.tsx`. Looks up the tool config in
 * the registry, runs the generic loader on mount, and exposes:
 *
 *   - info        merged endpoint payloads (typed as `ToolInfo`)
 *   - isLoading   true while a load is in flight
 *   - reload      manual refresh trigger (e.g. after a sync button click)
 *   - config      the resolved `UnifiedToolConfig` (so the page can read defaultTab)
 *
 * The hook deliberately keys on `integration?.id` so switching between tools
 * inside the same page mount triggers a fresh load.
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { createToolLoader } from "./create-tool-loader"
import { getToolConfig } from "./registry"
import type { Integration, UnifiedToolConfig, ToolInfo } from "./types"

export interface UseToolInfoResult {
  info: ToolInfo | null
  isLoading: boolean
  reload: () => Promise<void>
  config: UnifiedToolConfig | undefined
}

export function useToolInfo(integration: Integration | null): UseToolInfoResult {
  const config = getToolConfig(integration?.tool_name || integration?.provider)
  const [info, setInfo] = useState<ToolInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Keep the latest loader in a ref so `reload` is stable across renders.
  const loaderRef = useRef<(() => Promise<{ info: ToolInfo | null }>) | null>(null)
  useEffect(() => {
    loaderRef.current = config ? createToolLoader(config) : null
  }, [config])

  const reload = useCallback(async () => {
    if (!loaderRef.current) {
      setInfo(null)
      return
    }
    setIsLoading(true)
    try {
      const result = await loaderRef.current()
      setInfo(result.info)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Auto-load when the integration changes (and only when it's connected).
  useEffect(() => {
    if (!integration || !config) {
      setInfo(null)
      return
    }
    if (integration.status !== "connected") {
      setInfo(null)
      return
    }
    void reload()
    // We intentionally only react to integration identity, not the whole object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration?.id, integration?.status, config?.provider])

  return { info, isLoading, reload, config }
}
