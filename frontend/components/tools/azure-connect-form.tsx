"use client"

import { useState } from "react"
import type { ConnectComponentProps } from "@/lib/tools/types"
import { getBackendToken } from "@/lib/auth-hooks"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export function AzureConnectForm({ onSubmit, onCancel }: ConnectComponentProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGrantConsent() {
    setSubmitting(true)
    setError(null)
    try {
      // Create the integration row (status=pending) via the standard flow.
      await onSubmit({})

      // Fetch consent URL and redirect.
      const accessToken = await getBackendToken()
      if (!accessToken) throw new Error("Session expired")
      const res = await fetch(`${API_BASE}/api/integrations/azure/consent`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      if (!body.consentUrl) throw new Error("No consent URL returned")

      window.location.href = body.consentUrl
    } catch (e: any) {
      setError(e?.message || "Failed to start consent flow")
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4 bg-muted/30 text-sm">
        <p>
          Efficyon will redirect you to Microsoft to sign in as an <strong>Azure AD Global Administrator</strong>.
          After you grant admin consent, we&apos;ll auto-validate access to your subscriptions.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          After consent, you&apos;ll still need to assign the <strong>Reader</strong> role to the
          &quot;Efficyon Cost Analyzer (Azure)&quot; service principal at your tenant-root management group.
          We poll for up to 60 seconds while the role assignment propagates.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <button className="text-sm underline" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button
          className="ml-auto rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
          onClick={handleGrantConsent}
          disabled={submitting}
        >
          {submitting ? "Redirecting…" : "Grant consent in Azure AD"}
        </button>
      </div>
    </div>
  )
}

export default AzureConnectForm
