import type { UnifiedToolConfig } from "../types"
import { OpenAIView } from "@/components/tools/openai-view"

export const openaiConfig: UnifiedToolConfig = {
  provider: "OpenAI",
  id: "openai",
  label: "OpenAI",
  category: "AI",
  description: "ChatGPT API spend & cost analysis",
  brandColor: "#10A37F",
  authType: "apiKey",
  authFields: [
    {
      name: "apiKey",
      label: "Admin API Key",
      type: "password",
      required: true,
      placeholder: "sk-admin-...",
      hint: "Must start with sk-admin-. Regular project keys won't work.",
      validate: (v) => v.startsWith("sk-admin-") ? null : "Must start with sk-admin-",
    },
  ],
  connectEndpoint: "/api/integrations/openai/connect",
  buildConnectRequest: (values) => ({ api_key: values.apiKey }),
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "Go to platform.openai.com → Organization → Admin keys",
      "Create a new Admin key with billing read access",
      "Paste it here — we'll backfill 90 days of usage",
    ],
  },
  endpoints: [
    { key: "usage", path: "/api/integrations/openai/usage?days=30", pick: ["usage"] },
    { key: "status", path: "/api/integrations/openai/status", pick: ["status"] },
  ],
  defaultTab: "overview",
  viewComponent: OpenAIView,
  connectedToast: "OpenAI connected · Backfilling 90 days of usage in the background…",
  tokenRevocation: {
    automated: false,
    manualStepsNote: "Your stored API key is deleted from our servers. To fully revoke access, also delete the admin key from your OpenAI dashboard.",
  },
  analysisType: "usage",
}
