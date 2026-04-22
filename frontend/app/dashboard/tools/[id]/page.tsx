"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { useTeamRole } from "@/lib/team-role-context"
import { getToolConfig } from "@/lib/tools/registry"
import { useToolConnect } from "@/lib/tools/use-tool-connect"
import { ToolDetailShell } from "@/components/tools/tool-detail-shell"
import { ToolDetailTabs } from "@/components/tools/tool-detail-tabs"
import type { Integration, UnifiedToolConfig } from "@/lib/tools/types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export default function ToolDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { canWrite } = useTeamRole()
  const [integration, setIntegration] = useState<Integration | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const integrationId = params?.id

  const loadIntegration = useCallback(async () => {
    if (!integrationId) return
    setIsLoading(true)
    try {
      const accessToken = await getBackendToken()
      if (!accessToken) {
        router.push("/login")
        return
      }
      const res = await fetch(`${API_BASE}/api/integrations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error(`Failed to load integration: ${res.status}`)
      const data = await res.json()
      const found = (data.integrations || []).find((i: Integration) => i.id === integrationId)
      if (!found) {
        toast.error("Integration not found")
        router.push("/dashboard/tools")
        return
      }
      setIntegration(found)
    } catch (err: any) {
      toast.error("Failed to load integration", { description: err.message })
    } finally {
      setIsLoading(false)
    }
  }, [integrationId, router])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    void loadIntegration()
  }, [authLoading, user, loadIntegration, router])

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    )
  }

  if (!integration) {
    return (
      <div className="p-8 text-center">
        <p className="text-white/40 text-sm">Integration not found.</p>
        <Link href="/dashboard/tools">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-3 h-3 mr-1.5" /> Back to Tools
          </Button>
        </Link>
      </div>
    )
  }

  const config = getToolConfig(integration.tool_name || integration.provider)

  if (!config) {
    return <UnknownToolFallback integration={integration} />
  }

  return (
    <ConnectedToolDetail
      integration={integration}
      config={config}
      canWrite={canWrite}
      onReload={loadIntegration}
    />
  )
}

// Renders a connected (or failed) integration whose config exists.
// Isolated so useToolInfo / useToolConnect hooks only fire when config is non-null.
function ConnectedToolDetail({
  integration,
  config,
  canWrite,
  onReload,
}: {
  integration: Integration
  config: UnifiedToolConfig
  canWrite: boolean
  onReload: () => Promise<void>
}) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAutoValidating, setIsAutoValidating] = useState(false)
  const { reconnect, isConnecting: isReconnecting } = useToolConnect(config, onReload)

  // AWS's 3-step wizard and Azure's admin-consent both leave the integration at
  // status=pending after the user action. We auto-fire /validate here so the
  // user doesn't need to click anything else — spec-intended behavior.
  useEffect(() => {
    if (!["AWS", "Azure", "Zoom"].includes(config.provider) || integration.status !== "pending" || isAutoValidating) return
    // Guard: only fire validate when the provider-specific prerequisite is in settings.
    // AWS needs role_arn (set by the wizard); Azure needs tenant_id (set by the
    // consent-callback). Without these, validate will return 409 and show a
    // misleading error toast.
    const settings: any = integration.settings || {}
    if (config.provider === "AWS" && !settings.role_arn) return
    if (config.provider === "Azure" && !settings.tenant_id) return
    if (config.provider === "Zoom" && !settings._pending_zoom_creds && !settings.client_secret_encrypted) return
    let cancelled = false
    void (async () => {
      setIsAutoValidating(true)
      try {
        const accessToken = await getBackendToken()
        if (!accessToken) return
        const validateEndpoint =
          config.provider === "AWS"   ? "/api/integrations/aws/validate"
          : config.provider === "Azure" ? "/api/integrations/azure/validate"
          : /* Zoom */                  "/api/integrations/zoom/validate"
        const res = await fetch(`${API_BASE}${validateEndpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ integrationId: integration.id }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(`${config.label} validation failed`, { description: data?.hint || data?.error || `HTTP ${res.status}` })
          return
        }
        if (!cancelled) {
          toast.success(`${config.label} connected`)
          await onReload()
        }
      } finally {
        if (!cancelled) setIsAutoValidating(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [config.provider, config.label, integration.status, integration.id, isAutoValidating, onReload])

  const handleDelete = async () => {
    if (!confirm(`Delete ${integration.tool_name}? This cannot be undone.`)) return
    setIsDeleting(true)
    try {
      const accessToken = await getBackendToken()
      if (!accessToken) {
        router.push("/login")
        return
      }
      const res = await fetch(`${API_BASE}/api/integrations/${integration.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`)
      toast.success("Integration deleted")
      router.push("/dashboard/tools")
    } catch (err: any) {
      toast.error("Failed to delete integration", { description: err.message })
    } finally {
      setIsDeleting(false)
    }
  }

  const canReconnect = config.authType === "oauth"

  return (
    <ToolDetailShell
      integration={integration}
      config={config}
      canWrite={canWrite}
      onReconnect={canReconnect ? () => reconnect(integration.id) : undefined}
      onDelete={handleDelete}
      isReconnecting={isReconnecting}
      isDeleting={isDeleting}
    >
      {integration.status === "connected" ? (
        <ToolDetailTabs integration={integration} config={config} />
      ) : (
        <Card className="bg-white/[0.02] border-white/[0.06]">
          <CardContent className="p-8 text-center">
            {isAutoValidating ? (
              <p className="text-white/60 text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Validating {config.label}…
              </p>
            ) : (
              <p className="text-white/40 text-sm">
                This integration is currently {integration.status}.
                {canReconnect && " Click Reconnect above to restore access."}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </ToolDetailShell>
  )
}

// Fallback for a tool whose provider isn't in the registry.
function UnknownToolFallback({ integration }: { integration: Integration }) {
  return (
    <div className="p-8">
      <h2 className="text-xl font-display text-white mb-2">{integration.tool_name}</h2>
      <p className="text-white/40 text-sm mb-4">
        This tool is not registered. Please contact support or check that the tool name matches a registered provider.
      </p>
      <Link href="/dashboard/tools">
        <Button variant="outline">
          <ArrowLeft className="w-3 h-3 mr-1.5" /> Back to Tools
        </Button>
      </Link>
    </div>
  )
}
