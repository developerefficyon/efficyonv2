import type { UnifiedToolConfig } from "../types"
import { HubSpotView } from "@/components/tools/hubspot-view"

export const hubspotConfig: UnifiedToolConfig = {
  provider: "HubSpot",
  id: "hubspot",
  label: "HubSpot",
  category: "CRM/Marketing",
  description: "Contacts, deals & marketing data",
  brandColor: "#FF7A59",
  authType: "oauth",
  authFields: [
    { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Your HubSpot App Client ID" },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Your HubSpot App Client Secret" },
    {
      name: "hubType",
      label: "Primary Hub",
      type: "select",
      required: false,
      options: [
        { value: "starter_platform", label: "Starter Customer Platform (All Hubs)" },
        { value: "marketing", label: "Marketing Hub" },
        { value: "sales", label: "Sales Hub" },
        { value: "service", label: "Service Hub" },
        { value: "content", label: "Content Hub" },
        { value: "operations", label: "Operations Hub" },
      ],
    },
    {
      name: "tier",
      label: "Plan Tier",
      type: "select",
      required: false,
      options: [
        { value: "starter", label: "Starter ($15-20/seat)" },
        { value: "professional", label: "Professional ($50-100/seat)" },
        { value: "enterprise", label: "Enterprise ($75-150/seat)" },
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
  oauthStartEndpoint: "/api/integrations/hubspot/oauth/start",
  buildConnectRequest: (values) => {
    const paidSeats = values.paidSeats ? parseInt(values.paidSeats, 10) : null
    return {
      integrations: [
        {
          tool_name: "HubSpot",
          connection_type: "oauth",
          status: "pending",
          client_id: values.clientId,
          client_secret: values.clientSecret,
          pricing: {
            hub_type: values.hubType || "sales",
            tier: values.tier || "professional",
            ...(paidSeats ? { paid_seats: paidSeats } : {}),
          },
        },
      ],
    }
  },
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "Go to HubSpot > Settings > Integrations > Private Apps",
      "Create app with required scopes",
      "Copy the Client ID and Client Secret here",
    ],
    note: "settings.users.read, account-info.security.read…",
  },
  endpoints: [
    { key: "users", path: "/api/integrations/hubspot/users", pick: ["users", "results"], fallback: [] },
    { key: "accountInfo", path: "/api/integrations/hubspot/account", pick: ["accountInfo", "account"] },
  ],
  defaultTab: "users",
  viewComponent: HubSpotView,
  connectingToast: "Redirecting to HubSpot to authorize…",
  tokenRevocation: { automated: true },
}
