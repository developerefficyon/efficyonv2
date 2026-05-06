import type { UnifiedToolConfig } from "../types"
import { AsanaView } from "@/components/tools/asana-view"

export const asanaConfig: UnifiedToolConfig = {
  // IDENTITY
  provider: "asana",
  id: "asana",
  label: "Asana",

  // UI METADATA
  category: "Productivity",
  description:
    "Detect inactive members, deactivated users still in the workspace, seat overprovisioning (subscribed > active), and external collaborators billed as full members instead of free guests.",
  brandColor: "#F06A6A",

  // AUTH & CONNECT
  authType: "oauth",
  authFields: [
    {
      name: "consumerKey",
      label: "Asana OAuth Client ID",
      type: "text",
      required: true,
      placeholder: "<client-id>",
      hint: "From Asana → My profile → Apps → Manage Developer Apps → your app → OAuth",
    },
    {
      name: "consumerSecret",
      label: "Asana OAuth Client Secret",
      type: "password",
      required: true,
      placeholder: "<client-secret>",
    },
    {
      name: "planTier",
      label: "Plan tier",
      type: "select",
      required: true,
      options: [
        { value: "free", label: "Free / Personal" },
        { value: "starter", label: "Starter" },
        { value: "advanced", label: "Advanced" },
        { value: "enterprise", label: "Enterprise" },
        { value: "enterprise+", label: "Enterprise+" },
      ],
      hint: "Asana doesn't expose plan tier via the public API — please pick the plan you're billed on.",
    },
    {
      name: "seatCostUsd",
      label: "Per-seat cost (USD/seat/mo)",
      type: "text",
      required: true,
      placeholder: "10.99",
      hint: "Starter ~$10.99, Advanced ~$24.99 (annual). Enter your actual per-seat rate.",
    },
    {
      name: "subscribedSeats",
      label: "Subscribed seats (optional)",
      type: "text",
      required: false,
      placeholder: "e.g. 25",
      hint: "Total seats on your subscription. If provided, enables the seat-overprovisioning check.",
    },
    {
      name: "primaryDomains",
      label: "Primary email domains (optional)",
      type: "text",
      required: false,
      placeholder: "e.g. acme.com, acme.io",
      hint: "Comma-separated. Used by the guest-misclassified check; auto-detected if blank.",
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/asana/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "asana",
        connection_type: "oauth",
        status: "pending",
        settings: {
          _pending_asana_creds: {
            clientId: values.consumerKey,
            clientSecret: values.consumerSecret,
            planTier: values.planTier,
            seatCostUsd: values.seatCostUsd,
            subscribedSeats: values.subscribedSeats,
            primaryDomains: values.primaryDomains,
          },
        },
      },
    ],
  }),

  // UI HINTS
  callouts: [
    {
      type: "info",
      title: "Workspace admin recommended",
      body: "Connect with an Asana account that's a workspace/organization admin so directory and member-status reads are complete. Read-only scopes are sufficient.",
    },
  ],
  quickSetup: {
    title: "How to create an Asana OAuth app",
    steps: [
      "Open Asana → click your avatar → My profile → Apps → Manage Developer Apps",
      "Click 'Create new app' → name: 'Efficyon Cost Analyzer'",
      "Set Redirect URL: http://localhost:4000/api/integrations/asana/callback (use your production host when deployed)",
      "Copy the Client ID and Client Secret from the app's OAuth settings",
      "Paste them above with your plan tier and per-seat cost, then click Connect",
      "Approve consent on the Asana screen as a workspace admin",
    ],
  },

  // DATA FETCHING
  endpoints: [
    { key: "status", path: "/api/integrations/asana/status" },
    { key: "users", path: "/api/integrations/asana/users", pick: ["users"], fallback: [] },
  ],
  defaultTab: "users",

  // DETAIL PAGE
  viewComponent: AsanaView,

  // TOASTS
  connectingToast: "Redirecting to Asana to authorize…",

  // DELETE FLOW
  tokenRevocation: {
    automated: true,
    manualStepsNote:
      "Efficyon revokes the OAuth token automatically on disconnect. To remove the app entirely: Asana → My profile → Apps → 'Efficyon Cost Analyzer' → Deauthorize.",
  },

  // ANALYSIS
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/asana/cost-leaks",
  analysisSupportsInactivity: true,
}
