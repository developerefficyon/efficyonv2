import type { UnifiedToolConfig } from "../types"
import { AtlassianView } from "@/components/tools/atlassian-view"

export const atlassianConfig: UnifiedToolConfig = {
  // IDENTITY
  provider: "Atlassian",
  id: "atlassian",
  label: "Atlassian (Jira + Confluence)",

  // UI METADATA
  category: "Productivity",
  description:
    "Detect inactive Jira/Confluence users and cross-product seat overlap (users paying for both but only using one).",
  brandColor: "#0052CC",

  // AUTH & CONNECT
  authType: "oauth",
  authFields: [
    {
      name: "consumerKey",
      label: "Atlassian OAuth Client ID",
      type: "text",
      required: true,
      placeholder: "<client-id>",
      hint: "From developer.atlassian.com/console/myapps/ → your OAuth 2.0 integration",
    },
    {
      name: "consumerSecret",
      label: "Atlassian OAuth Client Secret",
      type: "password",
      required: true,
      placeholder: "<client-secret>",
    },
    {
      name: "jiraSeatCostUsd",
      label: "Jira Software seat cost (USD/user/mo)",
      type: "text",
      required: true,
      placeholder: "7.75",
      hint: "Standard ~$7.75, Premium ~$15.25 (annual). Enter your actual per-seat rate.",
    },
    {
      name: "confluenceSeatCostUsd",
      label: "Confluence seat cost (USD/user/mo)",
      type: "text",
      required: true,
      placeholder: "6.05",
      hint: "Standard ~$6.05, Premium ~$11.55 (annual). Enter your actual per-seat rate.",
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/atlassian/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "Atlassian",
        connection_type: "oauth",
        status: "pending",
        settings: {
          _pending_atlassian_creds: {
            clientId: values.consumerKey,
            clientSecret: values.consumerSecret,
            jiraSeatCostUsd: values.jiraSeatCostUsd,
            confluenceSeatCostUsd: values.confluenceSeatCostUsd,
          },
        },
      },
    ],
  }),

  // UI HINTS
  callouts: [
    {
      type: "warning",
      title: "Org Admin approval required",
      body: "An Atlassian Cloud Organization Admin must approve the install — required for the Org Directory API that surfaces last-active dates per product.",
    },
  ],
  quickSetup: {
    title: "How to create an Atlassian OAuth integration",
    steps: [
      "Open developer.atlassian.com/console/myapps/ → Create → OAuth 2.0 integration",
      "Name: 'Efficyon Cost Analyzer'",
      "Permissions: add Jira API (read:jira-user), Confluence API (read:confluence-user.summary), User identity API (read:account), Org Admin API (read:directory:admin-atlassian)",
      "Authorization → set Callback URL: http://localhost:4000/api/integrations/atlassian/callback (use production host when deployed)",
      "Settings → Distribution → set Sharing to enabled",
      "Copy the Client ID + Secret from the Settings page",
      "Paste them above with your per-product seat costs and click Connect",
      "Approve consent on the Atlassian screen as a Cloud Org Admin",
    ],
  },

  // DATA FETCHING
  endpoints: [
    { key: "status", path: "/api/integrations/atlassian/status" },
    { key: "users",  path: "/api/integrations/atlassian/users", pick: ["users"], fallback: [] },
  ],
  defaultTab: "users",

  // DETAIL PAGE
  viewComponent: AtlassianView,

  // TOASTS
  connectingToast: "Redirecting to Atlassian to authorize…",

  // DELETE FLOW
  tokenRevocation: {
    automated: true,
    manualStepsNote:
      "To revoke manually: developer.atlassian.com/console/myapps/ → 'Efficyon Cost Analyzer' → Delete; or admin.atlassian.com → Settings → Connected apps.",
  },

  // ANALYSIS
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/atlassian/cost-leaks",
  analysisSupportsInactivity: true,
}
