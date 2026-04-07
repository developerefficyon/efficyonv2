import type { ToolConfig } from "../types"

export const googleWorkspaceConfig: ToolConfig = {
  provider: "GoogleWorkspace",
  label: "Google Workspace",
  defaultTab: "users",
  endpoints: [
    { key: "users", path: "/api/integrations/googleworkspace/users", pick: ["users"], fallback: [] },
    { key: "domain", path: "/api/integrations/googleworkspace/domain", pick: ["domain"] },
    { key: "groups", path: "/api/integrations/googleworkspace/groups", pick: ["groups"], fallback: [] },
    { key: "licenses", path: "/api/integrations/googleworkspace/licenses" },
  ],
}
