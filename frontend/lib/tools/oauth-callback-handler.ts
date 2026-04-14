"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { TOOL_REGISTRY } from "./registry"

export interface UseOAuthCallbackOptions {
  /** Called after a successful OAuth callback so caller can reload integrations. */
  onSuccess?: () => void
  /** Called after any OAuth callback (success or error) so caller can clear in-flight UI. */
  onDone?: () => void
}

/**
 * Reads the URL for ?<tool-id>=connected|error|error_*, surfaces a toast, and
 * strips the query param from the URL.
 */
export function useOAuthCallback(opts: UseOAuthCallbackOptions = {}) {
  const didRunRef = useRef(false)

  useEffect(() => {
    if (didRunRef.current) return
    didRunRef.current = true

    const params = new URLSearchParams(window.location.search)
    const config = Object.values(TOOL_REGISTRY).find((cfg) => params.get(cfg.id) !== null)
    if (!config) return

    const status = params.get(config.id)
    const errorDetails = params.get("details")
    const errorParam = params.get("error")

    // Strip query string
    window.history.replaceState({}, "", window.location.pathname)

    if (status === "connected") {
      toast.success(`${config.label} connected successfully!`, {
        description: `Your ${config.label} integration is now active.`,
        duration: 5000,
      })
      opts.onSuccess?.()
    } else if (status) {
      let description =
        status === "error" ? "Connection failed" : status.replace("error_", "").replace(/_/g, " ")
      if (errorDetails) description += `: ${decodeURIComponent(errorDetails)}`
      else if (errorParam) description += `: ${decodeURIComponent(errorParam)}`

      toast.error(`Failed to connect ${config.label}`, {
        description,
        duration: 10000,
      })
    }

    opts.onDone?.()
  }, [opts])
}
