"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink, Shield, Info } from "lucide-react"
import Link from "next/link"
import { ToolLogo } from "@/components/tools/tool-logos"

const INTEGRATIONS = [
  { id: "fortnox", label: "Fortnox", color: "#2DB250", desc: "Finance & Accounting" },
  { id: "microsoft365", label: "Microsoft 365", color: "#0078D4", desc: "Productivity & Identity" },
  { id: "hubspot", label: "HubSpot", color: "#FF7A59", desc: "CRM & Marketing" },
  { id: "quickbooks", label: "QuickBooks", color: "#2CA01C", desc: "Financial Management" },
  { id: "shopify", label: "Shopify", color: "#95BF47", desc: "E-Commerce" },
  { id: "openai", label: "OpenAI", color: "#10A37F", desc: "AI Spend" },
  { id: "anthropic", label: "Anthropic", color: "#D97757", desc: "AI Spend" },
  { id: "gemini", label: "Gemini", color: "#4285F4", desc: "AI Spend" },
  { id: "googleworkspace", label: "Google Workspace", color: "#4285F4", desc: "Productivity & Identity" },
  { id: "slack", label: "Slack", color: "#ECB22E", desc: "Communication" },
  { id: "gcp", label: "Google Cloud", color: "#4285F4", desc: "Cloud Infrastructure" },
  { id: "aws", label: "Amazon Web Services", color: "#FF9900", desc: "Cloud Infrastructure" },
  { id: "azure", label: "Microsoft Azure", color: "#0078D4", desc: "Cloud Infrastructure" },
  { id: "zoom", label: "Zoom", color: "#2D8CFF", desc: "Productivity" },
  { id: "github", label: "GitHub", color: "#181717", desc: "Developer Tools" },
  { id: "stripe", label: "Stripe", color: "#635BFF", desc: "Revenue Recovery" },
  { id: "salesforce", label: "Salesforce", color: "#00A1E0", desc: "CRM & Sales" },
  { id: "notion", label: "Notion", color: "#000000", desc: "Productivity" },
  { id: "linear", label: "Linear", color: "#5E6AD2", desc: "Productivity" },
  { id: "atlassian", label: "Atlassian", color: "#0052CC", desc: "Productivity" },
  { id: "monday", label: "monday.com", color: "#FF3D57", desc: "Productivity" },
  { id: "asana", label: "Asana", color: "#F06A6A", desc: "Productivity" },
  { id: "airtable", label: "Airtable", color: "#FCB400", desc: "Productivity" },
] as const

function StepNumber({ n, color }: { n: number; color: string }) {
  return (
    <span
      className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono border"
      style={{
        backgroundColor: `${color}08`,
        borderColor: `${color}20`,
        color: `${color}cc`,
      }}
    >
      {String(n).padStart(2, "0")}
    </span>
  )
}

function ScopeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-mono bg-white/[0.03] border border-white/[0.06] text-white/50 tracking-tight">
      {children}
    </span>
  )
}

function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative p-4 rounded-xl bg-gradient-to-b from-white/[0.025] to-white/[0.01] border border-white/[0.05]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 rounded-md bg-white/[0.06] flex items-center justify-center">
          <Info className="w-2.5 h-2.5 text-white/30" />
        </div>
        <p className="text-[11.5px] font-medium text-white/40">{title}</p>
      </div>
      <p className="text-[11.5px] text-white/25 leading-relaxed pl-6">
        {children}
      </p>
    </div>
  )
}

function SecurityBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative p-4 rounded-xl bg-gradient-to-b from-emerald-500/[0.02] to-emerald-500/[0.005] border border-emerald-500/[0.08]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 rounded-md bg-emerald-500/[0.08] flex items-center justify-center">
          <Shield className="w-2.5 h-2.5 text-emerald-400/50" />
        </div>
        <p className="text-[11.5px] font-medium text-emerald-400/50">Security</p>
      </div>
      <p className="text-[11.5px] text-white/25 leading-relaxed pl-6">
        {children}
      </p>
    </div>
  )
}

