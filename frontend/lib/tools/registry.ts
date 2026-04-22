/**
 * Tool registry — single source of truth mapping a provider name to its config.
 *
 * Adding a new tool integration to the dashboard:
 *   1. Create `lib/tools/configs/<name>.ts` exporting a `UnifiedToolConfig`.
 *   2. Import + add it to `TOOL_REGISTRY` below.
 *   3. (For data tabs) create `components/tools/<name>-view.tsx` and wire it
 *      into the config's `viewComponent` field.
 *
 * That's it. No edits to the giant `[id]/page.tsx` are required.
 */

import type { UnifiedToolConfig } from "./types"
import { fortnoxConfig } from "./configs/fortnox"
import { microsoft365Config } from "./configs/microsoft365"
import { hubspotConfig } from "./configs/hubspot"
import { quickbooksConfig } from "./configs/quickbooks"
import { shopifyConfig } from "./configs/shopify"
import { openaiConfig } from "./configs/openai"
import { anthropicConfig } from "./configs/anthropic"
import { geminiConfig } from "./configs/gemini"
import { googleWorkspaceConfig } from "./configs/googleworkspace"
import { slackConfig } from "./configs/slack"
import { gcpConfig } from "./configs/gcp"
import { awsConfig } from "./configs/aws"
import { azureConfig } from "./configs/azure"
import { zoomConfig } from "./configs/zoom"

export const TOOL_REGISTRY: Record<string, UnifiedToolConfig> = {
  Fortnox: fortnoxConfig,
  Microsoft365: microsoft365Config,
  HubSpot: hubspotConfig,
  QuickBooks: quickbooksConfig,
  Shopify: shopifyConfig,
  OpenAI: openaiConfig,
  Anthropic: anthropicConfig,
  Gemini: geminiConfig,
  GoogleWorkspace: googleWorkspaceConfig,
  Slack: slackConfig,
  GCP: gcpConfig,
  AWS: awsConfig,
  Azure: azureConfig,
  Zoom: zoomConfig,
}

/**
 * Look up a tool config by the provider/tool_name as stored in
 * `company_integrations`. Returns undefined for unknown providers so the page
 * can render a generic empty state instead of crashing.
 */
export function getToolConfig(providerOrToolName?: string): UnifiedToolConfig | undefined {
  if (!providerOrToolName) return undefined
  return TOOL_REGISTRY[providerOrToolName]
}
