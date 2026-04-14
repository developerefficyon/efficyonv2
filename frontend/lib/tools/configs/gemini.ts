import type { UnifiedToolConfig } from "../types"
import { OpenAIView } from "@/components/tools/openai-view"

export const geminiConfig: UnifiedToolConfig = {
  provider: "Gemini",
  id: "gemini",
  label: "Gemini",
  category: "AI",
  description: "Google Gemini API spend & cost analysis",
  brandColor: "#4285F4",
  authType: "serviceAccount",
  authFields: [
    {
      name: "serviceAccountJson",
      label: "Service Account JSON",
      type: "textarea",
      required: true,
      placeholder: '{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----..."}',
      hint: "Paste the full JSON key file. Stored encrypted with AES-256-GCM.",
    },
    {
      name: "bigqueryTable",
      label: "BigQuery Billing Export Table",
      type: "text",
      required: false,
      placeholder: "myproject.billing_export.gcp_billing_export_v1_XXXXXX",
      hint: "With BigQuery export connected, costs are actual. Without it, we pull token counts from Cloud Monitoring and estimate cost.",
    },
  ],
  connectEndpoint: "/api/integrations/gemini/connect",
  buildConnectRequest: (values) => ({
    service_account_json: values.serviceAccountJson,
    bigquery_table: values.bigqueryTable?.trim() || null,
  }),
  validate: (values) => {
    try {
      const parsed = JSON.parse(values.serviceAccountJson)
      if (parsed.type !== "service_account" || !parsed.private_key || !parsed.client_email) {
        return "Must include type='service_account', private_key, and client_email"
      }
      return null
    } catch {
      return "Could not parse the pasted text as JSON"
    }
  },
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "In Google Cloud Console, create a service account in the project where Gemini runs",
      "Grant role Monitoring Viewer (and BigQuery Data Viewer if using export)",
      "Create a JSON key for the service account and paste it above",
    ],
  },
  endpoints: [
    { key: "usage", path: "/api/integrations/gemini/usage?days=30", pick: ["usage"] },
    { key: "status", path: "/api/integrations/gemini/status", pick: ["status"] },
  ],
  defaultTab: "overview",
  viewComponent: OpenAIView,
  connectedToast: "Gemini connected · Backfilling 90 days of usage in the background…",
}