export default function SetupGuidePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>("fortnox")

  useEffect(() => {
    const hash = window.location.hash?.replace("#", "")
    if (hash && INTEGRATIONS.some((i) => i.id === hash)) {
      setActiveTab(hash)
    }
  }, [])

  const activeIntegration = INTEGRATIONS.find((i) => i.id === activeTab) || INTEGRATIONS[0]

  return (
    <div className="space-y-6 w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/tools")}
          className="border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/70 hover:bg-white/[0.04] rounded-lg h-8 mt-1 shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back
        </Button>
        <div>
          <h2 className="text-[22px] font-semibold text-white/95 tracking-[-0.02em]">Setup Guide</h2>
          <p className="text-[13px] text-white/30 mt-0.5">Step-by-step integration instructions</p>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1.5 p-1 bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-x-auto">
        {INTEGRATIONS.map((i) => (
          <button
            key={i.id}
            onClick={() => setActiveTab(i.id)}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[12.5px] font-medium transition-all whitespace-nowrap ${
              activeTab === i.id
                ? "bg-white/[0.06] text-white/90 shadow-sm"
                : "text-white/30 hover:text-white/50 hover:bg-white/[0.02]"
            }`}
          >
            <ToolLogo name={i.id} size={24} />
            <span className="hidden sm:inline">{i.label}</span>
          </button>
        ))}
      </div>

      {/* Fortnox Section */}
      <section id="fortnox" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "fortnox" ? "hidden" : ""}`}>
        {/* Section header with brand accent */}
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#2DB250]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="fortnox" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Fortnox</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Finance & Accounting</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#2DB250]/50 mt-1">&#8226;</span>A Fortnox account</li>
              <li className="flex items-start gap-2"><span className="text-[#2DB250]/50 mt-1">&#8226;</span>Access to the Fortnox Developer Portal</li>
              <li className="flex items-start gap-2"><span className="text-[#2DB250]/50 mt-1">&#8226;</span>Admin rights on the Fortnox company you want to connect</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#2DB250" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to{" "}
                <a href="https://developer.fortnox.se" target="_blank" rel="noopener noreferrer" className="text-[#2DB250]/70 hover:text-[#2DB250] inline-flex items-center gap-1 transition-colors">
                  developer.fortnox.se <ExternalLink className="w-3 h-3" />
                </a>{" "}
                and sign in with your Fortnox credentials.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#2DB250" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Navigate to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">My Apps</span> and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create New App</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#2DB250" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Enter a name for your app (e.g. &quot;Effycion Integration&quot;) and a description.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#2DB250" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Set the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Redirect URI</span> to the one provided during your Effycion onboarding.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#2DB250" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Under <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Scopes</span>, enable the following permissions:
              </p>
            </div>
            <div className="ml-10 flex flex-wrap gap-1.5">
              <ScopeBadge>companyinformation</ScopeBadge>
              <ScopeBadge>customer</ScopeBadge>
              <ScopeBadge>invoice</ScopeBadge>
              <ScopeBadge>supplierinvoice</ScopeBadge>
              <ScopeBadge>bookkeeping</ScopeBadge>
              <ScopeBadge>salary</ScopeBadge>
              <ScopeBadge>article</ScopeBadge>
              <ScopeBadge>supplier</ScopeBadge>
              <ScopeBadge>settings</ScopeBadge>
              <ScopeBadge>profile</ScopeBadge>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#2DB250" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Save the app. Fortnox will generate a <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Client ID</span> and <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Client Secret</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#2DB250" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Copy both values securely. The Client Secret is only shown once.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={8} color="#2DB250" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Effycion, go to <Link href="/dashboard/tools" className="text-[#2DB250]/70 hover:text-[#2DB250] transition-colors">Tools & Integrations</Link>, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span>, select Fortnox, and paste your credentials.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={9} color="#2DB250" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>. You&apos;ll be redirected to Fortnox to authorize.
              </p>
            </div>
          </div>

          {/* Read-Only Enforcement */}
          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Optional: Enforce Read-Only Access</p>
            <p className="text-[12.5px] text-white/30 leading-relaxed">
              Effycion already only reads your Fortnox data — we never write, update, or delete anything. However, if you want Fortnox itself to enforce read-only access at the API level, you can use the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Fortnox Läs</span> (Fortnox Read) license:
            </p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#2DB250" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Fortnox, create a dedicated user for the integration (e.g. &quot;Effycion Integration&quot;).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#2DB250" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Assign that user only the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Fortnox Läs</span> (Fortnox Read) license — not the full Fortnox license.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#2DB250" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Have that user activate the Effycion integration. The integration will inherit the user&apos;s read-only permissions — Fortnox will block any write operations at the API level.
              </p>
            </div>

            <InfoBox title="Why this works">
              When an integration is activated by a user (rather than a service account), it inherits that user&apos;s license permissions. A user with only the Fortnox Läs license can only read data — so the integration is technically restricted to read-only access by Fortnox itself, regardless of what scopes are granted.
            </InfoBox>

            <InfoBox title="Note">
              The Fortnox Läs license is a separate license that may incur additional cost. This step is entirely optional — Effycion only uses read-only API calls regardless. This option is for customers who want Fortnox-enforced guarantees.
            </InfoBox>
          </div>

          <SecurityBox>
            Effycion uses only GET (read) requests to the Fortnox API. We never create, modify, or delete any data in your Fortnox account. Your OAuth tokens are encrypted with AES-256 and can be revoked at any time.
          </SecurityBox>
        </div>
      </section>

      {/* Microsoft 365 Section */}
      <section id="microsoft365" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "microsoft365" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#0078D4]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="microsoft365" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Microsoft 365</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Productivity & Identity</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#0078D4]/50 mt-1">&#8226;</span>A Microsoft 365 business subscription</li>
              <li className="flex items-start gap-2"><span className="text-[#0078D4]/50 mt-1">&#8226;</span>Azure AD admin (Global Admin or Application Administrator) access</li>
              <li className="flex items-start gap-2"><span className="text-[#0078D4]/50 mt-1">&#8226;</span>Access to the Azure Portal</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to{" "}
                <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-[#0078D4]/80 hover:text-[#0078D4] inline-flex items-center gap-1 transition-colors">
                  portal.azure.com <ExternalLink className="w-3 h-3" />
                </a>{" "}
                and sign in with your admin account.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Navigate to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Azure Active Directory</span> &gt; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">App registrations</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">New registration</span>. Enter a name (e.g. &quot;Effycion M365&quot;).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Under <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Supported account types</span>, select <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Accounts in this organizational directory only</span> (single tenant).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Set the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Redirect URI</span> to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Web</span> and enter your Effycion callback URL.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Register</span>. Copy the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Application (client) ID</span> and <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Directory (tenant) ID</span> from the overview page.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">API permissions</span> &gt; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Add a permission</span> &gt; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Microsoft Graph</span> &gt; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Application permissions</span> and add:
              </p>
            </div>

            <div className="ml-10 overflow-x-auto rounded-lg border border-white/[0.05]">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                    <th className="px-3.5 py-2 text-left text-white/40 font-medium">Permission</th>
                    <th className="px-3.5 py-2 text-left text-white/40 font-medium">Purpose</th>
                  </tr>
                </thead>
                <tbody className="text-white/30">
                  <tr className="border-b border-white/[0.03]">
                    <td className="px-3.5 py-2 font-mono text-white/45">User.Read.All</td>
                    <td className="px-3.5 py-2">Read all users&apos; profiles and license assignments</td>
                  </tr>
                  <tr className="border-b border-white/[0.03]">
                    <td className="px-3.5 py-2 font-mono text-white/45">Directory.Read.All</td>
                    <td className="px-3.5 py-2">Read subscribed licenses/SKUs and directory data</td>
                  </tr>
                  <tr className="border-b border-white/[0.03]">
                    <td className="px-3.5 py-2 font-mono text-white/45">AuditLog.Read.All</td>
                    <td className="px-3.5 py-2">Read sign-in activity logs</td>
                  </tr>
                  <tr className="border-b border-white/[0.03]">
                    <td className="px-3.5 py-2 font-mono text-white/45">Reports.Read.All</td>
                    <td className="px-3.5 py-2">Read Office 365, mailbox, and Teams usage reports</td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2 font-mono text-white/45">offline_access</td>
                    <td className="px-3.5 py-2">Maintain access via refresh tokens</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={8} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Grant admin consent for [your org]</span> and confirm. All permissions should show a green checkmark.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={9} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Certificates & secrets</span> &gt; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">New client secret</span>. Set an expiry (recommended: 12 months) and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Add</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={10} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Copy the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Value</span> of the secret immediately &mdash; it won&apos;t be shown again.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={11} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Effycion, go to <Link href="/dashboard/tools" className="text-[#0078D4]/80 hover:text-[#0078D4] transition-colors">Tools & Integrations</Link>, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span>, select Microsoft 365, and paste your Tenant ID, Client ID, and Client Secret. Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HubSpot Section */}
      <section id="hubspot" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "hubspot" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FF7A59]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="hubspot" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">HubSpot</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">CRM & Marketing</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#FF7A59]/50 mt-1">&#8226;</span>A HubSpot account with a paid plan (Starter, Professional, or Enterprise)</li>
              <li className="flex items-start gap-2"><span className="text-[#FF7A59]/50 mt-1">&#8226;</span>Super Admin access in HubSpot</li>
              <li className="flex items-start gap-2"><span className="text-[#FF7A59]/50 mt-1">&#8226;</span>Access to create Private Apps or OAuth Apps in your HubSpot account</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#FF7A59" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Log into{" "}
                <a href="https://app.hubspot.com" target="_blank" rel="noopener noreferrer" className="text-[#FF7A59]/70 hover:text-[#FF7A59] inline-flex items-center gap-1 transition-colors">
                  app.hubspot.com <ExternalLink className="w-3 h-3" />
                </a>{" "}
                with your Super Admin account.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#FF7A59" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Settings</span> gear icon in the top navigation bar.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#FF7A59" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In the left sidebar, navigate to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Integrations</span> &gt; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Private Apps</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#FF7A59" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create a private app</span>. Give it a name (e.g. &quot;Effycion&quot;) and description.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#FF7A59" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Scopes</span> tab and enable the following:
              </p>
            </div>
            <div className="ml-10 flex flex-wrap gap-1.5">
              <ScopeBadge>settings.users.read</ScopeBadge>
              <ScopeBadge>settings.users.write</ScopeBadge>
              <ScopeBadge>account-info.security.read</ScopeBadge>
              <ScopeBadge>crm.objects.contacts.read</ScopeBadge>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#FF7A59" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create app</span> and confirm. HubSpot will generate your access token and app credentials.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#FF7A59" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Copy the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Client ID</span> and <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Client Secret</span> from the app&apos;s Auth tab.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={8} color="#FF7A59" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Effycion, go to <Link href="/dashboard/tools" className="text-[#FF7A59]/70 hover:text-[#FF7A59] transition-colors">Tools & Integrations</Link>, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span>, select HubSpot, and paste your credentials.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={9} color="#FF7A59" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Fill in your pricing information (Hub type, tier, and paid seats) for accurate cost analysis, then click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>.
              </p>
            </div>
          </div>

          <InfoBox title="About Pricing Info">
            Effycion uses your HubSpot plan tier (Starter, Professional, Enterprise) and paid seat count to calculate per-seat costs and identify unused licenses. This data stays in your account and is never shared. You can find your current plan details in HubSpot under <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Settings &gt; Account & Billing</span>.
          </InfoBox>
        </div>
      </section>

      {/* QuickBooks Section */}
      <section id="quickbooks" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "quickbooks" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#2CA01C]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="quickbooks" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">QuickBooks</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Financial Management</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#2CA01C]/50 mt-1">&#8226;</span>A QuickBooks Online account (Simple Start, Essentials, Plus, or Advanced)</li>
              <li className="flex items-start gap-2"><span className="text-[#2CA01C]/50 mt-1">&#8226;</span>Admin access to the QuickBooks company you want to connect</li>
              <li className="flex items-start gap-2"><span className="text-[#2CA01C]/50 mt-1">&#8226;</span>An Intuit Developer account</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#2CA01C" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to{" "}
                <a href="https://developer.intuit.com" target="_blank" rel="noopener noreferrer" className="text-[#2CA01C]/70 hover:text-[#2CA01C] inline-flex items-center gap-1 transition-colors">
                  developer.intuit.com <ExternalLink className="w-3 h-3" />
                </a>{" "}
                and sign in with your Intuit account (or create one).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#2CA01C" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Navigate to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Dashboard</span> and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create an app</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#2CA01C" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Select <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">QuickBooks Online and Payments</span> as the platform. Enter a name (e.g. &quot;Effycion Integration&quot;).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#2CA01C" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Under <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Scopes</span>, enable the following:
              </p>
            </div>
            <div className="ml-10 flex flex-wrap gap-1.5">
              <ScopeBadge>com.intuit.quickbooks.accounting</ScopeBadge>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#2CA01C" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Keys & credentials</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#2CA01C" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Scroll to the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">URIs</span> section and fill in the following:
              </p>
            </div>
            <div className="ml-10 overflow-x-auto rounded-lg border border-white/[0.05]">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                    <th className="px-3.5 py-2 text-left text-white/40 font-medium">Field</th>
                    <th className="px-3.5 py-2 text-left text-white/40 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody className="text-white/30">
                  <tr className="border-b border-white/[0.03]">
                    <td className="px-3.5 py-2 font-mono text-white/45">Host domain</td>
                    <td className="px-3.5 py-2 font-mono">efficyonv2.onrender.com</td>
                  </tr>
                  <tr className="border-b border-white/[0.03]">
                    <td className="px-3.5 py-2 font-mono text-white/45">Launch URL</td>
                    <td className="px-3.5 py-2 font-mono">https://www.efficyon.com/dashboard/tools</td>
                  </tr>
                  <tr className="border-b border-white/[0.03]">
                    <td className="px-3.5 py-2 font-mono text-white/45">Disconnect URL</td>
                    <td className="px-3.5 py-2 font-mono">https://www.efficyon.com/dashboard/tools</td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2 font-mono text-white/45">Connect URL</td>
                    <td className="px-3.5 py-2 font-mono text-[10px]">https://efficyonv2.onrender.com/api/integrations/quickbooks/callback</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#2CA01C" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Copy your <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Client ID</span> and <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Client Secret</span> from the same Keys & credentials page.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={8} color="#2CA01C" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Effycion, go to <Link href="/dashboard/tools" className="text-[#2CA01C]/70 hover:text-[#2CA01C] transition-colors">Tools & Integrations</Link>, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span>, select QuickBooks, and paste your Client ID and Client Secret.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={9} color="#2CA01C" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>. You&apos;ll be redirected to Intuit&apos;s OAuth screen to authorize read-only access.
              </p>
            </div>
          </div>

          <SecurityBox>
            Effycion uses OAuth 2.0 with the <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">com.intuit.quickbooks.accounting</span> scope for read-only access. Your Client Secret and OAuth tokens are encrypted at rest using AES-256-GCM. Effycion will never create, modify, or delete any data in your QuickBooks account.
          </SecurityBox>
        </div>
      </section>

      {/* Shopify Section */}
      <section id="shopify" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "shopify" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#95BF47]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="shopify" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Shopify</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">E-Commerce</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#95BF47]/50 mt-1">&#8226;</span>A Shopify store with an active plan</li>
              <li className="flex items-start gap-2"><span className="text-[#95BF47]/50 mt-1">&#8226;</span>Store owner or staff account with <span className="font-mono text-white/55 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Apps</span> permission</li>
              <li className="flex items-start gap-2"><span className="text-[#95BF47]/50 mt-1">&#8226;</span>Access to the Shopify Partners dashboard (for creating a custom app)</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#95BF47" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Log into your Shopify admin at{" "}
                <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">your-store.myshopify.com/admin</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#95BF47" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Settings</span> &gt; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Apps and sales channels</span> &gt; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Develop apps</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#95BF47" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                If this is your first custom app, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Allow custom app development</span> and confirm.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#95BF47" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create an app</span>. Enter a name (e.g. &quot;Effycion&quot;) and select an app developer.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#95BF47" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Configuration</span> &gt; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Admin API integration</span> and enable the following scopes:
              </p>
            </div>
            <div className="ml-10 flex flex-wrap gap-1.5">
              <ScopeBadge>read_orders</ScopeBadge>
              <ScopeBadge>read_products</ScopeBadge>
              <ScopeBadge>read_inventory</ScopeBadge>
              <ScopeBadge>read_analytics</ScopeBadge>
              <ScopeBadge>read_billing</ScopeBadge>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#95BF47" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Under <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Allowed redirection URL(s)</span>, add the callback URL provided by Effycion during onboarding.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#95BF47" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Save the configuration, then go to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">API credentials</span>. Copy your <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">API key</span> (Client ID) and <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">API secret key</span> (Client Secret).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={8} color="#95BF47" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Note your shop domain &mdash; it&apos;s the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">your-store.myshopify.com</span> URL (not a custom domain).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={9} color="#95BF47" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Effycion, go to <Link href="/dashboard/tools" className="text-[#95BF47]/70 hover:text-[#95BF47] transition-colors">Tools & Integrations</Link>, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span>, select Shopify, and paste your Client ID, Client Secret, and Shop Domain.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={10} color="#95BF47" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>. You&apos;ll be redirected to Shopify to authorize access. Once approved, your store data will begin syncing.
              </p>
            </div>
          </div>

          <SecurityBox>
            Shopify access tokens are permanent and do not expire unless the app is uninstalled. Your API secret key and access token are encrypted at rest using AES-256-GCM. Effycion verifies all OAuth callbacks using HMAC-SHA256. All scopes are read-only &mdash; Effycion will never modify your store data.
          </SecurityBox>
        </div>
      </section>

      {/* OpenAI Section */}
      <section id="openai" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "openai" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#10A37F]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="openai" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">OpenAI</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">AI Spend</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#10A37F]/50 mt-1">&#8226;</span>An OpenAI organization (Team, Enterprise, or Pay-as-you-go)</li>
              <li className="flex items-start gap-2"><span className="text-[#10A37F]/50 mt-1">&#8226;</span>Owner role on the OpenAI organization (required to mint Admin keys)</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#10A37F" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to{" "}
                <a href="https://platform.openai.com/settings/organization/admin-keys" target="_blank" rel="noopener noreferrer" className="text-[#10A37F]/80 hover:text-[#10A37F] inline-flex items-center gap-1 transition-colors">
                  platform.openai.com/settings/organization/admin-keys <ExternalLink className="w-3 h-3" />
                </a>
                .
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#10A37F" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create new admin key</span>. Give it a name (e.g. &quot;Effycion&quot;).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#10A37F" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Copy the generated key (starts with <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">sk-admin-</span>) immediately &mdash; it will not be shown again.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#10A37F" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Effycion, go to <Link href="/dashboard/tools" className="text-[#10A37F]/80 hover:text-[#10A37F] transition-colors">Tools & Integrations</Link>, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span>, select OpenAI, and paste your Admin key.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#10A37F" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>. Effycion will pull the last 90 days of usage and cost data from the Usage and Costs APIs.
              </p>
            </div>
          </div>

          <SecurityBox>
            Admin keys are read-only for usage/cost endpoints in Effycion &mdash; we never call inference, mutate org settings, or create resources. Your key is encrypted at rest using AES-256-GCM and you can revoke it at any time from the OpenAI dashboard.
          </SecurityBox>
        </div>
      </section>

      {/* Anthropic Section */}
      <section id="anthropic" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "anthropic" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4A27F]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="anthropic" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Anthropic</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">AI Spend</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#D4A27F]/50 mt-1">&#8226;</span>An Anthropic Console organization with billing enabled</li>
              <li className="flex items-start gap-2"><span className="text-[#D4A27F]/50 mt-1">&#8226;</span>Admin role on the workspace (required to create Admin API keys)</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#D4A27F" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to{" "}
                <a href="https://console.anthropic.com/settings/admin-keys" target="_blank" rel="noopener noreferrer" className="text-[#D4A27F]/80 hover:text-[#D4A27F] inline-flex items-center gap-1 transition-colors">
                  console.anthropic.com/settings/admin-keys <ExternalLink className="w-3 h-3" />
                </a>
                .
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#D4A27F" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create Admin Key</span>. Name it (e.g. &quot;Effycion&quot;) and confirm.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#D4A27F" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Copy the key (starts with <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">sk-ant-admin-</span>) immediately &mdash; it will not be shown again.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#D4A27F" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Effycion, go to <Link href="/dashboard/tools" className="text-[#D4A27F]/80 hover:text-[#D4A27F] transition-colors">Tools & Integrations</Link>, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span>, select Anthropic, paste your Admin key, and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>.
              </p>
            </div>
          </div>

          <SecurityBox>
            Effycion only calls Anthropic&apos;s Usage and Cost Reports endpoints &mdash; never the Messages API. The Admin key is encrypted at rest using AES-256-GCM and can be revoked from the Anthropic Console at any time.
          </SecurityBox>
        </div>
      </section>

      {/* Gemini Section */}
      <section id="gemini" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "gemini" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#4285F4]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="gemini" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Gemini (Vertex AI)</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">AI Spend</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#4285F4]/50 mt-1">&#8226;</span>A Google Cloud project with the Vertex AI / Gemini API enabled</li>
              <li className="flex items-start gap-2"><span className="text-[#4285F4]/50 mt-1">&#8226;</span>Cloud Billing enabled and billing export to BigQuery configured (recommended for actual cost)</li>
              <li className="flex items-start gap-2"><span className="text-[#4285F4]/50 mt-1">&#8226;</span>IAM permission to create service accounts and grant roles</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#4285F4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to{" "}
                <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer" className="text-[#4285F4]/80 hover:text-[#4285F4] inline-flex items-center gap-1 transition-colors">
                  console.cloud.google.com &rsaquo; IAM &rsaquo; Service Accounts <ExternalLink className="w-3 h-3" />
                </a>
                {" "}and select your project.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#4285F4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create service account</span>. Name it (e.g. &quot;effycion-gemini-reader&quot;).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#4285F4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Grant the following IAM roles:
              </p>
            </div>
            <div className="ml-10 flex flex-wrap gap-1.5">
              <ScopeBadge>roles/monitoring.viewer</ScopeBadge>
              <ScopeBadge>roles/bigquery.dataViewer</ScopeBadge>
              <ScopeBadge>roles/bigquery.jobUser</ScopeBadge>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#4285F4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Open the service account &gt; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Keys</span> &gt; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Add key &rsaquo; Create new key &rsaquo; JSON</span>. A <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">.json</span> credentials file will download.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#4285F4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                <span className="text-white/55">(Optional, recommended)</span> Set up a billing export to BigQuery so Effycion can pull <em>actual</em> costs instead of estimates. Note the fully-qualified table name, e.g. <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">project.dataset.gcp_billing_export_v1_XXXXXX</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#4285F4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Effycion, go to <Link href="/dashboard/tools" className="text-[#4285F4]/80 hover:text-[#4285F4] transition-colors">Tools & Integrations</Link>, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span>, select Gemini, paste the contents of the JSON key file, and (if applicable) the BigQuery billing table name.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#4285F4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>. Effycion will validate the credentials and start syncing usage.
              </p>
            </div>
          </div>

          <InfoBox title="Estimated vs. Actual cost">
            Without a BigQuery billing export, Effycion estimates Gemini cost using token counts from Cloud Monitoring multiplied by Vertex AI list prices. With the export, costs come straight from your Cloud Billing data and reflect any committed-use or negotiated discounts.
          </InfoBox>

          <SecurityBox>
            The service account JSON is encrypted at rest using AES-256-GCM. All granted roles are read-only. You can revoke access at any time by deleting the service account key from the Google Cloud Console.
          </SecurityBox>
        </div>
      </section>

      {/* Google Workspace Section */}
      <section id="googleworkspace" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "googleworkspace" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#34A853]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="googleworkspace" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Google Workspace</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Productivity & Identity</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#34A853]/50 mt-1">&#8226;</span>A Google Workspace tenant (Business Starter or higher)</li>
              <li className="flex items-start gap-2"><span className="text-[#34A853]/50 mt-1">&#8226;</span>Super Admin role in the Workspace Admin Console</li>
              <li className="flex items-start gap-2"><span className="text-[#34A853]/50 mt-1">&#8226;</span>A Google Cloud project where you can create an OAuth client</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#34A853" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to{" "}
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-[#34A853]/80 hover:text-[#34A853] inline-flex items-center gap-1 transition-colors">
                  console.cloud.google.com &rsaquo; APIs & Services &rsaquo; Credentials <ExternalLink className="w-3 h-3" />
                </a>
                .
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#34A853" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Configure the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">OAuth consent screen</span> as <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Internal</span> (so only your Workspace users can authorize).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#34A853" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Enable these APIs on the project: <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Admin SDK API</span> and <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Reports API</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#34A853" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create Credentials &rsaquo; OAuth client ID &rsaquo; Web application</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#34A853" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Set the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Authorized redirect URI</span> to:
              </p>
            </div>
            <div className="ml-10 overflow-x-auto rounded-lg border border-white/[0.05] bg-white/[0.02] px-3.5 py-2">
              <code className="text-[11.5px] font-mono text-white/55">https://efficyonv2.onrender.com/api/integrations/googleworkspace/callback</code>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#34A853" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Save and copy the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Client ID</span> and <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Client Secret</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#34A853" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                The following read-only scopes will be requested when you authorize:
              </p>
            </div>
            <div className="ml-10 flex flex-wrap gap-1.5">
              <ScopeBadge>admin.directory.user.readonly</ScopeBadge>
              <ScopeBadge>admin.directory.customer.readonly</ScopeBadge>
              <ScopeBadge>admin.directory.group.readonly</ScopeBadge>
              <ScopeBadge>admin.reports.audit.readonly</ScopeBadge>
              <ScopeBadge>admin.reports.usage.readonly</ScopeBadge>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={8} color="#34A853" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Effycion, go to <Link href="/dashboard/tools" className="text-[#34A853]/80 hover:text-[#34A853] transition-colors">Tools & Integrations</Link>, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span>, select Google Workspace, and paste your Client ID and Client Secret.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={9} color="#34A853" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>. You&apos;ll be redirected to Google to authorize as a Super Admin. After consent, Effycion begins pulling user, license, and usage data.
              </p>
            </div>
          </div>

          <SecurityBox>
            All requested scopes are read-only. Your OAuth client secret and refresh tokens are encrypted at rest using AES-256-GCM. Effycion will never modify users, groups, or settings in your Workspace tenant. Access can be revoked at any time from <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">admin.google.com &rsaquo; Security &rsaquo; API controls</span>.
          </SecurityBox>
        </div>
      </section>

      {/* Slack Section */}
      <section id="slack" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "slack" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#ECB22E]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="slack" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Slack</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Communication</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#ECB22E]/50 mt-1">&#8226;</span>A Slack workspace with admin (Owner or Workspace Admin) access</li>
              <li className="flex items-start gap-2"><span className="text-[#ECB22E]/50 mt-1">&#8226;</span>Permission to install custom apps into your workspace</li>
              <li className="flex items-start gap-2"><span className="text-[#ECB22E]/50 mt-1">&#8226;</span>Your Slack plan tier (Free, Pro, or Business+) and paid seat count — used to calculate per-seat costs</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#ECB22E" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to{" "}
                <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-[#ECB22E]/80 hover:text-[#ECB22E] inline-flex items-center gap-1 transition-colors">
                  api.slack.com/apps <ExternalLink className="w-3 h-3" />
                </a>
                {" "}and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create New App</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">From scratch</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#ECB22E" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Name the app (e.g. <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Effycion Cost Analyzer</span>) and pick the workspace you want to analyze.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#ECB22E" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  In the sidebar, open <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">OAuth & Permissions</span>. Under <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">User Token Scopes</span>, add these read-only scopes:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>users:read</ScopeBadge>
                  <ScopeBadge>users:read.email</ScopeBadge>
                  <ScopeBadge>team:read</ScopeBadge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#ECB22E" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Still in <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">OAuth & Permissions</span>, add a <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Redirect URL</span>: <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">&lt;your-backend&gt;/api/integrations/slack/callback</span> and save.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#ECB22E" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Open <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Basic Information</span> and copy the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Client ID</span> and <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Client Secret</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#ECB22E" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Effycion, go to <Link href="/dashboard/tools" className="text-[#ECB22E]/80 hover:text-[#ECB22E] transition-colors">Tools & Integrations</Link>, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span>, select Slack, and paste your credentials.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#ECB22E" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Pick your <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Plan Tier</span> (Free, Pro, Business+) and optionally enter your <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Paid Seats</span>. If left blank, Effycion auto-detects seats after connection.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={8} color="#ECB22E" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>. You&apos;ll be redirected to Slack to authorize. After consent, Effycion pulls user, team, and seat data.
              </p>
            </div>
          </div>

          <InfoBox title="About seat data">
            Slack&apos;s API does not expose billing directly. Effycion uses your selected plan tier and paid-seat count to estimate per-seat cost and flag inactive members. Tier pricing is based on public Slack list prices (Pro ~$8.75/seat, Business+ ~$15/seat).
          </InfoBox>

          <SecurityBox>
            All requested scopes are read-only — Effycion can list users and read workspace info but cannot post messages, join channels, or modify any Slack data. Your OAuth client secret and user token are encrypted at rest using AES-256-GCM. Slack user tokens do not expire, so this is a one-time setup; you can revoke access any time from <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">slack.com &rsaquo; Settings & administration &rsaquo; Manage apps</span>.
          </SecurityBox>
        </div>
      </section>

      {/* GCP Section */}
      <section id="gcp" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "gcp" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#4285F4]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="gcp" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Google Cloud</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Cloud Infrastructure</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#4285F4]/50 mt-1">&#8226;</span>A Google Cloud <strong>Organization</strong> (free Workspace or Cloud Identity tenant — single-project setups are not supported)</li>
              <li className="flex items-start gap-2"><span className="text-[#4285F4]/50 mt-1">&#8226;</span><strong>Org-level IAM admin</strong> permission (Organization Admin role) to grant the two read roles below</li>
              <li className="flex items-start gap-2"><span className="text-[#4285F4]/50 mt-1">&#8226;</span>The Recommender API enabled on each project — Google enables it automatically once recommendations exist; otherwise turn it on at <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">APIs & Services &rsaquo; Library</span></li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#4285F4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Open the{" "}
                <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer" className="text-[#4285F4]/80 hover:text-[#4285F4] inline-flex items-center gap-1 transition-colors">
                  Service Accounts page <ExternalLink className="w-3 h-3" />
                </a>
                {" "}and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create Service Account</span>. Name it <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">efficyon-cost-analyzer</span>. Skip the optional &quot;Grant this service account access to project&quot; step — we&apos;ll grant org-level roles instead. Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Done</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#4285F4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Open the new service account &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Keys</span> tab &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Add Key</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create new key</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">JSON</span>. A <code className="text-white/40">.json</code> file downloads — keep it safe.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#4285F4" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Switch the IAM scope to your <strong>organization</strong> (top-of-page resource picker). On <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">IAM &amp; Admin &rsaquo; IAM</span>, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Grant Access</span>, paste the service account&apos;s email (looks like <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">efficyon-cost-analyzer@&lt;project&gt;.iam.gserviceaccount.com</span>), and grant these two read-only roles:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>roles/recommender.viewer</ScopeBadge>
                  <ScopeBadge>roles/browser</ScopeBadge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#4285F4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Find your Organization ID at <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">IAM &amp; Admin &rsaquo; Settings</span>. Format is <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">organizations/&lt;numeric-id&gt;</span>. Copy it.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#4285F4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Back in Effycion, <Link href="/dashboard/tools" className="text-[#4285F4]/80 hover:text-[#4285F4] transition-colors">Tools & Integrations</Link> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span> &rsaquo; Google Cloud. Paste the entire JSON key contents and the Organization ID, then click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#4285F4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Effycion exchanges the JWT for a Google access token and lists your active projects within a few seconds. Switch to the Analysis tab and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Run Analysis</span>. The Recommender API is queried across every active project × 7+ recommender types × locations — expect 30–120s for orgs with many projects.
              </p>
            </div>
          </div>

          <InfoBox title="About findings">
            Effycion calls Google&apos;s <strong>Recommender API v1</strong> across all ACTIVE projects and seven recommender types: idle VM deletion, wrong machine type, disk downsize, unused IP addresses, and more. Cost projections come straight from <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">primaryImpact.costProjection.cost</span> — Google&apos;s own estimate in nano-units, not Effycion&apos;s. Severity maps to Google&apos;s recommendation priority.
          </InfoBox>

          <SecurityBox>
            The service account JSON is encrypted at rest with AES-256-GCM before persisting. The two granted roles are read-only — Effycion can list resources and read recommendations but cannot modify, create, or delete anything. Per analysis we mint a fresh 1-hour OAuth access token from the JWT (cached in-process only). To revoke access at any time, delete the <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">efficyon-cost-analyzer</span> service account or just its JSON key in IAM & Admin &rsaquo; Service Accounts.
          </SecurityBox>
        </div>
      </section>

      {/* AWS Section */}
      <section id="aws" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "aws" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FF9900]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="aws" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Amazon Web Services</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Cloud Infrastructure</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#FF9900]/50 mt-1">&#8226;</span>An AWS Organization (one integration covers all member accounts — single-account setups are not yet supported)</li>
              <li className="flex items-start gap-2"><span className="text-[#FF9900]/50 mt-1">&#8226;</span>Sign-in access to the Organization&apos;s <strong>management (payer) account</strong> with permission to run CloudFormation</li>
              <li className="flex items-start gap-2"><span className="text-[#FF9900]/50 mt-1">&#8226;</span>AWS Compute Optimizer opted in (free) — enable at <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Compute Optimizer &rsaquo; Get started</span> in the management account if not already on</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#FF9900" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Effycion, go to <Link href="/dashboard/tools" className="text-[#FF9900]/80 hover:text-[#FF9900] transition-colors">Tools & Integrations</Link>, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span>, and select <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Amazon Web Services</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#FF9900" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Generate external ID</span>. A 32-character security token appears — it&apos;s automatically threaded into the CloudFormation template on the next step, so you don&apos;t need to copy it manually.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#FF9900" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Launch CloudFormation in AWS Console</span>. A new tab opens the{" "}
                <a href="https://console.aws.amazon.com/cloudformation/home" target="_blank" rel="noopener noreferrer" className="text-[#FF9900]/80 hover:text-[#FF9900] inline-flex items-center gap-1 transition-colors">
                  CloudFormation console <ExternalLink className="w-3 h-3" />
                </a>
                {" "}with the stack template and <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">ExternalId</span> pre-filled. Sign in with your <strong>Organization management account</strong>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#FF9900" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Review the IAM role (read-only — actions listed below), check the capabilities acknowledgement, and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create stack</span>. Wait for status <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">CREATE_COMPLETE</span> (~30s).
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>ce:Get*Recommendation</ScopeBadge>
                  <ScopeBadge>compute-optimizer:Get*</ScopeBadge>
                  <ScopeBadge>organizations:Describe/ListAccounts</ScopeBadge>
                  <ScopeBadge>account:ListRegions</ScopeBadge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#FF9900" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Open the stack&apos;s <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Outputs</span> tab and copy the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">RoleArn</span> value — it looks like <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">arn:aws:iam::&lt;account&gt;:role/efficyon-cost-analyzer</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#FF9900" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Back in the Effycion wizard, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">I&apos;ve created the role →</span>, paste the Role ARN, and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#FF9900" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Effycion auto-validates the role via AWS STS — you&apos;ll see <em>Validating AWS role…</em> flip to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">connected</span> within a few seconds. The Data tab populates with your organization, member accounts, and active regions.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={8} color="#FF9900" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Switch to the Analysis tab and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Run Analysis</span>. Findings normally take 15–60s depending on organization size and number of active regions.
              </p>
            </div>
          </div>

          <InfoBox title="About findings">
            Efficyon pulls recommendations from two AWS services: <strong>Cost Explorer</strong> (EC2 right-sizing, Savings Plan purchases, Reserved Instance purchases) and <strong>Compute Optimizer</strong> (EC2 / EBS / Lambda / Auto Scaling / ECS / RDS right-sizing plus idle-resource detection). Savings numbers come from AWS&apos;s own cost projections, not Effycion estimates. One management-account role covers every member account in your Organization.
          </InfoBox>

          <SecurityBox>
            No long-lived AWS credentials are stored. We persist only the role ARN and the external ID — both worthless to an attacker without our own AWS account&apos;s IAM identity. Every analysis run issues a fresh 1-hour STS temporary credential set (cached in-process only). All granted IAM actions are read-only — Effycion cannot modify, create, or delete any resource. Revoke access any time by deleting the IAM role <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">efficyon-cost-analyzer</span> or the CloudFormation stack that created it in your AWS console.
          </SecurityBox>
        </div>
      </section>

      {/* Azure Section */}
      <section id="azure" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "azure" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#0078D4]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="azure" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Microsoft Azure</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Cloud Infrastructure</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#0078D4]/50 mt-1">&#8226;</span>An Azure AD (Entra ID) tenant with <strong>Global Administrator</strong> access</li>
              <li className="flex items-start gap-2"><span className="text-[#0078D4]/50 mt-1">&#8226;</span>Permission to assign roles at a subscription or management-group scope</li>
              <li className="flex items-start gap-2"><span className="text-[#0078D4]/50 mt-1">&#8226;</span>Subscriptions with the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Microsoft.Advisor</span> resource provider registered (default on most)</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Effycion, go to <Link href="/dashboard/tools" className="text-[#0078D4]/80 hover:text-[#0078D4] transition-colors">Tools & Integrations</Link>, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span>, and select <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Microsoft Azure</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Grant consent in Azure AD</span>. You&apos;ll be redirected to{" "}
                <a href="https://login.microsoftonline.com" target="_blank" rel="noopener noreferrer" className="text-[#0078D4]/80 hover:text-[#0078D4] inline-flex items-center gap-1 transition-colors">
                  login.microsoftonline.com <ExternalLink className="w-3 h-3" />
                </a>
                .
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#0078D4" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Sign in as <strong>Global Administrator</strong>. Review the consent screen — only these scopes are requested:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>Azure Service Management / user_impersonation</ScopeBadge>
                </div>
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Accept</span>. You&apos;ll be redirected back to Effycion.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#0078D4" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Admin consent creates a Service Principal in your tenant but does <strong>not</strong> grant it any subscription access. Assign the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Reader</span> role:
                </p>
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Open{" "}
                  <a href="https://portal.azure.com/#view/Microsoft_Azure_ManagementGroups/ManagementGroupBrowseBlade" target="_blank" rel="noopener noreferrer" className="text-[#0078D4]/80 hover:text-[#0078D4] inline-flex items-center gap-1 transition-colors">
                    Azure Portal → Management Groups <ExternalLink className="w-3 h-3" />
                  </a>
                  {" "}→ select your <strong>Tenant Root Group</strong> → <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Access control (IAM)</span> → <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Add role assignment</span> → <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Reader</span> → select member <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Efficyon Cost Analyzer (Azure)</span> → save.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Effycion auto-polls for up to 60 seconds. Once the role assignment propagates, the status flips to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">connected</span> and the Data tab shows your subscriptions.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#0078D4" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Switch to the Analysis tab and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Run Analysis</span>. Findings normally take 10–30 seconds depending on subscription count.
              </p>
            </div>
          </div>

          <InfoBox title="About findings">
            Effycion pulls recommendations from <strong>Azure Advisor</strong> (Cost category) — Microsoft&apos;s pre-computed rightsizing, idle-resource, and reserved-instance opportunities. Savings come from Microsoft&apos;s own projections; most are derived from <code>annualSavingsAmount / 12</code>.
          </InfoBox>

          <SecurityBox>
            No long-lived Azure credentials are stored. Only the tenant ID is persisted. Every analysis issues a fresh 1-hour OAuth 2.0 app-only token (cached in-process only). All granted permissions are read-only — Effycion cannot modify, create, or delete any Azure resource. Revoke access any time by removing the <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Efficyon Cost Analyzer (Azure)</span> enterprise application from your Entra ID tenant.
          </SecurityBox>
        </div>
      </section>

      {/* Zoom Section */}
      <section id="zoom" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "zoom" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#2D8CFF]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="zoom" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Zoom</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Productivity</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#2D8CFF]/50 mt-1">&#8226;</span>A Zoom account with admin access (Owner or Admin role)</li>
              <li className="flex items-start gap-2"><span className="text-[#2D8CFF]/50 mt-1">&#8226;</span>Permission to create Server-to-Server OAuth apps in your account</li>
              <li className="flex items-start gap-2"><span className="text-[#2D8CFF]/50 mt-1">&#8226;</span>Your plan tier (Pro / Business / Business Plus / Enterprise) — used for per-seat savings math</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#2D8CFF" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to{" "}
                <a href="https://marketplace.zoom.us" target="_blank" rel="noopener noreferrer" className="text-[#2D8CFF]/80 hover:text-[#2D8CFF] inline-flex items-center gap-1 transition-colors">
                  marketplace.zoom.us <ExternalLink className="w-3 h-3" />
                </a>
                {" "}and sign in with your admin Zoom account.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#2D8CFF" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Develop</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Build App</span> &rsaquo; select <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Server-to-Server OAuth</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#2D8CFF" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Name the app <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Efficyon Cost Analyzer</span> and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#2D8CFF" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Under <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Scopes</span>, add these read-only admin scopes:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>user:read:list_users:admin</ScopeBadge>
                  <ScopeBadge>user:read:user:admin</ScopeBadge>
                  <ScopeBadge>account:read:list_addons:admin</ScopeBadge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#2D8CFF" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Activate</span>. Open <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">App Credentials</span> and copy the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Account ID</span>, <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Client ID</span>, and <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Client Secret</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#2D8CFF" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Back in Efficyon, <Link href="/dashboard/tools" className="text-[#2D8CFF]/80 hover:text-[#2D8CFF] transition-colors">Tools & Integrations</Link> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span> &rsaquo; Zoom. Paste the three values, pick your plan tier, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>. Effycion auto-validates within a few seconds.
              </p>
            </div>
          </div>

          <InfoBox title="About pricing math">
            Zoom&apos;s API doesn&apos;t expose per-user billing. Effycion uses your selected plan tier and public list prices (Pro $14.99 / Business $21.99 / Business Plus $26.99) to estimate per-seat savings. Enterprise pricing defaults to Business Plus; you can update the plan tier any time by reconnecting.
          </InfoBox>

          <SecurityBox>
            All requested scopes are read-only — Effycion can list users and read activity data but cannot modify, create, or delete anything in your Zoom account. Your <code>Client Secret</code> is encrypted at rest with AES-256-GCM before persisting to our database. We mint fresh 1-hour access tokens per analysis (cached in-process only). Revoke access any time by deactivating or deleting the <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Efficyon Cost Analyzer</span> S2S app at marketplace.zoom.us &rsaquo; Develop &rsaquo; Manage.
          </SecurityBox>
        </div>
      </section>

      {/* GitHub Section */}
      <section id="github" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "github" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#181717]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="github" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">GitHub</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Developer Tools</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#181717]/50 mt-1">&#8226;</span>Org admin access on the GitHub organization you want to analyze</li>
              <li className="flex items-start gap-2"><span className="text-[#181717]/50 mt-1">&#8226;</span>Permission to create GitHub Apps in your organization&apos;s Developer settings</li>
              <li className="flex items-start gap-2"><span className="text-[#181717]/50 mt-1">&#8226;</span>Your plan tier (Team / Enterprise) to use for per-seat savings math</li>
              <li className="flex items-start gap-2"><span className="text-[#181717]/50 mt-1">&#8226;</span>Ideally Copilot Business or Enterprise enabled — Copilot seat analysis requires it</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#181717" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In your GitHub org: <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Settings</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Developer settings</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">GitHub Apps</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">New GitHub App</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#181717" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Name it <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Efficyon Cost Analyzer</span>. Fill in any homepage URL (e.g. <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">https://efficyon.com</span>). Under <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Webhook</span>, uncheck <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Active</span> — Effycion doesn&apos;t need webhooks.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#181717" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Under <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Organization permissions</span>, grant these three <strong className="text-white/50">Read</strong> permissions:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>Organization Members: Read</ScopeBadge>
                  <ScopeBadge>Organization Administration: Read</ScopeBadge>
                  <ScopeBadge>Organization Copilot Business: Read</ScopeBadge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#181717" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create GitHub App</span>. On the app&apos;s page, scroll to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Private keys</span> and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Generate a private key</span>. A <code className="text-white/40">.pem</code> file downloads automatically — keep it safe.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#181717" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Install App</span> on the left sidebar and install it on your organization. After confirming, the URL will contain <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">/installations/&lt;id&gt;</span> — copy that number as your Installation ID.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#181717" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Back in Efficyon, <Link href="/dashboard/tools" className="text-white/60 hover:text-white/80 transition-colors">Tools & Integrations</Link> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span> &rsaquo; GitHub. Paste the App ID, the full contents of the <code className="text-white/40">.pem</code> file (including <code className="text-white/40">-----BEGIN RSA PRIVATE KEY-----</code>), and the Installation ID. Pick your Plan tier and Copilot tier, then click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>. Effycion auto-validates within a few seconds.
              </p>
            </div>
          </div>

          <InfoBox title="About pricing math">
            Copilot Business is $19/seat/mo; Copilot Enterprise is $39/seat/mo. Team plan is $4/user/mo; Enterprise is $21/user/mo. GitHub&apos;s API doesn&apos;t expose per-user billing directly, so Effycion uses these public list prices to estimate savings. You can update the plan or Copilot tier any time by reconnecting.
          </InfoBox>

          <SecurityBox>
            Your private key is encrypted at rest with AES-256-GCM before persisting to our database — the plaintext is never stored. All GitHub App permissions are read-only (Members, Administration, Copilot Business). Effycion mints fresh 1-hour installation tokens per analysis (cached in-process only, evicted on disconnect). To revoke access at any time, uninstall the <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Efficyon Cost Analyzer</span> app from your org&apos;s Installed GitHub Apps, or delete it entirely from Developer settings.
          </SecurityBox>
        </div>
      </section>

      {/* Stripe Section */}
      <section id="stripe" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "stripe" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#635BFF]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="stripe" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Stripe</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Revenue Recovery</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#635BFF]/50 mt-1">&#8226;</span>A Stripe account in <strong>Live</strong> or <strong>Test</strong> mode (we accept both <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">rk_live_</span> and <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">rk_test_</span> keys)</li>
              <li className="flex items-start gap-2"><span className="text-[#635BFF]/50 mt-1">&#8226;</span>Permission to create <strong>Restricted keys</strong> in your Stripe dashboard (Owner or Developer role)</li>
              <li className="flex items-start gap-2"><span className="text-[#635BFF]/50 mt-1">&#8226;</span>At least some history in the account — Effycion analyzes failed invoices, expiring cards, past-due subscriptions, and disputes from the last 30/90/180 days</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#635BFF" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Open the{" "}
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-[#635BFF]/80 hover:text-[#635BFF] inline-flex items-center gap-1 transition-colors">
                  Stripe API keys page <ExternalLink className="w-3 h-3" />
                </a>
                {" "}(or <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noopener noreferrer" className="text-[#635BFF]/80 hover:text-[#635BFF] inline-flex items-center gap-1 transition-colors">Test mode keys <ExternalLink className="w-3 h-3" /></a>) and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">+ Create restricted key</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#635BFF" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Name it <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Efficyon Cost Analyzer</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#635BFF" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  In the permissions list, set every other resource to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">None</span>, then grant exactly these six <strong className="text-white/50">Read</strong> scopes:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>Charges: Read</ScopeBadge>
                  <ScopeBadge>Customers: Read</ScopeBadge>
                  <ScopeBadge>Disputes: Read</ScopeBadge>
                  <ScopeBadge>Invoices: Read</ScopeBadge>
                  <ScopeBadge>Payment Intents: Read</ScopeBadge>
                  <ScopeBadge>Subscriptions: Read</ScopeBadge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#635BFF" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create key</span> and then <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Reveal test/live key</span>. Copy the full <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">rk_live_…</span> or <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">rk_test_…</span> string.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#635BFF" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Back in Effycion, <Link href="/dashboard/tools" className="text-[#635BFF]/80 hover:text-[#635BFF] transition-colors">Tools & Integrations</Link> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span> &rsaquo; Stripe. Paste the restricted key and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>. Effycion calls <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">GET /v1/account</span> to validate, captures your account ID and default currency, and flips status to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">connected</span> within 1–2 seconds.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#635BFF" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Switch to the Analysis tab, pick a lookback window (30 / 90 / 180 days; default 90), and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Run Analysis</span>. Findings appear with severity badges and a total recoverable amount.
              </p>
            </div>
          </div>

          <InfoBox title="About findings">
            Effycion runs four checks: <strong>failed payment recovery</strong> (open invoices with ≥1 attempt — recoverable estimate is 65% of the total at risk, the B2B SaaS dunning benchmark), <strong>card-expiry preventable churn</strong> (active subs whose default card expires in the next 60 days), <strong>past-due subscriptions</strong> (status <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">past_due</span> or <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">unpaid</span>), and <strong>disputes</strong> (chargebacks plus the ~$15 Stripe dispute fee). Severity ladder: ≥$500 critical, ≥$100 high, ≥$25 medium, &gt;$0 low. Multi-currency accounts get one finding per currency — no FX conversion.
          </InfoBox>

          <SecurityBox>
            Your restricted key is encrypted at rest with AES-256-GCM before persisting — the plaintext is never stored. All six granted scopes are read-only — Effycion cannot create charges, refund customers, or modify any Stripe data. The key is sent directly to the Stripe SDK on each analysis run; no third-party access. To revoke access any time, go to <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Stripe Dashboard &rsaquo; Developers &rsaquo; API keys</span>, find <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Efficyon Cost Analyzer</span>, and click <strong>Roll</strong> or <strong>Delete</strong>.
          </SecurityBox>
        </div>
      </section>

      {/* Salesforce Section */}
      <section id="salesforce" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "salesforce" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00A1E0]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="salesforce" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Salesforce</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">CRM & Sales</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#00A1E0]/50 mt-1">&#8226;</span>System Administrator (or equivalent) profile in your Salesforce org — required to create a Connected App</li>
              <li className="flex items-start gap-2"><span className="text-[#00A1E0]/50 mt-1">&#8226;</span>An org of any edition — Production, Developer Edition (free), or Sandbox all work</li>
              <li className="flex items-start gap-2"><span className="text-[#00A1E0]/50 mt-1">&#8226;</span>~10 minutes for the Connected App to propagate after creation (a Salesforce quirk — first OAuth attempts before propagation usually fail with confusing errors)</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#00A1E0" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Salesforce: <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Setup</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">App Manager</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">New Connected App</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#00A1E0" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Name it <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Efficyon Cost Analyzer</span>. Enter any contact email.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#00A1E0" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Check <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Enable OAuth Settings</span>. Set the <strong>Callback URL</strong> to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">https://efficyonv2.onrender.com/api/integrations/salesforce/callback</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#00A1E0" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Under <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Selected OAuth Scopes</span>, add these three:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>Manage user data via APIs (api)</ScopeBadge>
                  <ScopeBadge>Perform requests on your behalf at any time (refresh_token, offline_access)</ScopeBadge>
                  <ScopeBadge>Access the identity URL service (id, profile, email)</ScopeBadge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#00A1E0" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Save the Connected App. <strong>Wait ~10 minutes</strong> for propagation, then open the app and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Manage Consumer Details</span> to copy the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Consumer Key</span> and <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Consumer Secret</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#00A1E0" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Back in Efficyon, <Link href="/dashboard/tools" className="text-[#00A1E0]/80 hover:text-[#00A1E0] transition-colors">Tools & Integrations</Link> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span> &rsaquo; Salesforce. Paste the Consumer Key + Secret, choose <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Production</span> or <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Sandbox</span>, optionally enter your My Domain URL, and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#00A1E0" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Efficyon redirects to Salesforce for OAuth consent. Approve the requested scopes and you&apos;ll be sent back to the dashboard with status <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">connected</span>. Switch to the Analysis tab and run analysis.
              </p>
            </div>
          </div>

          <InfoBox title="About findings">
            Three checks: <strong>inactive licensed users</strong> (active Standard users with no login in the chosen window), <strong>frozen-but-billed users</strong> (frozen via Login Information but still IsActive — the equivalent of Slack&apos;s deactivated-but-billed bug), and <strong>unused PermissionSetLicenses</strong> (paid feature licenses like CPQ or Sales Cloud Einstein attached to inactive users). Pricing uses Salesforce list rates; the summary tells customers to apply their negotiated discount (typical contracts are 30–70% off list).
          </InfoBox>

          <SecurityBox>
            Your Consumer Key + Secret + access token + refresh token are encrypted at rest with AES-256-GCM before persisting — plaintext is never stored. The OAuth scopes are read-only-equivalent for our use case (we only call <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">/services/data/.../query</span> with SOQL SELECT statements). Refresh tokens last until revoked or unused for ~6 months. To revoke any time, go to <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Setup &rsaquo; Connected Apps OAuth Usage</span>, find <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Efficyon Cost Analyzer</span>, click <strong>Revoke</strong>; or delete the Connected App entirely from App Manager.
          </SecurityBox>
        </div>
      </section>

      {/* Notion Section */}
      <section id="notion" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "notion" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="notion" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Notion</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Productivity</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-white/40 mt-1">&#8226;</span>Workspace owner permissions in your Notion workspace</li>
              <li className="flex items-start gap-2"><span className="text-white/40 mt-1">&#8226;</span>Permission to create public integrations at notion.so/my-integrations</li>
              <li className="flex items-start gap-2"><span className="text-white/40 mt-1">&#8226;</span>Knowledge of your plan tier + seat count (we ask for them at connect — Notion&apos;s API doesn&apos;t expose billing)</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#000000" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Open{" "}
                <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white inline-flex items-center gap-1 transition-colors">
                  notion.so/my-integrations <ExternalLink className="w-3 h-3" />
                </a>
                {" "}and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">+ New integration</span>. Choose <strong>Public</strong> (not Internal).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#000000" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Name it <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Efficyon Cost Analyzer</span>. Set the Redirect URI to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">https://efficyonv2.onrender.com/api/integrations/notion/callback</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#000000" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Set <strong>Capabilities</strong> to:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>Read content</ScopeBadge>
                  <ScopeBadge>Read user information including email addresses</ScopeBadge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#000000" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Save. From the integration&apos;s <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Secrets</span> page, copy the <strong>OAuth Client ID</strong> and <strong>Client Secret</strong>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#000000" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Back in Efficyon, <Link href="/dashboard/tools" className="text-white/60 hover:text-white transition-colors">Tools & Integrations</Link> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span> &rsaquo; Notion. Paste the Client ID + Secret. Pick your plan tier. Enter your total paid seats (look it up in Notion → Settings → Plans). Indicate whether you have Notion AI and how many AI seats. Click Connect.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#000000" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Approve the OAuth consent in Notion. You&apos;ll be redirected back to the dashboard with status <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">connected</span>. Switch to the Analysis tab and run analysis.
              </p>
            </div>
          </div>

          <InfoBox title="About findings (and what's missing)">
            Three checks: <strong>bot detection</strong> (every <code>type === &quot;bot&quot;</code> member is flagged so you can verify your seat count excludes them), <strong>seat-utilization gap</strong> (your entered seat count minus actual humans, priced at your plan rate), and <strong>Notion AI over-provisioning</strong> (only if you have AI). Pricing uses Notion list rates; the summary tells you to apply your negotiated discount. <strong>Note:</strong> Notion&apos;s public API doesn&apos;t expose per-user login activity, so V1 doesn&apos;t flag individual inactive users — that requires Audit Log API access (Enterprise only) and is on the V2 roadmap.
          </InfoBox>

          <SecurityBox>
            Your Client ID + Secret + access token are encrypted at rest with AES-256-GCM before persisting. The OAuth scopes are read-only — Efficyon can list users but cannot read or modify any pages, blocks, or databases. Notion access tokens don&apos;t expire (no refresh logic needed). To revoke any time: Notion → Settings & members → Connections → find <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Efficyon Cost Analyzer</span> → Disconnect.
          </SecurityBox>
        </div>
      </section>

      {/* Linear Section */}
      <section id="linear" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "linear" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#5E6AD2]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="linear" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Linear</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Productivity</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#5E6AD2]/50 mt-1">&#8226;</span>Workspace admin permissions in Linear</li>
              <li className="flex items-start gap-2"><span className="text-[#5E6AD2]/50 mt-1">&#8226;</span>Permission to create OAuth applications under Settings → API</li>
              <li className="flex items-start gap-2"><span className="text-[#5E6AD2]/50 mt-1">&#8226;</span>Knowledge of your plan tier (Standard / Plus / Enterprise)</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#5E6AD2" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Open Linear &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Settings</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Account</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">API</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#5E6AD2" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Under <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">OAuth applications</span>, click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create new</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#5E6AD2" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Name it <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Efficyon Cost Analyzer</span>. Set the Redirect URI to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">https://efficyonv2.onrender.com/api/integrations/linear/callback</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#5E6AD2" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Set <strong>Scopes</strong> to:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>read</ScopeBadge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#5E6AD2" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Save. Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> from the OAuth app&apos;s page.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#5E6AD2" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Back in Efficyon, <Link href="/dashboard/tools" className="text-[#5E6AD2]/80 hover:text-[#5E6AD2] transition-colors">Tools & Integrations</Link> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span> &rsaquo; Linear. Paste the Client ID + Secret. Pick your plan tier. Click Connect.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#5E6AD2" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Approve the OAuth consent in Linear. You&apos;ll be redirected back to the dashboard with status <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">connected</span>. Switch to the Analysis tab and run analysis.
              </p>
            </div>
          </div>

          <InfoBox title="About findings">
            One V1 check: <strong>inactive billable users</strong>. Linear bills per active user per workspace, so any user with <code>active = true</code> who hasn&apos;t logged in within your chosen window (30 / 60 / 90 / 180 days; default 60) is flagged. Pricing uses Linear list rates — Standard $8, Plus $14, Enterprise $25 default. Apply your negotiated discount for actual savings.
          </InfoBox>

          <SecurityBox>
            Your Client ID + Secret + access token + refresh token are encrypted at rest with AES-256-GCM before persisting. The OAuth scope is <code>read</code> only — Efficyon can list users and read workspace info but cannot create or modify any Linear data. Access tokens expire in ~10 hours and we refresh them automatically using the refresh token. To revoke any time: Linear &rsaquo; Settings &rsaquo; Account &rsaquo; API &rsaquo; OAuth applications &rsaquo; <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Efficyon Cost Analyzer</span> &rsaquo; Revoke.
          </SecurityBox>
        </div>
      </section>

      {/* Atlassian Section */}
      <section id="atlassian" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "atlassian" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#0052CC]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="atlassian" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Atlassian (Jira + Confluence)</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Productivity</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#0052CC]/50 mt-1">&#8226;</span>Atlassian Cloud Organization Admin account</li>
              <li className="flex items-start gap-2"><span className="text-[#0052CC]/50 mt-1">&#8226;</span>Access to the Atlassian Developer Console</li>
              <li className="flex items-start gap-2"><span className="text-[#0052CC]/50 mt-1">&#8226;</span>At least one Jira or Confluence Cloud site in your organization</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#0052CC" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Open{" "}
                <a href="https://developer.atlassian.com/console/myapps/" target="_blank" rel="noopener noreferrer" className="text-[#0052CC]/70 hover:text-[#0052CC] inline-flex items-center gap-1 transition-colors">
                  developer.atlassian.com/console/myapps/ <ExternalLink className="w-3 h-3" />
                </a>{" "}
                &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">OAuth 2.0 integration</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#0052CC" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Name the app <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Efficyon Cost Analyzer</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#0052CC" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Go to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Permissions</span> and add the following scopes:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>read:jira-user</ScopeBadge>
                  <ScopeBadge>read:confluence-user.summary</ScopeBadge>
                  <ScopeBadge>read:account</ScopeBadge>
                  <ScopeBadge>read:directory:admin-atlassian</ScopeBadge>
                  <ScopeBadge>offline_access</ScopeBadge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#0052CC" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Authorization</span> and set the Callback URL to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">https://efficyonv2.onrender.com/api/integrations/atlassian/callback</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#0052CC" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Go to <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Settings</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Distribution</span> and set <strong>Sharing</strong> to enabled.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#0052CC" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Copy the <strong>Client ID</strong> and <strong>Secret</strong> from the app&apos;s settings page.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#0052CC" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Efficyon, <Link href="/dashboard/tools" className="text-[#0052CC]/80 hover:text-[#0052CC] transition-colors">Tools & Integrations</Link> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect New Tool</span> &rsaquo; Atlassian. Paste the Client ID + Secret along with your per-product seat costs. Click Connect.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={8} color="#0052CC" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                On the Atlassian consent screen you <strong>must be signed in as an Atlassian Cloud Organization Admin</strong>. Approve the requested permissions to complete the installation.
              </p>
            </div>
          </div>

          <InfoBox title="Why Org Admin is required">
            The <code>read:directory:admin-atlassian</code> scope grants access to the Atlassian Org Directory API, which provides per-product last-active dates for every user. Without this scope, Efficyon cannot detect inactive Jira or Confluence seats and the analysis will fail. Only an Atlassian Cloud Organization Admin can approve this scope during installation.
          </InfoBox>

          <InfoBox title="About findings">
            V1 checks: <strong>inactive Jira users</strong> (active user with Jira license, no Jira activity within the inactivity window), <strong>inactive Confluence users</strong> (same for Confluence), and <strong>single-product dual-seat</strong> (user holds both licenses but only used one product — the unused seat is the savings). Inactivity window: 30 / 60 / 90 days, default 60.
          </InfoBox>

          <SecurityBox>
            Your Client ID + Secret + access token + refresh token are encrypted at rest with AES-256-GCM before persisting. All scopes are read-only — Efficyon cannot create or modify any Jira issues, Confluence pages, or user data. Access tokens are refreshed automatically using <code>offline_access</code>. To revoke any time: developer.atlassian.com/console/myapps/ &rsaquo; find <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Efficyon Cost Analyzer</span> &rsaquo; delete or revoke.
          </SecurityBox>
        </div>
      </section>

      <section id="monday" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "monday" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FF3D57]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="monday" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">monday.com</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Productivity</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#FF3D57]/50 mt-1">&#8226;</span>Admin access on monday.com</li>
              <li className="flex items-start gap-2"><span className="text-[#FF3D57]/50 mt-1">&#8226;</span>Access to the monday.com Developer Center</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#FF3D57" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In monday.com, click your avatar &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Developers</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Build apps</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#FF3D57" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create app</span> and name it <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Efficyon Cost Analyzer</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#FF3D57" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Open <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">OAuth &amp; Permissions</span> and add these scopes:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>me:read</ScopeBadge>
                  <ScopeBadge>users:read</ScopeBadge>
                  <ScopeBadge>account:read</ScopeBadge>
                  <ScopeBadge>boards:read</ScopeBadge>
                  <ScopeBadge>updates:read</ScopeBadge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#FF3D57" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Under <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Redirect URLs</span> add: <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">https://efficyonv2.onrender.com/api/integrations/monday/callback</span> (use your production host when deployed).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#FF3D57" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> from the <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Basic Information</span> tab.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#FF3D57" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Back in Efficyon, open the monday.com tile, paste both values plus your per-seat cost, and click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#FF3D57" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Approve consent on the monday.com screen as an <strong>Admin user</strong>.
              </p>
            </div>
          </div>

          <InfoBox title="About findings">
            V1 checks: <strong>inactive users</strong> (licensed users with no activity within the inactivity window), <strong>seat-tier overprovisioning</strong> (account is on a higher seat tier than utilized), <strong>view-only members on paid plans</strong> (guests or viewers consuming paid seats), and <strong>pending invites</strong> (outstanding invites holding seats). Inactivity window default: 60 days.
          </InfoBox>

          <SecurityBox>
            Your Client ID + Secret + access token are encrypted at rest with AES-256-GCM before persisting. All scopes are read-only — Efficyon cannot create or modify any monday.com boards, items, or user data. To revoke any time: monday.com Developer Center &rsaquo; find <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Efficyon Cost Analyzer</span> &rsaquo; delete or revoke.
          </SecurityBox>
        </div>
      </section>

      <section id="asana" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "asana" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F06A6A]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="asana" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Asana</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Productivity</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#F06A6A]/50 mt-1">&#8226;</span>Workspace or organization admin on Asana</li>
              <li className="flex items-start gap-2"><span className="text-[#F06A6A]/50 mt-1">&#8226;</span>Access to the Asana Developer Console</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#F06A6A" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                In Asana, click your avatar &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">My profile</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Apps</span> &rsaquo; <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Manage Developer Apps</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#F06A6A" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Create new app</span> and name it <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Efficyon Cost Analyzer</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#F06A6A" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  In the app's OAuth section, the requested scope is:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>default</ScopeBadge>
                </div>
                <p className="text-[11.5px] text-white/30 leading-relaxed">
                  Asana's <span className="font-mono text-white/45">default</span> scope grants read+write across the user's accessible workspaces; Efficyon only ever reads.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#F06A6A" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Under <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Redirect URLs</span> add: <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">https://efficyonv2.onrender.com/api/integrations/asana/callback</span> (use your production host when deployed).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#F06A6A" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> from the app's OAuth settings page.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#F06A6A" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Back in Efficyon, open the Asana tile, paste both values plus your plan tier and per-seat cost (and optionally subscribed seats / primary domains), then click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#F06A6A" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Approve consent on the Asana screen as a <strong>workspace admin</strong>.
              </p>
            </div>
          </div>

          <InfoBox title="About findings">
            V1 checks: <strong>inactive members</strong> (licensed users with no recently-modified tasks in the inactivity window), <strong>seat overprovisioning</strong> (subscribed seats &gt; active members), <strong>deactivated members still in the workspace</strong>, and <strong>guest-misclassified</strong> (external-domain users billed as full members instead of free guests). Inactivity window default: 60 days.
          </InfoBox>

          <SecurityBox>
            Your Client ID + Secret + access + refresh tokens are encrypted at rest with AES-256-GCM before persisting. The <span className="font-mono text-white/40">default</span> scope is broad but Efficyon only ever issues read calls (<span className="font-mono text-white/40">/users/me</span>, <span className="font-mono text-white/40">/workspace_memberships</span>, <span className="font-mono text-white/40">/tasks</span>). On disconnect, Efficyon revokes the OAuth token automatically. To remove the app entirely: Asana &rsaquo; My profile &rsaquo; Apps &rsaquo; <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Efficyon Cost Analyzer</span> &rsaquo; Deauthorize.
          </SecurityBox>
        </div>
      </section>

      <section id="airtable" className={`rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/80 backdrop-blur-xl p-0 overflow-hidden ${activeTab !== "airtable" ? "hidden" : ""}`}>
        <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.04]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FCB400]/20 to-transparent" />
          <div className="flex items-center gap-3">
            <ToolLogo name="airtable" size={32} />
            <div>
              <h3 className="text-[16px] font-semibold text-white/90 tracking-[-0.01em]">Airtable</h3>
              <p className="text-[11.5px] text-white/25 mt-0.5">Productivity</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2.5">Prerequisites</p>
            <ul className="text-[12.5px] text-white/35 space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#FCB400]/50 mt-1">&#8226;</span>Workspace owner on Airtable</li>
              <li className="flex items-start gap-2"><span className="text-[#FCB400]/50 mt-1">&#8226;</span>Access to the Airtable Builder Hub</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider">Steps</p>

            <div className="flex items-start gap-3">
              <StepNumber n={1} color="#FCB400" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Open <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">airtable.com/create/oauth</span> (Builder Hub &rsaquo; OAuth integrations).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={2} color="#FCB400" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Register new OAuth integration</span> and name it <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Efficyon Cost Analyzer</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={3} color="#FCB400" />
              <div className="pt-1 space-y-2">
                <p className="text-[12.5px] text-white/40 leading-relaxed">
                  Add the following read-only scopes:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <ScopeBadge>user.email:read</ScopeBadge>
                  <ScopeBadge>schema.bases:read</ScopeBadge>
                </div>
                <p className="text-[11.5px] text-white/30 leading-relaxed">
                  Member listing and per-user inactive checks need <span className="font-mono text-white/45">enterprise.scim.usersAndGroups:read</span> on Enterprise plans — V1 skips those checks gracefully without it.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={4} color="#FCB400" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Under <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Redirect URLs</span> add: <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">https://efficyonv2.onrender.com/api/integrations/airtable/callback</span> (use your production host when deployed).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={5} color="#FCB400" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> from the integration's detail page.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={6} color="#FCB400" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Back in Efficyon, open the Airtable tile, paste both values plus your plan tier, per-seat cost, and seat counts (subscribed/active), then click <span className="font-mono text-white/55 bg-white/[0.04] px-1.5 py-0.5 rounded text-[11px]">Connect</span>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <StepNumber n={7} color="#FCB400" />
              <p className="text-[12.5px] text-white/40 leading-relaxed pt-1">
                Approve consent on the Airtable screen as the <strong>workspace owner</strong>.
              </p>
            </div>
          </div>

          <InfoBox title="About findings">
            V1 checks: <strong>seat overprovisioning</strong> (subscribed seats &gt; active seats from your input), <strong>plan-tier overspec</strong> (Business plan with a base count that fits Team's 50-base ceiling), plus placeholders for <strong>inactive user</strong> and <strong>editor misclassified</strong> that activate once Enterprise SCIM scopes are granted. Without Enterprise, only the connecting user is visible via the public OAuth API.
          </InfoBox>

          <SecurityBox>
            Your Client ID + Secret + access + refresh tokens (and the PKCE verifier during the OAuth handshake) are encrypted at rest with AES-256-GCM before persisting. Scopes are read-only — Efficyon cannot create or modify any Airtable bases, records, or workspace settings. On disconnect, Efficyon revokes the OAuth token automatically. To remove the integration entirely: airtable.com/create/oauth &rsaquo; <span className="font-mono text-white/40 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">Efficyon Cost Analyzer</span> &rsaquo; Revoke or delete.
          </SecurityBox>
        </div>
      </section>
    </div>
  )
}
