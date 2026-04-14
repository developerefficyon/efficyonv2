import type { ComponentType } from "react"

export interface Integration {
  id: string
  tool_name: string
  provider?: string
  connection_type: string
  status: string
  created_at: string
  updated_at: string
  settings?: any
  oauth_data?: any
}

/**
 * One endpoint that contributes to a tool's info payload.
 */
export interface ToolEndpoint {
  key: string
  path: string
  pick?: string[]
  fallback?: any
}

/**
 * A single field in a tool's connect form.
 */
export interface AuthField {
  name: string
  label: string
  type: "text" | "password" | "textarea" | "select"
  required: boolean
  placeholder?: string
  hint?: string
  options?: { value: string; label: string }[]
  validate?: (value: string) => string | null
}

export type ToolCategory =
  | "Finance"
  | "Productivity"
  | "CRM/Marketing"
  | "E-Commerce"
  | "AI"
  | "Communication"
  | "Other"

export type AuthType = "oauth" | "apiKey" | "serviceAccount"

export type ToolInfo = Record<string, any>

export interface ToolViewProps {
  integration: Integration
  info: ToolInfo | null
  isLoading: boolean
  reload: () => Promise<void>
}

/**
 * Unified tool configuration — single source of truth per tool.
 */
export interface UnifiedToolConfig {
  // IDENTITY
  provider: string
  id: string
  label: string

  // UI METADATA
  category: ToolCategory
  description: string
  brandColor: string

  // AUTH & CONNECT
  authType: AuthType
  authFields: AuthField[]
  connectEndpoint: string
  oauthStartEndpoint?: string
  buildConnectRequest: (formValues: Record<string, any>) => Record<string, any>
  validate?: (formValues: Record<string, any>) => string | null

  // UI HINTS
  quickSetup?: { title: string; steps: string[]; note?: string }
  callouts?: { type: "info" | "warning" | "success"; title: string; body: string; link?: string }[]

  // DATA FETCHING
  endpoints: ToolEndpoint[]
  defaultTab: string

  // DETAIL PAGE
  viewComponent: ComponentType<ToolViewProps>

  // TOASTS
  connectingToast?: string
  connectedToast?: string
}

/**
 * Legacy alias — kept so old `getToolConfig` consumers still compile during the
 * migration. Will be removed after all consumers use UnifiedToolConfig.
 */
export type ToolConfig = UnifiedToolConfig
