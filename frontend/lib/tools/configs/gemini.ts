import type { ToolConfig } from "../types"

export const geminiConfig: ToolConfig = {
  provider: "Gemini",
  label: "Gemini",
  defaultTab: "overview",
  endpoints: [
    { key: "usage", path: "/api/integrations/gemini/usage?days=30" },
    { key: "status", path: "/api/integrations/gemini/status" },
  ],
}
