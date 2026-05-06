import type { UnifiedToolConfig } from "../types"
import { AirtableView } from "@/components/tools/airtable-view"

export const airtableConfig: UnifiedToolConfig = {
  // IDENTITY
  provider: "airtable",
  id: "airtable",
  label: "Airtable",

  // UI METADATA
  category: "Productivity",
  description:
    "Detect seat overprovisioning (subscribed > active) and Business-tier overspec when base counts fit the cheaper Team tier. Per-user inactive/editor checks require Enterprise SCIM scopes.",
  brandColor: "#FCB400",

  // AUTH & CONNECT
  authType: "oauth",
  authFields: [
    {
      name: "consumerKey",
      label: "Airtable OAuth Client ID",
      type: "text",
      required: true,
      placeholder: "<client-id>",
      hint: "From Airtable → Builder Hub → OAuth integrations → your integration → Client details",
    },
    {
      name: "consumerSecret",
      label: "Airtable OAuth Client Secret",
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
        { value: "free", label: "Free" },
        { value: "team", label: "Team ($20/seat)" },
        { value: "business", label: "Business ($45/seat)" },
        { value: "enterprise", label: "Enterprise Scale" },
      ],
      hint: "Airtable doesn't expose plan tier via the public OAuth API — please pick the plan you're billed on.",
    },
    {
      name: "seatCostUsd",
      label: "Per-seat cost (USD/seat/mo)",
      type: "text",
      required: true,
      placeholder: "20",
      hint: "List prices: Team $20, Business $45 (annual). Enter your actual per-seat rate.",
    },
    {
      name: "subscribedSeats",
      label: "Subscribed seats (optional)",
      type: "text",
      required: false,
      placeholder: "e.g. 25",
      hint: "Total seats on your subscription. Required for the seat-overprovisioning and plan-tier-overspec checks.",
    },
    {
      name: "activeSeats",
      label: "Active seats (optional)",
      type: "text",
      required: false,
      placeholder: "e.g. 18",
      hint: "Seats you'd actually keep on renewal. Without Enterprise SCIM scopes Airtable's API can't enumerate other users, so this is your honest count. Drives the seat-overprovisioning math.",
    },
    {
      name: "primaryDomains",
      label: "Primary email domains (optional)",
      type: "text",
      required: false,
      placeholder: "e.g. acme.com, acme.io",
      hint: "Comma-separated. Used as a domain hint for future enterprise-only checks.",
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/airtable/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "airtable",
        connection_type: "oauth",
        status: "pending",
        settings: {
          _pending_airtable_creds: {
            clientId: values.consumerKey,
            clientSecret: values.consumerSecret,
            planTier: values.planTier,
            seatCostUsd: values.seatCostUsd,
            subscribedSeats: values.subscribedSeats,
            activeSeats: values.activeSeats,
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
      title: "Workspace owner recommended",
      body: "Connect with an Airtable account that owns the workspaces you're auditing. Read-only scopes (user.email:read, schema.bases:read) are sufficient for V1 checks.",
    },
    {
      type: "info",
      title: "Member visibility is limited without Enterprise",
      body: "Airtable's public OAuth API exposes only the connecting user. Per-user inactive and editor-misclassified checks need Enterprise SCIM scopes — for now, V1 leans on the seat counts you provide above.",
    },
  ],
  quickSetup: {
    title: "How to create an Airtable OAuth integration",
    steps: [
      "Open airtable.com/create/oauth (Builder Hub → OAuth integrations) → click 'Register new OAuth integration'",
      "Name it 'Efficyon Cost Analyzer'",
      "Add Redirect URL: http://localhost:4000/api/integrations/airtable/callback (use your production host when deployed)",
      "Add scopes: user.email:read and schema.bases:read",
      "Copy the Client ID and Client Secret",
      "Paste them above with your plan tier, per-seat cost, and seat counts, then click Connect",
      "Approve consent on the Airtable screen as the workspace owner",
    ],
  },

  // DATA FETCHING
  endpoints: [
    { key: "status", path: "/api/integrations/airtable/status" },
    { key: "users", path: "/api/integrations/airtable/users", pick: ["users"], fallback: [] },
  ],
  defaultTab: "users",

  // DETAIL PAGE
  viewComponent: AirtableView,

  // TOASTS
  connectingToast: "Redirecting to Airtable to authorize…",

  // DELETE FLOW
  tokenRevocation: {
    automated: true,
    manualStepsNote:
      "Efficyon revokes the OAuth token automatically on disconnect. To remove the integration entirely: airtable.com/create/oauth → 'Efficyon Cost Analyzer' → Revoke or delete.",
  },

  // ANALYSIS
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/airtable/cost-leaks",
  analysisSupportsInactivity: true,
}
