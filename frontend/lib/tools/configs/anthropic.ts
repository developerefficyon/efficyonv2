import type { UnifiedToolConfig } from "../types"
import { OpenAIView } from "@/components/tools/openai-view"

export const anthropicConfig: UnifiedToolConfig = {
  provider: "Anthropic",
  id: "anthropic",
  label: "Anthropic",
  category: "AI",
  description: "Claude API spend & cost analysis",
  brandColor: "#D97757",
  authType: "apiKey",
  authFields: [
    {
      name: "apiKey",
      label: "Admin API Key",
      type: "password",
      required: true,
      placeholder: "sk-ant-admin01-...",
      hint: "Must start with sk-ant-admin01-. Regular API keys won't work.",
      validate: (v) => v.startsWith("sk-ant-admin01-") ? null : "Must start with sk-ant-admin01-",
    },
  ],
  connectEndpoint: "/api/integrations/anthropic/connect",
  buildConnectRequest: (values) => ({ api_key: values.apiKey }),
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "Go to console.anthropic.com → Settings → Admin Keys",
      "Create an Admin key with usage & billing read access",
      "Paste it here — we'll backfill 90 days of usage",
    ],
  },
  endpoints: [
    { key: "usage", path: "/api/integrations/anthropic/usage?days=30", pick: ["usage"] },
    { key: "status", path: "/api/integrations/anthropic/status", pick: ["status"] },
  ],
  defaultTab: "overview",
  viewComponent: OpenAIView,
  connectedToast: "Anthropic connected · Backfilling 90 days of usage in the background…",
}
