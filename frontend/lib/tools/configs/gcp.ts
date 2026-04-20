import type { UnifiedToolConfig } from "../types"
import { GcpView } from "@/components/tools/gcp-view"

export const gcpConfig: UnifiedToolConfig = {
  provider: "GCP",
  id: "gcp",
  label: "Google Cloud",
  category: "Cloud Infrastructure",
  description: "Compute, BigQuery, SQL & storage cost analysis",
  brandColor: "#4285F4",
  authType: "serviceAccount",
  authFields: [
    {
      name: "serviceAccountKey",
      label: "Service Account JSON Key",
      type: "textarea",
      required: true,
      placeholder: '{"type":"service_account","project_id":"...","private_key":"..."}',
      hint: "Paste the full contents of the JSON key file downloaded from Google Cloud Console.",
      validate: (v) => {
        if (!v) return "Required"
        try {
          const parsed = JSON.parse(v)
          if (parsed.type !== "service_account") return "Must be a service account key (type: 'service_account')"
          if (!parsed.client_email || !parsed.private_key) return "Missing client_email or private_key"
          return null
        } catch {
          return "Not valid JSON"
        }
      },
    },
    {
      name: "organizationId",
      label: "Organization ID",
      type: "text",
      required: true,
      placeholder: "organizations/123456789",
      hint: "Find in Google Cloud Console → IAM & Admin → Settings. Format: organizations/<numeric-id>.",
      validate: (v) => {
        if (!v) return "Required"
        return /^organizations\/\d+$/.test(v) ? null : "Format must be: organizations/<numeric-id>"
      },
    },
  ],
  connectEndpoint: "/api/integrations",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "GCP",
        connection_type: "serviceAccount",
        status: "pending",
        settings: {
          service_account_key: values.serviceAccountKey,
          organization_id: values.organizationId,
        },
      },
    ],
  }),
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "In Google Cloud Console → IAM & Admin → Service Accounts → Create Service Account (name: efficyon-cost-analyzer). Grant no project roles at this step.",
      "Open the service account → Keys → Add Key → Create New Key → JSON. Download the .json file.",
      "In IAM & Admin → IAM at the organization scope, grant this service account the roles: Recommender Viewer (roles/recommender.viewer) AND Browser (roles/browser).",
      "Paste the full contents of the JSON file into the Service Account JSON Key field.",
      "Find your Organization ID in IAM & Admin → Settings → Organization ID, and enter it (format: organizations/<numeric>).",
      "After connecting, click the Google Cloud tool in the dashboard to trigger validation.",
    ],
    note: "Requires org-level IAM admin to grant the two roles.",
  },
  endpoints: [
    { key: "projects", path: "/api/integrations/gcp/projects", pick: ["projects"], fallback: [] },
    { key: "status", path: "/api/integrations/gcp/status", pick: ["status"] },
  ],
  defaultTab: "projects",
  viewComponent: GcpView,
  connectingToast: "Saving service account key…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To fully revoke access, delete the service account key in Google Cloud Console → IAM & Admin → Service Accounts → (your service account) → Keys.",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/gcp/cost-leaks",
  analysisSupportsInactivity: false,
}
