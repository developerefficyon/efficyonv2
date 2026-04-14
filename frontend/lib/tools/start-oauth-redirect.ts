"use client"

import { toast } from "sonner"
import { getBackendToken } from "@/lib/auth-hooks"
import type { UnifiedToolConfig } from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export interface StartOAuthRedirectResult {
  success: boolean
  redirected: boolean
}

/**
 * Shared OAuth-start helper. Fetches the provider's oauthStartEndpoint and
 * redirects the browser. Returns quickly if auth is missing or the config
 * doesn't support OAuth. Shows toasts on error. Used by both
 * useToolConnect.reconnect() and the main tools list page's reconnect button.
 */
export async function startOAuthRedirect(
  config: UnifiedToolConfig,
  options: { onUnauthenticated?: () => void } = {},
): Promise<StartOAuthRedirectResult> {
  if (config.authType !== "oauth" || !config.oauthStartEndpoint) {
    toast.error(`Reconnect not supported for ${config.label}`)
    return { success: false, redirected: false }
  }

  try {
    const accessToken = await getBackendToken()
    if (!accessToken) {
      toast.error("Session expired", { description: "Please log in again" })
      options.onUnauthenticated?.()
      return { success: false, redirected: false }
    }

    const oauthRes = await fetch(`${API_BASE}${config.oauthStartEndpoint}`, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    })

    if (!oauthRes.ok) {
      const errData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(errData.error || "Failed to start OAuth")
    }

    const oauthData = await oauthRes.json()
    if (!oauthData.url) throw new Error("No OAuth URL returned from backend")

    toast.success(config.connectingToast || `Redirecting to ${config.label}…`)
    setTimeout(() => {
      window.location.href = oauthData.url
    }, 500)

    return { success: true, redirected: true }
  } catch (error: any) {
    toast.error(`Failed to start ${config.label} OAuth`, {
      description: error.message || "An error occurred.",
    })
    return { success: false, redirected: false }
  }
}
