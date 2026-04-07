import type { ToolConfig } from "../types"

export const openaiConfig: ToolConfig = {
  provider: "OpenAI",
  label: "OpenAI",
  defaultTab: "overview",
  endpoints: [
    // The usage endpoint already returns { summary, daily, by_model } shaped
    // for the dashboard — we just keep the whole payload under one key.
    { key: "usage", path: "/api/integrations/openai/usage?days=30" },
    { key: "status", path: "/api/integrations/openai/status" },
  ],
}
