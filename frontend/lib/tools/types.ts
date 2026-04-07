/**
 * Tool registry types.
 *
 * The goal of this module is to make adding a new tool integration to the
 * dashboard a single-file operation. Each tool declares the endpoints whose
 * responses make up its "info" payload (the data shown on the tool detail
 * page). The generic loader handles auth, parallel fetching, token-expiry
 * detection, and parsing — so per-tool files only describe the data shape,
 * never the mechanics.
 */

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
 *
 * - `key`        Field on the resulting info object.
 * - `path`       Backend path (relative to `${API_BASE}`).
 * - `pick`       Ordered list of response keys to try, first hit wins.
 *                e.g. ["Invoices", "invoices"] handles casing variants.
 * - `fallback`   Value to use when none of the `pick` keys are present.
 *                Defaults to [] for arrays, undefined otherwise.
 */
export interface ToolEndpoint {
  key: string
  path: string
  pick?: string[]
  fallback?: any
}

/**
 * Static configuration for a single tool. Lives in `lib/tools/configs/<name>.ts`.
 */
export interface ToolConfig {
  /** Provider/tool_name as stored in `company_integrations.provider`. */
  provider: string
  /** Human label used in toast messages. */
  label: string
  /** Endpoints whose responses are merged into the info object. */
  endpoints: ToolEndpoint[]
  /** Default tab id for this tool's detail view. */
  defaultTab: string
}

export type ToolInfo = Record<string, any>
