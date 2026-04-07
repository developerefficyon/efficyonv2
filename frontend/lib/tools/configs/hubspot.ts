import type { ToolConfig } from "../types"

export const hubspotConfig: ToolConfig = {
  provider: "HubSpot",
  label: "HubSpot",
  defaultTab: "users",
  endpoints: [
    { key: "users", path: "/api/integrations/hubspot/users", pick: ["users"], fallback: [] },
    // Account info endpoint returns the account payload at the root
    { key: "accountInfo", path: "/api/integrations/hubspot/account" },
  ],
}
