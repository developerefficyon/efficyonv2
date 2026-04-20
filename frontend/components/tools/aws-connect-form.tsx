"use client"

import { useMemo, useState } from "react"
import type { ConnectComponentProps } from "@/lib/tools/types"

const ROLE_ARN_RE = /^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/

function generateExternalId() {
  // 32 hex chars. `crypto` is available in browsers (web crypto).
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

export function AwsConnectForm({ onSubmit, onCancel }: ConnectComponentProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [externalId, setExternalId] = useState("")
  const [roleArn, setRoleArn] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const backendOrigin =
    (typeof window !== "undefined" && (process.env.NEXT_PUBLIC_API_URL || "")) || ""

  const cloudFormationUrl = useMemo(() => {
    if (!externalId) return ""
    const templateUrl = `${backendOrigin || ""}/api/aws/cloudformation-template`
    const params = new URLSearchParams({
      templateURL: templateUrl,
      stackName: "efficyon-role",
      param_ExternalId: externalId,
    })
    return `https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/review?${params.toString()}`
  }, [backendOrigin, externalId])

  async function handleSubmit() {
    setError(null)
    if (!ROLE_ARN_RE.test(roleArn)) {
      setError("Role ARN must look like arn:aws:iam::123456789012:role/efficyon-cost-analyzer")
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ externalId, roleArn })
    } catch (e: any) {
      setError(e?.message || "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground">
        {[1, 2, 3].map((n) => (
          <li
            key={n}
            className={`flex items-center gap-2 ${step === n ? "text-foreground font-medium" : ""}`}
          >
            <span className={`h-6 w-6 rounded-full border grid place-items-center ${step >= n ? "bg-primary text-primary-foreground border-primary" : ""}`}>
              {n}
            </span>
            {n === 1 ? "Generate token" : n === 2 ? "Create IAM role" : "Paste role ARN"}
            {n < 3 && <span className="mx-2 text-muted-foreground/50">→</span>}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-md border p-4 bg-muted/30">
            <p className="text-sm">
              We&apos;ll generate a one-time <strong>external ID</strong> — a security token that AWS checks
              every time Efficyon assumes your role. It prevents a confused-deputy attack.
            </p>
          </div>

          {!externalId ? (
            <button
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
              onClick={() => setExternalId(generateExternalId())}
            >
              Generate external ID
            </button>
          ) : (
            <>
              <div className="rounded-md border p-3 flex items-center justify-between bg-background">
                <code className="text-sm font-mono">{externalId}</code>
                <button
                  className="text-xs underline"
                  onClick={() => navigator.clipboard.writeText(externalId)}
                >
                  Copy
                </button>
              </div>
              <div className="flex gap-2">
                <button className="text-sm underline" onClick={onCancel}>Cancel</button>
                <button
                  className="ml-auto rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
                  onClick={() => setStep(2)}
                >
                  Continue →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-md border p-4 bg-muted/30 text-sm">
            <p>
              Click the button below to open AWS CloudFormation pre-filled with our template. Sign
              in with your <strong>AWS Organization management account</strong>, review the IAM role,
              and click <em>Create stack</em>.
            </p>
            <p className="mt-2">After the stack status becomes <code>CREATE_COMPLETE</code>, copy the <strong>RoleArn</strong> from the <em>Outputs</em> tab and bring it back here.</p>
          </div>

          <a
            href={cloudFormationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
          >
            Launch CloudFormation in AWS Console ↗
          </a>

          <details className="rounded-md border p-3 text-sm bg-background" open={showAdvanced} onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
            <summary className="cursor-pointer font-medium">Advanced / manual setup</summary>
            <div className="mt-3 space-y-3 text-muted-foreground">
              <p>
                If CloudFormation is restricted in your org, create an IAM role named
                <code className="mx-1">efficyon-cost-analyzer</code> with the trust and permissions
                policies shown in the docs. Use this external ID in the trust policy:
              </p>
              <code className="block p-2 bg-muted rounded text-xs">{externalId}</code>
              <p>
                Permissions needed are read-only: <code>ce:Get*RecommendationS</code>,
                <code>compute-optimizer:Get*</code>, <code>organizations:DescribeOrganization</code>,
                <code>organizations:ListAccounts</code>, <code>account:ListRegions</code>,
                <code>ec2:DescribeRegions</code>.
              </p>
            </div>
          </details>

          <div className="flex gap-2">
            <button className="text-sm underline" onClick={() => setStep(1)}>← Back</button>
            <button
              className="ml-auto rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
              onClick={() => setStep(3)}
            >
              I&apos;ve created the role →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Role ARN
            <input
              type="text"
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
              placeholder="arn:aws:iam::123456789012:role/efficyon-cost-analyzer"
              value={roleArn}
              onChange={(e) => setRoleArn(e.target.value.trim())}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Find it in the CloudFormation stack&apos;s <em>Outputs</em> tab.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <button className="text-sm underline" onClick={() => setStep(2)} disabled={submitting}>← Back</button>
            <button
              className="ml-auto rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
              onClick={handleSubmit}
              disabled={submitting || !ROLE_ARN_RE.test(roleArn)}
            >
              {submitting ? "Connecting…" : "Connect"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AwsConnectForm
