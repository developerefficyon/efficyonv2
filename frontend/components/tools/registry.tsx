/**
 * Tool view registry.
 *
 * Maps a provider name to the React component that renders its detail-page
 * body. The page component (`dashboard/tools/[id]/page.tsx`) consults this
 * registry first; if a view is registered, it renders it and skips the legacy
 * inline JSX. If not, it falls through to the existing per-tool sections.
 *
 * Adding a new tool's detail UI:
 *   1. Create `components/tools/<name>-view.tsx` exporting a `ToolView` component.
 *   2. Add it to `TOOL_VIEW_REGISTRY` below keyed by the provider name as
 *      stored in `company_integrations.provider`.
 *
 * That's it — zero edits to the giant page file.
 */

import type { ComponentType } from "react"
import type { Integration, ToolInfo } from "@/lib/tools/types"
import { OpenAIView } from "./openai-view"
import { GoogleWorkspaceView } from "./google-workspace-view"

export interface ToolViewProps {
  integration: Integration
  info: ToolInfo | null
  isLoading: boolean
  reload: () => Promise<void>
}

// OpenAIView is generic over the `{summary, daily, by_model}` payload shape
// that the OpenAI and Anthropic controllers both return, so it's reused for
// both providers. If a future AI provider needs different fields, fork the
// component then.
export const TOOL_VIEW_REGISTRY: Record<string, ComponentType<ToolViewProps>> = {
  OpenAI: OpenAIView,
  Anthropic: OpenAIView,
  Gemini: OpenAIView,
  GoogleWorkspace: GoogleWorkspaceView,
  // Migrating an existing tool from the legacy inline JSX is incremental:
  // create components/tools/<name>-view.tsx, register it here, and remove
  // the corresponding section from page.tsx in the same PR.
}

export function getToolView(providerOrToolName?: string): ComponentType<ToolViewProps> | undefined {
  if (!providerOrToolName) return undefined
  return TOOL_VIEW_REGISTRY[providerOrToolName]
}
