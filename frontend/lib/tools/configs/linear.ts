import type { UnifiedToolConfig } from "../types"
import { LinearView } from "@/components/tools/linear-view"

export const linearConfig: UnifiedToolConfig = {
  provider: "Linear",
  id: "linear",
  label: "Linear",
  category: "Productivity",
  description: "Inactive billable users — flagged for suspension to free seats",
  brandColor: "#5E6AD2",
  authType: "oauth",
  authFields: [
    {
      name: "consumerKey",
      label: "Linear OAuth Client ID",
      type: "text",
      required: true,
      hint: "From Linear → Settings → Account → API → OAuth applications → your app",
    },
    {
      name: "consumerSecret",
      label: "Linear OAuth Client Secret",
      type: "password",
      required: true,
      hint: "Same OAuth applications page",
    },
    {
      name: "planTier",
      label: "Plan Tier",
      type: "select",
      required: true,
      options: [
        { value: "standard",   label: "Standard ($8/user/mo)" },
        { value: "plus",       label: "Plus ($14/user/mo)" },
        { value: "enterprise", label: "Enterprise ($25/user/mo default)" },
      ],
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/linear/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "Linear",
        connection_type: "oauth",
        status: "pending",
        settings: {
          _pending_linear_creds: {
            clientId: values.consumerKey,
            clientSecret: values.consumerSecret,
            planTier: values.planTier,
          },
        },
      },
    ],
  }),
  quickSetup: {
    title: "How to create a Linear OAuth application",
    steps: [
      "Open Linear → Settings → Account → API",
      "Under 'OAuth applications', click 'Create new'",
      "Name: 'Efficyon Cost Analyzer'. Redirect URI: http://localhost:4000/api/integrations/linear/callback (use prod URL when deploying)",
      "Scopes: 'read' (single read scope is enough)",
      "Save. Copy the Client ID + Client Secret from the app's page",
      "Paste them above along with your plan tier, then click Connect",
    ],
  },
  endpoints: [
    { key: "status", path: "/api/integrations/linear/status" },
    { key: "users",  path: "/api/integrations/linear/users", pick: ["users"], fallback: [] },
  ],
  defaultTab: "users",
  viewComponent: LinearView,
  connectingToast: "Redirecting to Linear to authorize…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To revoke access: Linear → Settings → Account → API → OAuth applications → 'Efficyon Cost Analyzer' → Revoke. Or delete the OAuth app entirely.",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/linear/cost-leaks",
  analysisSupportsInactivity: true,
}
