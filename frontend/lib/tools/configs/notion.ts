import type { UnifiedToolConfig } from "../types"
import { NotionView } from "@/components/tools/notion-view"

export const notionConfig: UnifiedToolConfig = {
  provider: "Notion",
  id: "notion",
  label: "Notion",
  category: "Productivity",
  description: "Bot users billed as paid seats, seat-utilization gaps, and Notion AI add-on exposure",
  brandColor: "#000000",
  authType: "oauth",
  authFields: [
    {
      name: "consumerKey",
      label: "Notion Integration Client ID",
      type: "text",
      required: true,
      hint: "From your Notion integration's secrets page (notion.so/my-integrations)",
    },
    {
      name: "consumerSecret",
      label: "Notion Integration Client Secret",
      type: "password",
      required: true,
      hint: "Same secrets page as the Client ID",
    },
    {
      name: "planTier",
      label: "Plan Tier",
      type: "select",
      required: true,
      options: [
        { value: "free", label: "Free ($0/seat)" },
        { value: "plus", label: "Plus ($10/seat/mo)" },
        { value: "business", label: "Business ($18/seat/mo)" },
        { value: "enterprise", label: "Enterprise ($25/seat/mo default)" },
      ],
    },
    {
      name: "totalSeats",
      label: "Total Paid Seats",
      type: "text",
      required: true,
      placeholder: "25",
      hint: "How many paid seats you purchased — check Notion → Settings → Plans",
    },
    {
      name: "hasAI",
      label: "Notion AI Add-On?",
      type: "select",
      required: true,
      options: [
        { value: "no", label: "No" },
        { value: "yes", label: "Yes — adds $10/seat/mo to detected exposure" },
      ],
    },
    {
      name: "aiSeats",
      label: "Total Notion AI Seats",
      type: "text",
      required: false,
      placeholder: "Leave blank if no AI",
      hint: "Only required if you have Notion AI",
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/notion/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "Notion",
        connection_type: "oauth",
        status: "pending",
        settings: {
          _pending_notion_creds: {
            clientId: values.consumerKey,
            clientSecret: values.consumerSecret,
            planTier: values.planTier,
            totalSeats: values.totalSeats,
            hasAI: values.hasAI,
            aiSeats: values.aiSeats || "0",
          },
        },
      },
    ],
  }),
  quickSetup: {
    title: "How to create a Notion public integration",
    steps: [
      "Go to https://www.notion.so/my-integrations",
      "Click 'New integration'. Type: Public. Name: 'Efficyon Cost Analyzer'",
      "Set Redirect URIs to: http://localhost:4000/api/integrations/notion/callback (use prod URL when deploying)",
      "Capabilities: 'Read content' + 'Read user information including email addresses'",
      "Save. Copy OAuth Client ID + Client Secret from the integration's Secrets page",
      "Paste them above along with your plan tier and seat counts, then click Connect",
    ],
    note: "Notion access tokens don't expire — once connected, no re-auth is needed unless you disconnect the integration in your workspace.",
  },
  endpoints: [
    { key: "status", path: "/api/integrations/notion/status" },
    { key: "users",  path: "/api/integrations/notion/users", pick: ["users"], fallback: [] },
  ],
  defaultTab: "users",
  viewComponent: NotionView,
  connectingToast: "Redirecting to Notion to authorize…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To revoke access: Notion → Settings & members → Connections → 'Efficyon Cost Analyzer' → Disconnect. Or delete the integration entirely from notion.so/my-integrations.",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/notion/cost-leaks",
  analysisSupportsInactivity: false,
}
