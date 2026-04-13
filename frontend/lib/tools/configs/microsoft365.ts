import type { ToolConfig } from "../types"

export const microsoft365Config: ToolConfig = {
  provider: "Microsoft365",
  label: "Microsoft 365",
  defaultTab: "licenses",
  endpoints: [
    { key: "licenses", path: "/api/integrations/microsoft365/licenses", pick: ["licenses"], fallback: [] },
    { key: "users", path: "/api/integrations/microsoft365/users", pick: ["users"], fallback: [] },
    { key: "usageReports", path: "/api/integrations/microsoft365/usage", pick: ["usageReports", "usage"], fallback: null },
  ],
}
