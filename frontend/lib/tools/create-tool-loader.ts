/**
 * Generic tool data loader.
 *
 * All five existing tools (Fortnox, Microsoft365, HubSpot, QuickBooks, Shopify)
 * loaded their detail-page data with the same shape: parallel fetch a fixed set
 * of endpoints, watch for expired-token responses, parse JSON, pull the array
 * out of one of a few possible response keys, and assemble an info object.
 *
 * `createToolLoader` collapses that ~150-line per-tool function into a single
 * config-driven helper. Adding a new tool means writing a small config file
 * (see `lib/tools/configs/*.ts`), not another loader.
 */

import { toast } from "sonner"
import { getBackendToken } from "@/lib/auth-hooks"
import type { ToolConfig, ToolInfo } from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export interface LoadToolInfoResult {
  info: ToolInfo | null
  tokenExpired: boolean
}

/**
 * Build a loader function from a tool config. The returned function takes no
 * arguments and resolves to `{ info, tokenExpired }`. Errors are surfaced via
 * toasts and `info` is null on hard failure so callers can clear their state.
 */
export function createToolLoader(config: ToolConfig) {
  return async function loadToolInfo(): Promise<LoadToolInfoResult> {
    const accessToken = await getBackendToken()
    if (!accessToken) {
      toast.error("Authentication required")
      return { info: null, tokenExpired: false }
    }

    try {
      const responses = await Promise.allSettled(
        config.endpoints.map((ep) =>
          fetch(`${API_BASE}${ep.path}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ),
      )

      // Token-expiry guard — if any response says reconnect, abort the whole load
      for (const r of responses) {
        if (r.status === "fulfilled" && !r.value.ok) {
          try {
            const errorData = await r.value.clone().json()
            if (errorData?.requiresReconnect || errorData?.code === "TOKEN_EXPIRED") {
              toast.error("Integration token expired", {
                description: `Please reconnect your ${config.label} integration to continue.`,
                duration: 10000,
              })
              return { info: null, tokenExpired: true }
            }
          } catch {
            /* response wasn't JSON — fall through */
          }
        }
      }

      // Merge each successful response into the info object
      const info: ToolInfo = {}
      for (let i = 0; i < config.endpoints.length; i++) {
        const ep = config.endpoints[i]
        const r = responses[i]
        if (r.status !== "fulfilled" || !r.value.ok) continue

        try {
          const data = await r.value.json()
          info[ep.key] = pickFromResponse(data, ep)
        } catch (e) {
          console.error(`[${config.label}] Error parsing ${ep.key}:`, e)
        }
      }

      return { info, tokenExpired: false }
    } catch (err) {
      console.error(`[${config.label}] Loader error:`, err)
      toast.error(`Failed to load ${config.label} information`)
      return { info: null, tokenExpired: false }
    }
  }
}

function pickFromResponse(data: any, ep: { pick?: string[]; fallback?: any }) {
  if (!ep.pick || ep.pick.length === 0) {
    return data
  }
  for (const key of ep.pick) {
    if (data && data[key] !== undefined) return data[key]
  }
  return ep.fallback !== undefined ? ep.fallback : data
}
