"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink } from "lucide-react"
import Link from "next/link"

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xs font-bold text-cyan-400">
      {n}
    </span>
  )
}

function ScopeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-white/5 border border-white/10 text-gray-300">
      {children}
    </span>
  )
}

export default function SetupGuidePage() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const timer = setTimeout(() => {
        const el = document.querySelector(hash)
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <div className="space-y-8 w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/tools")}
          className="border-white/10 bg-black/50 text-white hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Tools
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-white">Integration Setup Guide</h2>
          <p className="text-sm text-gray-400">Step-by-step instructions for connecting your tools</p>
        </div>
      </div>

      {/* Fortnox Section */}
      <section id="fortnox" className="scroll-mt-8 rounded-xl border border-white/10 bg-black/80 backdrop-blur-xl p-6 space-y-5">
        <h3 className="text-xl font-semibold text-white">Fortnox</h3>

        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">Prerequisites</p>
          <ul className="text-sm text-gray-400 list-disc list-inside space-y-1">
            <li>A Fortnox account (sandbox or production)</li>
            <li>Access to the Fortnox Developer Portal</li>
            <li>Admin rights on the Fortnox company you want to connect</li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-300">Steps</p>

          <div className="flex items-start gap-3">
            <StepNumber n={1} />
            <p className="text-sm text-gray-400">
              Go to{" "}
              <a href="https://developer.fortnox.se" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1">
                developer.fortnox.se <ExternalLink className="w-3 h-3" />
              </a>{" "}
              and sign in with your Fortnox credentials.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={2} />
            <p className="text-sm text-gray-400">
              Navigate to <span className="font-mono text-gray-300">My Apps</span> and click <span className="font-mono text-gray-300">Create New App</span>.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={3} />
            <p className="text-sm text-gray-400">
              Enter a name for your app (e.g. &quot;Effycion Integration&quot;) and a description.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={4} />
            <p className="text-sm text-gray-400">
              Set the <span className="font-mono text-gray-300">Redirect URI</span> to the one provided during your Effycion onboarding. This is typically your Effycion callback URL.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={5} />
            <p className="text-sm text-gray-400">
              Under <span className="font-mono text-gray-300">Scopes</span>, enable the following permissions:
            </p>
          </div>
          <div className="ml-9 flex flex-wrap gap-2">
            <ScopeBadge>companyinformation</ScopeBadge>
            <ScopeBadge>customer</ScopeBadge>
            <ScopeBadge>invoice</ScopeBadge>
            <ScopeBadge>article</ScopeBadge>
            <ScopeBadge>settings</ScopeBadge>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={6} />
            <p className="text-sm text-gray-400">
              Save the app. Fortnox will generate a <span className="font-mono text-gray-300">Client ID</span> and <span className="font-mono text-gray-300">Client Secret</span>.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={7} />
            <p className="text-sm text-gray-400">
              Copy both values securely. The Client Secret is only shown once.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={8} />
            <p className="text-sm text-gray-400">
              In Effycion, go to <Link href="/dashboard/tools" className="text-cyan-400 hover:text-cyan-300">Tools &amp; Integrations</Link>, click <span className="font-mono text-gray-300">Connect New Tool</span>, select <span className="font-mono text-gray-300">Fortnox</span>, and paste your credentials.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={9} />
            <p className="text-sm text-gray-400">
              Choose <span className="font-mono text-gray-300">Sandbox</span> or <span className="font-mono text-gray-300">Production</span> environment and click <span className="font-mono text-gray-300">Connect</span>. You&apos;ll be redirected to Fortnox to authorize.
            </p>
          </div>
        </div>
      </section>

      {/* Microsoft 365 Section */}
      <section id="microsoft365" className="scroll-mt-8 rounded-xl border border-white/10 bg-black/80 backdrop-blur-xl p-6 space-y-5">
        <h3 className="text-xl font-semibold text-white">Microsoft 365</h3>

        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">Prerequisites</p>
          <ul className="text-sm text-gray-400 list-disc list-inside space-y-1">
            <li>A Microsoft 365 business subscription</li>
            <li>Azure AD admin (Global Admin or Application Administrator) access</li>
            <li>Access to the Azure Portal</li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-300">Steps</p>

          <div className="flex items-start gap-3">
            <StepNumber n={1} />
            <p className="text-sm text-gray-400">
              Go to{" "}
              <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1">
                portal.azure.com <ExternalLink className="w-3 h-3" />
              </a>{" "}
              and sign in with your admin account.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={2} />
            <p className="text-sm text-gray-400">
              Navigate to <span className="font-mono text-gray-300">Azure Active Directory</span> &gt; <span className="font-mono text-gray-300">App registrations</span>.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={3} />
            <p className="text-sm text-gray-400">
              Click <span className="font-mono text-gray-300">New registration</span>. Enter a name (e.g. &quot;Effycion M365&quot;).
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={4} />
            <p className="text-sm text-gray-400">
              Under <span className="font-mono text-gray-300">Supported account types</span>, select <span className="font-mono text-gray-300">Accounts in this organizational directory only</span> (single tenant).
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={5} />
            <p className="text-sm text-gray-400">
              Set the <span className="font-mono text-gray-300">Redirect URI</span> to <span className="font-mono text-gray-300">Web</span> and enter your Effycion callback URL.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={6} />
            <p className="text-sm text-gray-400">
              Click <span className="font-mono text-gray-300">Register</span>. Copy the <span className="font-mono text-gray-300">Application (client) ID</span> and <span className="font-mono text-gray-300">Directory (tenant) ID</span> from the overview page.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={7} />
            <p className="text-sm text-gray-400">
              Go to <span className="font-mono text-gray-300">API permissions</span> &gt; <span className="font-mono text-gray-300">Add a permission</span> &gt; <span className="font-mono text-gray-300">Microsoft Graph</span> &gt; <span className="font-mono text-gray-300">Application permissions</span> and add:
            </p>
          </div>

          <div className="ml-9 overflow-x-auto">
            <table className="text-xs text-gray-400 border border-white/10 rounded">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-3 py-1.5 text-left text-gray-300">Permission</th>
                  <th className="px-3 py-1.5 text-left text-gray-300">Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="px-3 py-1.5 font-mono">User.Read.All</td>
                  <td className="px-3 py-1.5">Read all users&apos; profiles</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-3 py-1.5 font-mono">Directory.Read.All</td>
                  <td className="px-3 py-1.5">Read directory data (licenses, groups)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-3 py-1.5 font-mono">AuditLog.Read.All</td>
                  <td className="px-3 py-1.5">Read sign-in activity logs</td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 font-mono">Reports.Read.All</td>
                  <td className="px-3 py-1.5">Read usage reports</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={8} />
            <p className="text-sm text-gray-400">
              Click <span className="font-mono text-gray-300">Grant admin consent for [your org]</span> and confirm. All permissions should show a green checkmark.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={9} />
            <p className="text-sm text-gray-400">
              Go to <span className="font-mono text-gray-300">Certificates &amp; secrets</span> &gt; <span className="font-mono text-gray-300">New client secret</span>. Set an expiry (recommended: 12 months) and click <span className="font-mono text-gray-300">Add</span>.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={10} />
            <p className="text-sm text-gray-400">
              Copy the <span className="font-mono text-gray-300">Value</span> of the secret immediately — it won&apos;t be shown again.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={11} />
            <p className="text-sm text-gray-400">
              In Effycion, go to <Link href="/dashboard/tools" className="text-cyan-400 hover:text-cyan-300">Tools &amp; Integrations</Link>, click <span className="font-mono text-gray-300">Connect New Tool</span>, select <span className="font-mono text-gray-300">Microsoft 365</span>, and paste your Tenant ID, Client ID, and Client Secret. Click <span className="font-mono text-gray-300">Connect</span>.
            </p>
          </div>
        </div>
      </section>

      {/* HubSpot Section */}
      <section id="hubspot" className="scroll-mt-8 rounded-xl border border-white/10 bg-black/80 backdrop-blur-xl p-6 space-y-5">
        <h3 className="text-xl font-semibold text-white">HubSpot</h3>

        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">Prerequisites</p>
          <ul className="text-sm text-gray-400 list-disc list-inside space-y-1">
            <li>A HubSpot account with a paid plan (Starter, Professional, or Enterprise)</li>
            <li>Super Admin access in HubSpot</li>
            <li>Access to create Private Apps or OAuth Apps in your HubSpot account</li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-300">Steps</p>

          <div className="flex items-start gap-3">
            <StepNumber n={1} />
            <p className="text-sm text-gray-400">
              Log into{" "}
              <a href="https://app.hubspot.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1">
                app.hubspot.com <ExternalLink className="w-3 h-3" />
              </a>{" "}
              with your Super Admin account.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={2} />
            <p className="text-sm text-gray-400">
              Click the <span className="font-mono text-gray-300">Settings</span> gear icon in the top navigation bar.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={3} />
            <p className="text-sm text-gray-400">
              In the left sidebar, navigate to <span className="font-mono text-gray-300">Integrations</span> &gt; <span className="font-mono text-gray-300">Private Apps</span>.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={4} />
            <p className="text-sm text-gray-400">
              Click <span className="font-mono text-gray-300">Create a private app</span>. Give it a name (e.g. &quot;Effycion&quot;) and description.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={5} />
            <p className="text-sm text-gray-400">
              Go to the <span className="font-mono text-gray-300">Scopes</span> tab and enable the following:
            </p>
          </div>
          <div className="ml-9 flex flex-wrap gap-2">
            <ScopeBadge>settings.users.read</ScopeBadge>
            <ScopeBadge>settings.users.write</ScopeBadge>
            <ScopeBadge>account-info.security.read</ScopeBadge>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={6} />
            <p className="text-sm text-gray-400">
              Click <span className="font-mono text-gray-300">Create app</span> and confirm. HubSpot will generate your access token and app credentials.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={7} />
            <p className="text-sm text-gray-400">
              Copy the <span className="font-mono text-gray-300">Client ID</span> and <span className="font-mono text-gray-300">Client Secret</span> from the app&apos;s Auth tab.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={8} />
            <p className="text-sm text-gray-400">
              In Effycion, go to <Link href="/dashboard/tools" className="text-cyan-400 hover:text-cyan-300">Tools &amp; Integrations</Link>, click <span className="font-mono text-gray-300">Connect New Tool</span>, select <span className="font-mono text-gray-300">HubSpot</span>, and paste your credentials.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <StepNumber n={9} />
            <p className="text-sm text-gray-400">
              Fill in your pricing information (Hub type, tier, and paid seats) for accurate cost analysis, then click <span className="font-mono text-gray-300">Connect</span>.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <p className="text-xs font-medium text-gray-300 mb-1">About Pricing Info</p>
          <p className="text-xs text-gray-500">
            Effycion uses your HubSpot plan tier (Starter, Professional, Enterprise) and paid seat count to calculate per-seat costs and identify unused licenses. This data stays in your account and is never shared. You can find your current plan details in HubSpot under <span className="font-mono">Settings &gt; Account &amp; Billing</span>.
          </p>
        </div>
      </section>
    </div>
  )
}
