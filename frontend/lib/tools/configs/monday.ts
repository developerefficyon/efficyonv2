import type { UnifiedToolConfig } from "../types"
import { MondayView } from "@/components/tools/monday-view"

export const mondayConfig: UnifiedToolConfig = {
  // IDENTITY
  provider: "monday",
  id: "monday",
  label: "monday.com",

  // UI METADATA
  category: "Productivity",
  description:
    "Detect inactive users, seat-tier overprovisioning (monday's signature leak), pending invites holding paid seats, view-only members on paid plans, and disabled users still billing.",
  brandColor: "#FF3D57",

  // AUTH & CONNECT
  authType: "oauth",
  authFields: [
    {
      name: "consumerKey",
      label: "monday.com OAuth Client ID",
      type: "text",
      required: true,
      placeholder: "<client-id>",
      hint: "From monday.com Developer Center → your app → OAuth & Permissions",
    },
    {
      name: "consumerSecret",
      label: "monday.com OAuth Client Secret",
      type: "password",
      required: true,
      placeholder: "<client-secret>",
    },
    {
      name: "seatCostUsd",
      label: "Per-seat cost (USD/user/mo)",
      type: "text",
      required: true,
      placeholder: "12",
      hint: "Basic ~$9, Standard ~$12, Pro ~$19 (annual). Enter your actual per-seat rate.",
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/monday/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "monday",
        connection_type: "oauth",
        status: "pending",
        settings: {
          _pending_monday_creds: {
            clientId: values.consumerKey,
            clientSecret: values.consumerSecret,
            seatCostUsd: values.seatCostUsd,
          },
        },
      },
    ],
  }),

  // UI HINTS
  callouts: [
    {
      type: "info",
      title: "Admin permission required",
      body: "Connect with a monday.com Admin account — required to read the user directory and account/plan info via the OAuth scopes (users:read, account:read).",
    },
  ],
  quickSetup: {
    title: "How to create a monday.com OAuth app",
    steps: [
      "Open monday.com → Avatar → Developers → Build apps",
      "Create app → Name: 'Efficyon Cost Analyzer'",
      "OAuth & Permissions → add scopes: me:read, users:read, account:read, boards:read, updates:read",
      "OAuth & Permissions → add Redirect URI: http://localhost:4000/api/integrations/monday/callback (use production host when deployed)",
      "Copy the Client ID and Client Secret from the Basic Information tab",
      "Paste them above with your per-seat cost and click Connect",
      "Approve consent on the monday.com screen as an Admin",
    ],
  },

  // DATA FETCHING
  endpoints: [
    { key: "status", path: "/api/integrations/monday/status" },
    { key: "users", path: "/api/integrations/monday/users", pick: ["users"], fallback: [] },
  ],
  defaultTab: "users",

  // DETAIL PAGE
  viewComponent: MondayView,

  // TOASTS
  connectingToast: "Redirecting to monday.com to authorize…",

  // DELETE FLOW
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To revoke manually: monday.com → Avatar → Developers → 'Efficyon Cost Analyzer' → Delete; or Admin → Apps → installed apps → Uninstall.",
  },

  // ANALYSIS
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/monday/cost-leaks",
  analysisSupportsInactivity: true,
}
