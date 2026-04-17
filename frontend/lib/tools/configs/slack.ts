import type { UnifiedToolConfig } from "../types"
import { SlackView } from "@/components/tools/slack-view"

export const slackConfig: UnifiedToolConfig = {
  provider: "Slack",
  id: "slack",
  label: "Slack",
  category: "Communication",
  description: "Users, channels & seat cost analysis",
  brandColor: "#4A154B",
  authType: "oauth",
  authFields: [
    { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Your Slack App Client ID" },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Your Slack App Client Secret" },
    {
      name: "tier",
      label: "Plan Tier",
      type: "select",
      required: false,
      options: [
        { value: "free", label: "Free" },
        { value: "standard", label: "Pro (~$8.75/seat)" },
        { value: "plus", label: "Business+ (~$15/seat)" },
      ],
    },
    {
      name: "paidSeats",
      label: "Paid Seats",
      type: "text",
      required: false,
      placeholder: "Auto-detected after connection",
      validate: (v) => {
        if (!v) return null
        const n = parseInt(v, 10)
        if (isNaN(n) || n < 1) return "Must be a positive integer"
        return null
      },
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/slack/oauth/start",
  buildConnectRequest: (values) => {
    const paidSeats = values.paidSeats ? parseInt(values.paidSeats, 10) : null
    return {
      integrations: [
        {
          tool_name: "Slack",
          connection_type: "oauth",
          status: "pending",
          client_id: values.clientId,
          client_secret: values.clientSecret,
          pricing: {
            tier: values.tier || null,
            ...(paidSeats ? { paid_seats: paidSeats } : {}),
          },
        },
      ],
    }
  },
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "Go to api.slack.com/apps → Create New App → From scratch",
      "Name it (e.g. 'Efficyon Cost Analyzer') and pick your workspace",
      "Under OAuth & Permissions add user-token scopes: users:read, users:read.email, team:read",
      "Add redirect URL: <your-backend>/api/integrations/slack/callback",
      "Copy the Client ID and Client Secret from Basic Information and paste here",
    ],
    note: "Requires a workspace admin. Slack user tokens do not expire — one-time setup.",
  },
  endpoints: [
    { key: "users", path: "/api/integrations/slack/users", pick: ["users"], fallback: [] },
    { key: "team", path: "/api/integrations/slack/team", pick: ["team", "teamInfo"] },
  ],
  defaultTab: "users",
  viewComponent: SlackView,
  connectingToast: "Redirecting to Slack to authorize…",
  tokenRevocation: { automated: true },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/slack/cost-leaks",
  analysisSupportsInactivity: true,
}
