import type { UnifiedToolConfig } from "../types"
import { ZoomView } from "@/components/tools/zoom-view"

export const zoomConfig: UnifiedToolConfig = {
  provider: "Zoom",
  id: "zoom",
  label: "Zoom",
  category: "Productivity",
  description: "Inactive licensed users, unused add-ons, and tier-mismatch detection",
  brandColor: "#2D8CFF",
  authType: "apiKey",
  authFields: [
    {
      name: "accountId",
      label: "Account ID",
      type: "text",
      required: true,
      placeholder: "abc123DEFghi456",
      hint: "Zoom Marketplace → your S2S app → App Credentials → Account ID",
    },
    { name: "clientId", label: "Client ID", type: "text", required: true },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true },
    {
      name: "planTier",
      label: "Plan Tier",
      type: "select",
      required: true,
      options: [
        { value: "pro", label: "Pro ($14.99/seat/mo)" },
        { value: "business", label: "Business ($21.99/seat/mo)" },
        { value: "business_plus", label: "Business Plus ($26.99/seat/mo)" },
        { value: "enterprise", label: "Enterprise" },
      ],
      hint: "Used to calculate per-seat savings. You can change this later by reconnecting.",
    },
  ],
  connectEndpoint: "/api/integrations",
  buildConnectRequest: (values) => ({
    integrations: [{
      tool_name: "Zoom",
      connection_type: "apiKey",
      status: "pending",
      settings: {
        _pending_zoom_creds: {
          accountId: values.accountId,
          clientId: values.clientId,
          clientSecret: values.clientSecret,
        },
        plan_tier: values.planTier,
        inactivity_days: 30,
      },
    }],
  }),
  quickSetup: {
    title: "How to get your Zoom credentials",
    steps: [
      "Go to marketplace.zoom.us → sign in as admin",
      "Develop → Build App → Server-to-Server OAuth",
      "Name the app 'Efficyon Cost Analyzer' → Create",
      "Add scopes: user:read:list_users:admin, user:read:user:admin, account:read:list_addons:admin",
      "Activate the app, then copy Account ID + Client ID + Client Secret here",
    ],
  },
  endpoints: [
    { key: "users",   path: "/api/integrations/zoom/users",   pick: ["users"], fallback: [] },
    { key: "account", path: "/api/integrations/zoom/account" },
    { key: "status",  path: "/api/integrations/zoom/status" },
  ],
  defaultTab: "users",
  viewComponent: ZoomView,
  connectingToast: "Validating Zoom credentials…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To revoke access, deactivate or delete the 'Efficyon Cost Analyzer' S2S app at marketplace.zoom.us → Develop → Manage.",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/zoom/cost-leaks",
  analysisSupportsInactivity: true,
}
