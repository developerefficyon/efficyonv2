"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getBackendToken } from "@/lib/auth-hooks"
import type { UnifiedToolConfig } from "./types"
import { startOAuthRedirect } from "./start-oauth-redirect"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export interface UseToolConnectResult {
  values: Record<string, any>
  setValues: (v: Record<string, any>) => void
  isConnecting: boolean
  connect: () => Promise<void>
  connectWithValues: (values: Record<string, any>) => Promise<void>
  reconnect: (integrationId: string) => Promise<void>
  reset: () => void
}

export function useToolConnect(
  config: UnifiedToolConfig,
  onSuccess?: () => void,
): UseToolConnectResult {
  const router = useRouter()
  const initialValues = Object.fromEntries(config.authFields.map((f) => [f.name, ""]))
  const [values, setValues] = useState<Record<string, any>>(initialValues)
  const [isConnecting, setIsConnecting] = useState(false)

  const reset = useCallback(() => setValues(initialValues), [config.provider])

  const validate = (): string | null => {
    for (const field of config.authFields) {
      const v = (values[field.name] ?? "").toString().trim()
      if (field.required && !v) return `${field.label} is required`
      if (field.validate) {
        const err = field.validate(v)
        if (err) return err
      }
    }
    if (config.validate) {
      const err = config.validate(values)
      if (err) return err
    }
    return null
  }

  const connectWithValues = useCallback(async (submitValues: Record<string, any>) => {
    setIsConnecting(true)
    try {
      const accessToken = await getBackendToken()
      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const body = config.buildConnectRequest(submitValues)

      const res = await fetch(`${API_BASE}${config.connectEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 403 && data?.error === "Integration limit reached") {
          toast.error("Integration limit reached", {
            description: data.message || `Your plan allows up to ${data.maxIntegrations} integrations.`,
          })
          return
        }
        throw new Error(data?.error || `Failed to connect ${config.label}`)
      }

      if (config.authType === "oauth" && config.oauthStartEndpoint) {
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

        toast.success(config.connectingToast || `Redirecting to ${config.label} to authorize…`)
        setTimeout(() => {
          window.location.href = oauthData.url
        }, 500)
        return
      }

      // API-key / service-account flow — connection is instant
      toast.success(config.connectedToast || `${config.label} connected`)
      reset()
      onSuccess?.()
    } catch (error: any) {
      toast.error(`Failed to connect ${config.label}`, {
        description: error.message || "An error occurred.",
      })
    } finally {
      setIsConnecting(false)
    }
  }, [config, router, onSuccess, reset])

  const connect = useCallback(async () => {
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }
    await connectWithValues(values)
  }, [values, connectWithValues, validate])

  const reconnect = useCallback(
    async (_integrationId: string) => {
      await startOAuthRedirect(config, { onUnauthenticated: () => router.push("/login") })
    },
    [config, router],
  )

  return { values, setValues, isConnecting, connect, connectWithValues, reconnect, reset }
}
