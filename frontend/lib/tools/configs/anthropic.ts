import type { ToolConfig } from "../types"

export const anthropicConfig: ToolConfig = {
  provider: "Anthropic",
  label: "Anthropic",
  defaultTab: "overview",
  endpoints: [
    { key: "usage", path: "/api/integrations/anthropic/usage?days=30" },
    { key: "status", path: "/api/integrations/anthropic/status" },
  ],
}
