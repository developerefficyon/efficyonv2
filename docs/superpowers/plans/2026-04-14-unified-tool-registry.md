# Unified Tool Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse 3 parallel tool registries + ~2,000 lines of per-tool duplication in `frontend/app/dashboard/tools/**` into a single `UnifiedToolConfig`, with generic form + connect + detail-page plumbing and 5 migrated legacy view components.

**Architecture:** Three consumers (connect modal, tool cards, detail page) read one registry keyed by provider. Generic hooks (`useToolConnect`, `useOAuthCallback`) replace 9 per-tool connect handlers and 6 OAuth helpers. Every tool gets a `viewComponent`, so `hasFullUI` and the separate `TOOL_VIEW_REGISTRY` disappear.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Supabase

---

## Testing Strategy

No automated test framework exists for these flows. Each task includes:
1. A **TypeScript check** (`npx tsc --noEmit`) to catch type regressions
2. A **manual verification** step using the dev server for UI-touching tasks
3. A **commit** after each task — the branch stays in a green-ish state throughout

Full integration verification happens in Task 17 (final sweep).

---

## File Map

### New files

| File | Task | Responsibility |
|---|---|---|
| `frontend/lib/tools/use-tool-connect.ts` | 4 | Generic connect hook |
| `frontend/lib/tools/oauth-callback-handler.ts` | 6 | Generic OAuth callback query-param handler |
| `frontend/components/tools/tool-connect-form.tsx` | 5 | Generic form renderer |
| `frontend/components/tools/tool-detail-shell.tsx` | 7 | Detail-page chrome |
| `frontend/components/tools/fortnox-view.tsx` | 8 | Migrated Fortnox tabs |
| `frontend/components/tools/microsoft365-view.tsx` | 9 | Migrated MS365 tabs |
| `frontend/components/tools/hubspot-view.tsx` | 10 | Migrated HubSpot tabs |
| `frontend/components/tools/quickbooks-view.tsx` | 11 | Migrated QuickBooks tabs |
| `frontend/components/tools/shopify-view.tsx` | 12 | Migrated Shopify tabs |

### Modified files

| File | Tasks | Change |
|---|---|---|
| `frontend/lib/tools/types.ts` | 1 | Add `UnifiedToolConfig`, `AuthField` |
| `frontend/lib/tools/registry.ts` | 16 | Final export shape |
| `frontend/lib/tools/configs/*.ts` (9 files) | 2, 3 | Add metadata, authFields, buildConnectRequest, viewComponent |
| `frontend/lib/tools/use-tool-info.ts` | 1 | Minor — accept UnifiedToolConfig |
| `frontend/app/dashboard/tools/[id]/page.tsx` | 13 | Gut to ~150 lines |
| `frontend/app/dashboard/tools/page.tsx` | 14, 15 | Gut connect modal + OAuth callbacks |

### Deleted files

| File | Task |
|---|---|
| `frontend/components/tools/registry.tsx` | 16 |

---

## Phase 1 — Type System + Config Skeleton (Tasks 1-3)

### Task 1: Extend `types.ts` with `UnifiedToolConfig` and `AuthField`

**Files:**
- Modify: `frontend/lib/tools/types.ts`

**Audit ref:** HIGH-11 foundation

- [ ] **Step 1: Replace the types file with the unified shape**

Read the current `frontend/lib/tools/types.ts`. It currently exports `Integration`, `ToolEndpoint`, `ToolConfig`, `ToolInfo`.

Replace with:

```typescript
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
 * migration. Will be removed in Task 16 after all consumers use UnifiedToolConfig.
 */
export type ToolConfig = UnifiedToolConfig
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "lib/tools/types" | head -10`
Expected: No errors in `types.ts`. Errors referencing `UnifiedToolConfig` fields in config files are fine — Task 2/3 fix those.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/tools/types.ts
git commit -m "refactor(tools): add UnifiedToolConfig and AuthField types (HIGH-11)"
```

---

### Task 2: Migrate 4 non-OAuth configs to UnifiedToolConfig

**Files:**
- Modify: `frontend/lib/tools/configs/openai.ts`
- Modify: `frontend/lib/tools/configs/anthropic.ts`
- Modify: `frontend/lib/tools/configs/gemini.ts`
- Modify: `frontend/lib/tools/configs/googleworkspace.ts`

**Context:** OpenAI/Anthropic/Gemini use API-key or service-account auth (`authType: "apiKey"` or `"serviceAccount"`). GoogleWorkspace uses OAuth but is grouped here because its view component already exists. All 4 already have `viewComponent` wired via `components/tools/registry.tsx` — we're moving that link into the config.

- [ ] **Step 1: Update `configs/openai.ts`**

Replace the entire file with:

```typescript
import type { UnifiedToolConfig } from "../types"
import { OpenAIView } from "@/components/tools/openai-view"

export const openaiConfig: UnifiedToolConfig = {
  provider: "OpenAI",
  id: "openai",
  label: "OpenAI",
  category: "AI",
  description: "ChatGPT API spend & cost analysis",
  brandColor: "#10A37F",
  authType: "apiKey",
  authFields: [
    {
      name: "apiKey",
      label: "Admin API Key",
      type: "password",
      required: true,
      placeholder: "sk-admin-...",
      hint: "Must start with sk-admin-. Regular project keys won't work.",
      validate: (v) => v.startsWith("sk-admin-") ? null : "Must start with sk-admin-",
    },
  ],
  connectEndpoint: "/api/integrations/openai/connect",
  buildConnectRequest: (values) => ({ api_key: values.apiKey }),
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "Go to platform.openai.com → Organization → Admin keys",
      "Create a new Admin key with billing read access",
      "Paste it here — we'll backfill 90 days of usage",
    ],
  },
  endpoints: [
    { key: "usage", path: "/api/integrations/openai/usage?days=30", pick: ["usage"] },
    { key: "status", path: "/api/integrations/openai/status", pick: ["status"] },
  ],
  defaultTab: "overview",
  viewComponent: OpenAIView,
  connectedToast: "OpenAI connected · Backfilling 90 days of usage in the background…",
}
```

- [ ] **Step 2: Update `configs/anthropic.ts`**

Replace with:

```typescript
import type { UnifiedToolConfig } from "../types"
import { OpenAIView } from "@/components/tools/openai-view"

export const anthropicConfig: UnifiedToolConfig = {
  provider: "Anthropic",
  id: "anthropic",
  label: "Anthropic",
  category: "AI",
  description: "Claude API spend & cost analysis",
  brandColor: "#D97757",
  authType: "apiKey",
  authFields: [
    {
      name: "apiKey",
      label: "Admin API Key",
      type: "password",
      required: true,
      placeholder: "sk-ant-admin01-...",
      hint: "Must start with sk-ant-admin01-. Regular API keys won't work.",
      validate: (v) => v.startsWith("sk-ant-admin01-") ? null : "Must start with sk-ant-admin01-",
    },
  ],
  connectEndpoint: "/api/integrations/anthropic/connect",
  buildConnectRequest: (values) => ({ api_key: values.apiKey }),
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "Go to console.anthropic.com → Settings → Admin Keys",
      "Create an Admin key with usage & billing read access",
      "Paste it here — we'll backfill 90 days of usage",
    ],
  },
  endpoints: [
    { key: "usage", path: "/api/integrations/anthropic/usage?days=30", pick: ["usage"] },
    { key: "status", path: "/api/integrations/anthropic/status", pick: ["status"] },
  ],
  defaultTab: "overview",
  viewComponent: OpenAIView,
  connectedToast: "Anthropic connected · Backfilling 90 days of usage in the background…",
}
```

- [ ] **Step 3: Update `configs/gemini.ts`**

Replace with:

```typescript
import type { UnifiedToolConfig } from "../types"
import { OpenAIView } from "@/components/tools/openai-view"

export const geminiConfig: UnifiedToolConfig = {
  provider: "Gemini",
  id: "gemini",
  label: "Gemini",
  category: "AI",
  description: "Google Gemini API spend & cost analysis",
  brandColor: "#4285F4",
  authType: "serviceAccount",
  authFields: [
    {
      name: "serviceAccountJson",
      label: "Service Account JSON",
      type: "textarea",
      required: true,
      placeholder: '{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----..."}',
      hint: "Paste the full JSON key file. Stored encrypted with AES-256-GCM.",
    },
    {
      name: "bigqueryTable",
      label: "BigQuery Billing Export Table",
      type: "text",
      required: false,
      placeholder: "myproject.billing_export.gcp_billing_export_v1_XXXXXX",
      hint: "With BigQuery export connected, costs are actual. Without it, we pull token counts from Cloud Monitoring and estimate cost.",
    },
  ],
  connectEndpoint: "/api/integrations/gemini/connect",
  buildConnectRequest: (values) => ({
    service_account_json: values.serviceAccountJson,
    bigquery_table: values.bigqueryTable?.trim() || null,
  }),
  validate: (values) => {
    try {
      const parsed = JSON.parse(values.serviceAccountJson)
      if (parsed.type !== "service_account" || !parsed.private_key || !parsed.client_email) {
        return "Must include type='service_account', private_key, and client_email"
      }
      return null
    } catch {
      return "Could not parse the pasted text as JSON"
    }
  },
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "In Google Cloud Console, create a service account in the project where Gemini runs",
      "Grant role Monitoring Viewer (and BigQuery Data Viewer if using export)",
      "Create a JSON key for the service account and paste it above",
    ],
  },
  endpoints: [
    { key: "usage", path: "/api/integrations/gemini/usage?days=30", pick: ["usage"] },
    { key: "status", path: "/api/integrations/gemini/status", pick: ["status"] },
  ],
  defaultTab: "overview",
  viewComponent: OpenAIView,
  connectedToast: "Gemini connected · Backfilling 90 days of usage in the background…",
}
```

- [ ] **Step 4: Update `configs/googleworkspace.ts`**

Replace with:

```typescript
import type { UnifiedToolConfig } from "../types"
import { GoogleWorkspaceView } from "@/components/tools/google-workspace-view"

export const googleWorkspaceConfig: UnifiedToolConfig = {
  provider: "GoogleWorkspace",
  id: "googleworkspace",
  label: "Google Workspace",
  category: "Productivity",
  description: "Users, licenses & directory data",
  brandColor: "#4285F4",
  authType: "oauth",
  authFields: [
    { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "123456789-xxxxxxx.apps.googleusercontent.com" },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "GOCSPX-..." },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/googleworkspace/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "GoogleWorkspace",
        connection_type: "oauth",
        status: "pending",
        client_id: values.clientId,
        client_secret: values.clientSecret,
      },
    ],
  }),
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "In Google Cloud Console, create an OAuth 2.0 Client ID (type: Web application)",
      "Add the Effycion callback URL as an authorized redirect URI",
      "Enable Admin SDK API in the same project; sign in as a Workspace admin when prompted",
      "Paste Client ID and Client Secret here",
    ],
    note: "Required scopes: admin.directory.user.readonly, admin.directory.customer.readonly",
  },
  endpoints: [
    { key: "users", path: "/api/integrations/googleworkspace/users", pick: ["users"], fallback: [] },
    { key: "domain", path: "/api/integrations/googleworkspace/domain", pick: ["domain"] },
    { key: "groups", path: "/api/integrations/googleworkspace/groups", pick: ["groups"], fallback: [] },
    { key: "licenses", path: "/api/integrations/googleworkspace/licenses", pick: ["licenses"], fallback: [] },
  ],
  defaultTab: "users",
  viewComponent: GoogleWorkspaceView,
  connectingToast: "Redirecting to Google to authorize…",
}
```

- [ ] **Step 5: Verify TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "configs/\(openai\|anthropic\|gemini\|googleworkspace\)" | head -20`
Expected: No errors from these 4 files. The legacy registry files may still show errors — Task 3 completes the migration.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/tools/configs/openai.ts frontend/lib/tools/configs/anthropic.ts frontend/lib/tools/configs/gemini.ts frontend/lib/tools/configs/googleworkspace.ts
git commit -m "refactor(tools): migrate AI + GoogleWorkspace configs to UnifiedToolConfig (HIGH-11)"
```

---

### Task 3: Migrate 5 OAuth configs to UnifiedToolConfig

**Files:**
- Modify: `frontend/lib/tools/configs/fortnox.ts`
- Modify: `frontend/lib/tools/configs/microsoft365.ts`
- Modify: `frontend/lib/tools/configs/hubspot.ts`
- Modify: `frontend/lib/tools/configs/quickbooks.ts`
- Modify: `frontend/lib/tools/configs/shopify.ts`

**Context:** These 5 tools currently have no `viewComponent` — their UIs live in `[id]/page.tsx`. Tasks 8-12 will create the view files. For now we reference placeholder components. Use a shared placeholder: `PendingToolView` defined inline via `const PendingToolView = () => null` at the top of each file, replaced in Tasks 8-12.

- [ ] **Step 1: Create the temporary placeholder**

Add a new file `frontend/components/tools/pending-tool-view.tsx`:

```typescript
/**
 * Temporary placeholder view used during the HIGH-11 migration.
 * Each legacy tool points at this until its dedicated view component lands
 * (Tasks 8-12). Deleted by Task 16.
 */
import type { ToolViewProps } from "@/lib/tools/types"

export function PendingToolView(_: ToolViewProps) {
  return (
    <div className="p-8 text-center text-white/40 text-sm">
      Detail view migration pending.
    </div>
  )
}
```

- [ ] **Step 2: Update `configs/fortnox.ts`**

Replace with:

```typescript
import type { UnifiedToolConfig } from "../types"
import { PendingToolView } from "@/components/tools/pending-tool-view"

export const fortnoxConfig: UnifiedToolConfig = {
  provider: "Fortnox",
  id: "fortnox",
  label: "Fortnox",
  category: "Finance",
  description: "Invoices, suppliers & accounting data",
  brandColor: "#2DB250",
  authType: "oauth",
  authFields: [
    { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Enter your Fortnox Client ID" },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Enter your Fortnox Client Secret" },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/fortnox/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "Fortnox",
        connection_type: "oauth",
        status: "pending",
        client_id: values.clientId,
        client_secret: values.clientSecret,
      },
    ],
  }),
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "Log into developer.fortnox.se and create an app",
      "Set the redirect URI provided during onboarding",
      "Copy the Client ID and Client Secret here",
    ],
  },
  callouts: [
    {
      type: "success",
      title: "Read-Only Guarantee",
      body: "Effycion only reads data — we never write to Fortnox. For extra security, activate this integration with a user that has the Fortnox Läs (Read) license. Fortnox will then enforce read-only at the API level.",
      link: "/dashboard/tools/guide#fortnox",
    },
  ],
  endpoints: [
    { key: "company", path: "/api/integrations/fortnox/company", pick: ["CompanyInformation", "company"] },
    { key: "settings", path: "/api/integrations/fortnox/settings", pick: ["CompanySettings", "settings"] },
    { key: "invoices", path: "/api/integrations/fortnox/invoices", pick: ["Invoices", "invoices"], fallback: [] },
    { key: "supplierInvoices", path: "/api/integrations/fortnox/supplier-invoices", pick: ["SupplierInvoices", "supplier_invoices"], fallback: [] },
    { key: "expenses", path: "/api/integrations/fortnox/expenses", pick: ["Expenses", "expenses"], fallback: [] },
    { key: "vouchers", path: "/api/integrations/fortnox/vouchers", pick: ["Vouchers", "vouchers"], fallback: [] },
    { key: "accounts", path: "/api/integrations/fortnox/accounts", pick: ["Accounts", "accounts"], fallback: [] },
    { key: "articles", path: "/api/integrations/fortnox/articles", pick: ["Articles", "articles"], fallback: [] },
    { key: "customers", path: "/api/integrations/fortnox/customers", pick: ["Customers", "customers"], fallback: [] },
    { key: "suppliers", path: "/api/integrations/fortnox/suppliers", pick: ["Suppliers", "suppliers"], fallback: [] },
  ],
  defaultTab: "company",
  viewComponent: PendingToolView,
  connectingToast: "Redirecting to Fortnox to authorize…",
}
```

- [ ] **Step 3: Update `configs/microsoft365.ts`**

Replace with:

```typescript
import type { UnifiedToolConfig } from "../types"
import { PendingToolView } from "@/components/tools/pending-tool-view"

export const microsoft365Config: UnifiedToolConfig = {
  provider: "Microsoft365",
  id: "microsoft365",
  label: "Microsoft 365",
  category: "Productivity",
  description: "Users, licenses & productivity tools",
  brandColor: "#0078D4",
  authType: "oauth",
  authFields: [
    { name: "tenantId", label: "Tenant ID", type: "text", required: true, placeholder: "Your Azure AD Tenant ID or domain" },
    { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Azure AD Application (client) ID" },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Azure AD Client Secret" },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/microsoft365/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "Microsoft365",
        connection_type: "oauth",
        status: "pending",
        tenant_id: values.tenantId,
        client_id: values.clientId,
        client_secret: values.clientSecret,
      },
    ],
  }),
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "Go to Azure Portal > App registrations, create a new app",
      "Add API permissions: User.Read.All, Directory.Read.All, AuditLog.Read.All",
      "Grant admin consent, then create a Client Secret",
    ],
    note: "Requires admin consent",
  },
  endpoints: [
    { key: "licenses", path: "/api/integrations/microsoft365/licenses", pick: ["licenses"], fallback: [] },
    { key: "users", path: "/api/integrations/microsoft365/users", pick: ["users"], fallback: [] },
    { key: "usageReports", path: "/api/integrations/microsoft365/usage", pick: ["usageReports", "usage"], fallback: null },
  ],
  defaultTab: "licenses",
  viewComponent: PendingToolView,
  connectingToast: "Redirecting to Microsoft to authorize…",
}
```

- [ ] **Step 4: Update `configs/hubspot.ts`**

Replace with:

```typescript
import type { UnifiedToolConfig } from "../types"
import { PendingToolView } from "@/components/tools/pending-tool-view"

export const hubspotConfig: UnifiedToolConfig = {
  provider: "HubSpot",
  id: "hubspot",
  label: "HubSpot",
  category: "CRM/Marketing",
  description: "Contacts, deals & marketing data",
  brandColor: "#FF7A59",
  authType: "oauth",
  authFields: [
    { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Your HubSpot App Client ID" },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Your HubSpot App Client Secret" },
    {
      name: "hubType",
      label: "Primary Hub",
      type: "select",
      required: false,
      options: [
        { value: "starter_platform", label: "Starter Customer Platform (All Hubs)" },
        { value: "marketing", label: "Marketing Hub" },
        { value: "sales", label: "Sales Hub" },
        { value: "service", label: "Service Hub" },
        { value: "content", label: "Content Hub" },
        { value: "operations", label: "Operations Hub" },
      ],
    },
    {
      name: "tier",
      label: "Plan Tier",
      type: "select",
      required: false,
      options: [
        { value: "starter", label: "Starter ($15-20/seat)" },
        { value: "professional", label: "Professional ($50-100/seat)" },
        { value: "enterprise", label: "Enterprise ($75-150/seat)" },
      ],
    },
    {
      name: "paidSeats",
      label: "Paid Seats",
      type: "text",
      required: false,
      placeholder: "Auto-detected after connection",
      validate: (v) => {
        if (!v) return null
        const n = parseInt(v, 10)
        if (isNaN(n) || n < 1) return "Must be a positive integer"
        return null
      },
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/hubspot/oauth/start",
  buildConnectRequest: (values) => {
    const paidSeats = values.paidSeats ? parseInt(values.paidSeats, 10) : null
    return {
      integrations: [
        {
          tool_name: "HubSpot",
          connection_type: "oauth",
          status: "pending",
          client_id: values.clientId,
          client_secret: values.clientSecret,
          pricing: {
            hub_type: values.hubType || "sales",
            tier: values.tier || "professional",
            ...(paidSeats ? { paid_seats: paidSeats } : {}),
          },
        },
      ],
    }
  },
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "Go to HubSpot > Settings > Integrations > Private Apps",
      "Create app with required scopes",
      "Copy the Client ID and Client Secret here",
    ],
    note: "settings.users.read, account-info.security.read…",
  },
  endpoints: [
    { key: "users", path: "/api/integrations/hubspot/users", pick: ["users", "results"], fallback: [] },
    { key: "accountInfo", path: "/api/integrations/hubspot/account", pick: ["accountInfo", "account"] },
  ],
  defaultTab: "users",
  viewComponent: PendingToolView,
  connectingToast: "Redirecting to HubSpot to authorize…",
}
```

- [ ] **Step 5: Update `configs/quickbooks.ts`**

Replace with:

```typescript
import type { UnifiedToolConfig } from "../types"
import { PendingToolView } from "@/components/tools/pending-tool-view"

export const quickbooksConfig: UnifiedToolConfig = {
  provider: "QuickBooks",
  id: "quickbooks",
  label: "QuickBooks",
  category: "Finance",
  description: "Bills, expenses & financial reports",
  brandColor: "#2CA01C",
  authType: "oauth",
  authFields: [
    { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Your QuickBooks App Client ID" },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Your QuickBooks App Client Secret" },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/quickbooks/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "QuickBooks",
        connection_type: "oauth",
        status: "pending",
        client_id: values.clientId,
        client_secret: values.clientSecret,
      },
    ],
  }),
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "Go to developer.intuit.com and create an app",
      'Select "Accounting" scope',
      "Add redirect URI: your backend callback URL",
      "Copy Client ID and Client Secret here",
    ],
  },
  endpoints: [
    { key: "company", path: "/api/integrations/quickbooks/company", pick: ["company"] },
    { key: "invoices", path: "/api/integrations/quickbooks/invoices", pick: ["invoices"], fallback: [] },
    { key: "bills", path: "/api/integrations/quickbooks/bills", pick: ["bills"], fallback: [] },
    { key: "vendors", path: "/api/integrations/quickbooks/vendors", pick: ["vendors"], fallback: [] },
    { key: "accounts", path: "/api/integrations/quickbooks/accounts", pick: ["accounts"], fallback: [] },
  ],
  defaultTab: "company",
  viewComponent: PendingToolView,
  connectingToast: "Redirecting to QuickBooks to authorize…",
}
```

- [ ] **Step 6: Update `configs/shopify.ts`**

Replace with:

```typescript
import type { UnifiedToolConfig } from "../types"
import { PendingToolView } from "@/components/tools/pending-tool-view"

export const shopifyConfig: UnifiedToolConfig = {
  provider: "Shopify",
  id: "shopify",
  label: "Shopify",
  category: "E-Commerce",
  description: "Products, orders & customer data",
  brandColor: "#95BF47",
  authType: "oauth",
  authFields: [
    {
      name: "shopDomain",
      label: "Shop Domain",
      type: "text",
      required: true,
      placeholder: "your-store.myshopify.com",
      hint: "e.g., my-store or my-store.myshopify.com",
    },
    { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Your Shopify App API Key" },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Your Shopify App API Secret Key" },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/shopify/oauth/start",
  buildConnectRequest: (values) => {
    let shopDomain = values.shopDomain.trim()
    if (!shopDomain.includes(".myshopify.com")) {
      shopDomain = `${shopDomain}.myshopify.com`
    }
    return {
      integrations: [
        {
          tool_name: "Shopify",
          connection_type: "oauth",
          status: "pending",
          client_id: values.clientId,
          client_secret: values.clientSecret,
          shop_domain: shopDomain,
        },
      ],
    }
  },
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "Go to partners.shopify.com and create an app",
      "Set redirect URL to your backend callback URL",
      "Copy the API Key and API Secret Key",
    ],
  },
  endpoints: [
    { key: "shop", path: "/api/integrations/shopify/shop", pick: ["shop"] },
    { key: "orders", path: "/api/integrations/shopify/orders", pick: ["orders"], fallback: [] },
    { key: "products", path: "/api/integrations/shopify/products", pick: ["products"], fallback: [] },
    { key: "appCharges", path: "/api/integrations/shopify/app-charges", pick: ["appCharges", "app_charges"], fallback: [] },
  ],
  defaultTab: "shop",
  viewComponent: PendingToolView,
  connectingToast: "Redirecting to Shopify to authorize…",
}
```

- [ ] **Step 7: Verify TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "configs/(fortnox|microsoft365|hubspot|quickbooks|shopify)" | head -20`
Expected: No errors from these 5 files.

- [ ] **Step 8: Commit**

```bash
git add frontend/lib/tools/configs/fortnox.ts frontend/lib/tools/configs/microsoft365.ts frontend/lib/tools/configs/hubspot.ts frontend/lib/tools/configs/quickbooks.ts frontend/lib/tools/configs/shopify.ts frontend/components/tools/pending-tool-view.tsx
git commit -m "refactor(tools): migrate OAuth configs to UnifiedToolConfig with placeholder views (HIGH-11)"
```

---

## Phase 2 — Generic Plumbing (Tasks 4-7)

### Task 4: Create `useToolConnect` hook

**Files:**
- Create: `frontend/lib/tools/use-tool-connect.ts`

- [ ] **Step 1: Create the hook**

Write the file:

```typescript
"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getBackendToken } from "@/lib/auth-hooks"
import type { UnifiedToolConfig } from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export interface UseToolConnectResult {
  values: Record<string, any>
  setValues: (v: Record<string, any>) => void
  isConnecting: boolean
  connect: () => Promise<void>
  reconnect: (integrationId: string) => Promise<void>
  reset: () => void
}

export function useToolConnect(
  config: UnifiedToolConfig,
  onSuccess?: () => void,
): UseToolConnectResult {
  const router = useRouter()
  const initialValues = Object.fromEntries(config.authFields.map((f) => [f.name, ""]))
  const [values, setValues] = useState<Record<string, any>>(initialValues)
  const [isConnecting, setIsConnecting] = useState(false)

  const reset = useCallback(() => setValues(initialValues), [config.provider])

  const validate = (): string | null => {
    for (const field of config.authFields) {
      const v = (values[field.name] ?? "").toString().trim()
      if (field.required && !v) return `${field.label} is required`
      if (field.validate) {
        const err = field.validate(v)
        if (err) return err
      }
    }
    if (config.validate) {
      const err = config.validate(values)
      if (err) return err
    }
    return null
  }

  const connect = useCallback(async () => {
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }

    setIsConnecting(true)
    try {
      const accessToken = await getBackendToken()
      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const body = config.buildConnectRequest(values)

      const res = await fetch(`${API_BASE}${config.connectEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 403 && data?.error === "Integration limit reached") {
          toast.error("Integration limit reached", {
            description: data.message || `Your plan allows up to ${data.maxIntegrations} integrations.`,
          })
          return
        }
        throw new Error(data?.error || `Failed to connect ${config.label}`)
      }

      if (config.authType === "oauth" && config.oauthStartEndpoint) {
        const oauthRes = await fetch(`${API_BASE}${config.oauthStartEndpoint}`, {
          method: "GET",
          headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
        })
        if (!oauthRes.ok) {
          const errData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
          throw new Error(errData.error || "Failed to start OAuth")
        }
        const oauthData = await oauthRes.json()
        if (!oauthData.url) throw new Error("No OAuth URL returned from backend")

        toast.success(config.connectingToast || `Redirecting to ${config.label} to authorize…`)
        setTimeout(() => {
          window.location.href = oauthData.url
        }, 500)
        return
      }

      // API-key / service-account flow — connection is instant
      toast.success(config.connectedToast || `${config.label} connected`)
      reset()
      onSuccess?.()
    } catch (error: any) {
      toast.error(`Failed to connect ${config.label}`, {
        description: error.message || "An error occurred.",
      })
    } finally {
      setIsConnecting(false)
    }
  }, [config, values, router, onSuccess, reset])

  const reconnect = useCallback(
    async (_integrationId: string) => {
      if (config.authType !== "oauth" || !config.oauthStartEndpoint) {
        toast.error(`Reconnect not supported for ${config.label}`)
        return
      }
      try {
        const accessToken = await getBackendToken()
        if (!accessToken) {
          toast.error("Session expired", { description: "Please log in again" })
          router.push("/login")
          return
        }
        const oauthRes = await fetch(`${API_BASE}${config.oauthStartEndpoint}`, {
          method: "GET",
          headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
        })
        if (!oauthRes.ok) {
          const errData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
          throw new Error(errData.error || "Failed to start OAuth")
        }
        const oauthData = await oauthRes.json()
        if (!oauthData.url) throw new Error("No OAuth URL returned from backend")

        toast.success(config.connectingToast || `Redirecting to ${config.label}…`)
        setTimeout(() => {
          window.location.href = oauthData.url
        }, 500)
      } catch (error: any) {
        toast.error(`Failed to start ${config.label} OAuth`, {
          description: error.message || "An error occurred.",
        })
      }
    },
    [config, router],
  )

  return { values, setValues, isConnecting, connect, reconnect, reset }
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "use-tool-connect" | head -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/tools/use-tool-connect.ts
git commit -m "refactor(tools): add generic useToolConnect hook (HIGH-11)"
```

---

### Task 5: Create `<ToolConnectForm>` component

**Files:**
- Create: `frontend/components/tools/tool-connect-form.tsx`

- [ ] **Step 1: Create the component**

Write the file:

```typescript
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Zap, ShieldCheck, AlertTriangle, Loader2, Plug, BookOpen } from "lucide-react"
import Link from "next/link"
import { useToolConnect } from "@/lib/tools/use-tool-connect"
import type { UnifiedToolConfig } from "@/lib/tools/types"

interface ToolConnectFormProps {
  config: UnifiedToolConfig
  onCancel: () => void
  onSuccess: () => void
}

export function ToolConnectForm({ config, onCancel, onSuccess }: ToolConnectFormProps) {
  const { values, setValues, isConnecting, connect } = useToolConnect(config, onSuccess)

  const setField = (name: string, value: string) => setValues({ ...values, [name]: value })

  const canSubmit =
    !isConnecting &&
    config.authFields.every((f) => !f.required || (values[f.name] ?? "").toString().trim())

  return (
    <div className="space-y-4">
      {config.authFields.map((field) => (
        <div key={field.name} className="space-y-1.5">
          <Label htmlFor={`${config.id}-${field.name}`} className="text-white/50 text-[12px] font-medium">
            {field.label} {field.required && <span className="text-red-400/70">*</span>}
            {!field.required && <span className="text-white/25 font-normal"> (optional)</span>}
          </Label>

          {field.type === "textarea" && (
            <textarea
              id={`${config.id}-${field.name}`}
              placeholder={field.placeholder}
              value={values[field.name] || ""}
              onChange={(e) => setField(field.name, e.target.value)}
              autoComplete="off"
              spellCheck={false}
              rows={6}
              className="w-full bg-white/[0.03] border border-white/[0.06] text-white/80 text-[11px] font-mono rounded-lg p-3 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all resize-y"
            />
          )}

          {field.type === "select" && (
            <select
              id={`${config.id}-${field.name}`}
              value={values[field.name] || field.options?.[0]?.value || ""}
              onChange={(e) => setField(field.name, e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] text-white/80 rounded-lg px-3 py-2.5 text-[13px] focus:border-emerald-500/30 outline-none transition-all"
            >
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {(field.type === "text" || field.type === "password") && (
            <Input
              id={`${config.id}-${field.name}`}
              type={field.type}
              placeholder={field.placeholder}
              value={values[field.name] || ""}
              onChange={(e) => setField(field.name, e.target.value)}
              autoComplete={field.type === "password" ? "new-password" : "off"}
              data-1p-ignore
              data-lpignore="true"
              className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg h-10 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/10 placeholder:text-white/15 transition-all"
            />
          )}

          {field.hint && <p className="text-[10.5px] text-white/15">{field.hint}</p>}
        </div>
      ))}

      {config.quickSetup && (
        <div className="relative p-3.5 rounded-xl bg-gradient-to-b from-white/[0.025] to-white/[0.01] border border-white/[0.05] mt-5">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-4 h-4 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-emerald-400/70" />
            </div>
            <p className="text-[11.5px] font-medium text-white/50">{config.quickSetup.title}</p>
          </div>
          <ol className="text-[11.5px] text-white/30 space-y-2 ml-0.5">
            {config.quickSetup.steps.map((step, idx) => (
              <li key={idx} className="flex gap-2.5">
                <span className="text-emerald-400/40 font-mono text-[10px] mt-px shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                {step}
              </li>
            ))}
          </ol>
          {config.quickSetup.note && (
            <p className="text-[10px] text-white/15 mt-2.5 pt-2.5 border-t border-white/[0.04] font-mono">
              {config.quickSetup.note}
            </p>
          )}
          <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-end">
            <Link
              href={`/dashboard/tools/guide#${config.id}`}
              onClick={onCancel}
              className="inline-flex items-center gap-1 text-[11px] text-emerald-400/50 hover:text-emerald-400/80 transition-colors shrink-0"
            >
              <BookOpen className="w-3 h-3" />
              Guide
            </Link>
          </div>
        </div>
      )}

      {config.callouts?.map((callout, idx) => {
        const Icon = callout.type === "warning" ? AlertTriangle : ShieldCheck
        const colorClass =
          callout.type === "success"
            ? "from-emerald-500/[0.02] to-emerald-500/[0.005] border-emerald-500/[0.08] text-emerald-400/50"
            : "from-white/[0.025] to-white/[0.01] border-white/[0.05] text-white/50"
        return (
          <div
            key={idx}
            className={`relative p-3.5 rounded-xl bg-gradient-to-b ${colorClass} mt-3`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-md bg-emerald-500/[0.08] flex items-center justify-center">
                <Icon className="w-2.5 h-2.5" />
              </div>
              <p className="text-[11.5px] font-medium">{callout.title}</p>
            </div>
            <p className="text-[11px] text-white/25 leading-relaxed pl-6">
              {callout.body}{" "}
              {callout.link && (
                <Link
                  href={callout.link}
                  onClick={onCancel}
                  className="text-emerald-400/50 hover:text-emerald-400/80 transition-colors"
                >
                  Learn more
                </Link>
              )}
            </p>
          </div>
        )
      })}

      <div className="flex justify-end gap-2.5 pt-2">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/70 hover:bg-white/[0.05] rounded-lg h-9 text-[12.5px] px-4 transition-all"
        >
          Cancel
        </Button>
        <Button
          onClick={() => void connect()}
          disabled={!canSubmit}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold disabled:opacity-30 disabled:hover:bg-emerald-500 rounded-lg h-9 text-[12.5px] px-5 transition-all shadow-[0_0_20px_-4px_rgba(52,211,153,0.3)] hover:shadow-[0_0_24px_-2px_rgba(52,211,153,0.4)] disabled:shadow-none"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Connecting…
            </>
          ) : (
            <>
              <Plug className="w-3 h-3 mr-1.5" />
              Connect
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "tool-connect-form" | head -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/tools/tool-connect-form.tsx
git commit -m "refactor(tools): add generic ToolConnectForm renderer (HIGH-11)"
```

---

### Task 6: Create `useOAuthCallback` hook

**Files:**
- Create: `frontend/lib/tools/oauth-callback-handler.ts`

- [ ] **Step 1: Create the hook**

Write the file:

```typescript
"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { TOOL_REGISTRY } from "./registry"

export interface UseOAuthCallbackOptions {
  /** Called after a successful OAuth callback so caller can reload integrations. */
  onSuccess?: () => void
  /** Called after any OAuth callback (success or error) so caller can clear in-flight UI. */
  onDone?: () => void
}

/**
 * Reads the URL for ?<tool-id>=connected|error|error_*, surfaces a toast, and
 * strips the query param from the URL.
 */
export function useOAuthCallback(opts: UseOAuthCallbackOptions = {}) {
  const didRunRef = useRef(false)

  useEffect(() => {
    if (didRunRef.current) return
    didRunRef.current = true

    const params = new URLSearchParams(window.location.search)
    const toolId = Object.values(TOOL_REGISTRY).find((cfg) => params.get(cfg.id) !== null)?.id
    if (!toolId) return

    const config = Object.values(TOOL_REGISTRY).find((cfg) => cfg.id === toolId)
    if (!config) return

    const status = params.get(toolId)
    const errorDetails = params.get("details")
    const errorParam = params.get("error")

    // Strip query string
    window.history.replaceState({}, "", window.location.pathname)

    if (status === "connected") {
      toast.success(`${config.label} connected successfully!`, {
        description: `Your ${config.label} integration is now active.`,
        duration: 5000,
      })
      opts.onSuccess?.()
    } else if (status) {
      let description =
        status === "error" ? "Connection failed" : status.replace("error_", "").replace(/_/g, " ")
      if (errorDetails) description += `: ${decodeURIComponent(errorDetails)}`
      else if (errorParam) description += `: ${decodeURIComponent(errorParam)}`

      toast.error(`Failed to connect ${config.label}`, {
        description,
        duration: 10000,
      })
    }

    opts.onDone?.()
  }, [opts])
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "oauth-callback-handler" | head -10`
Expected: No errors (the `TOOL_REGISTRY` import resolves to the legacy file still; that's fine for now).

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/tools/oauth-callback-handler.ts
git commit -m "refactor(tools): add generic OAuth callback handler hook (HIGH-11)"
```

---

### Task 7: Create `<ToolDetailShell>` component

**Files:**
- Create: `frontend/components/tools/tool-detail-shell.tsx`

This is the header/chrome around each tool's detail view — logo, status badge, reconnect button, delete button.

- [ ] **Step 1: Create the component**

Write the file:

```typescript
"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Trash2, Loader2 } from "lucide-react"
import { ToolLogo } from "@/components/tools/tool-logos"
import type { Integration, UnifiedToolConfig } from "@/lib/tools/types"
import type { ReactNode } from "react"

interface ToolDetailShellProps {
  integration: Integration
  config: UnifiedToolConfig
  canWrite: boolean
  onReconnect?: () => void
  onDelete: () => void
  isReconnecting: boolean
  isDeleting: boolean
  children: ReactNode
}

export function ToolDetailShell({
  integration,
  config,
  canWrite,
  onReconnect,
  onDelete,
  isReconnecting,
  isDeleting,
  children,
}: ToolDetailShellProps) {
  const status = integration.status

  const badge =
    status === "connected" ? (
      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/15">Connected</Badge>
    ) : status === "error" || status === "expired" ? (
      <Badge className="bg-red-500/10 text-red-400 border-red-500/15">
        {status === "expired" ? "Expired" : "Error"}
      </Badge>
    ) : status === "pending" ? (
      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/15">Pending</Badge>
    ) : status === "disconnected" ? (
      <Badge className="bg-white/[0.06] text-white/40 border-white/[0.08]">Disconnected</Badge>
    ) : (
      <Badge className="bg-white/[0.04] text-white/30 border-white/[0.06]">Unknown</Badge>
    )

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <ToolLogo name={config.id} size={44} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display text-white truncate">{config.label}</h2>
              {badge}
            </div>
            <p className="text-[12px] text-white/30">{config.description}</p>
          </div>
        </div>

        {canWrite && (
          <div className="flex items-center gap-2">
            {onReconnect && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReconnect}
                disabled={isReconnecting}
                className="h-8 px-3 text-[12px] text-white/60 hover:text-white hover:bg-white/[0.06] rounded-md"
              >
                {isReconnecting ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                )}
                Reconnect
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="h-8 px-3 text-[12px] text-white/40 hover:text-red-400 hover:bg-red-500/[0.08] rounded-md"
            >
              <Trash2 className="w-3 h-3 mr-1.5" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <div>{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "tool-detail-shell" | head -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/tools/tool-detail-shell.tsx
git commit -m "refactor(tools): add generic ToolDetailShell chrome (HIGH-11)"
```

---

## Phase 3 — Legacy Detail Page Migration (Tasks 8-12)

All 5 migration tasks follow the same pattern. Each creates a new `<tool>-view.tsx` file holding JSX extracted verbatim from `frontend/app/dashboard/tools/[id]/page.tsx`, with three changes:
1. Reference `info` prop instead of `toolInfo` local state
2. Copy the relevant type destructuring from `[id]/page.tsx:112-127` into the new component
3. Light cleanup: remove `console.log`, dead code, `false && ...` guards

**Do not rewrite types or redesign layout — preserve existing UI exactly.**

### Task 8: Migrate Fortnox view

**Files:**
- Create: `frontend/components/tools/fortnox-view.tsx`
- Modify: `frontend/lib/tools/configs/fortnox.ts` (wire viewComponent)

- [ ] **Step 1: Identify the source JSX**

In `frontend/app/dashboard/tools/[id]/page.tsx`:
- **Tab nav block:** lines 2974-3084 (`{isFortnox && (...)}`)
- **Content blocks:** lines 3824-4388
  - 3824-3928: Company
  - 3930-4001: Customers
  - 4003-4086: Invoices
  - 4088-4163: Supplier Invoices
  - 4165-4237: Accounts
  - 4239-4309: Articles
  - 4311-4382: Suppliers
  - 4384-4388: Empty state
- **Type destructuring:** lines 112-116

The top-level structure in the page is a `<Tabs>` with a tab for each data kind. In the view component, recreate that `<Tabs>` structure.

- [ ] **Step 2: Create `fortnox-view.tsx`**

Create `frontend/components/tools/fortnox-view.tsx`:

```typescript
"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { ToolViewProps } from "@/lib/tools/types"

// ⬇⬇ COPY FROM [id]/page.tsx:112-116 (Fortnox type block):
interface FortnoxInfo {
  company?: any
  settings?: any
  invoices?: any[]
  supplierInvoices?: any[]
  expenses?: any[]
  vouchers?: any[]
  accounts?: any[]
  articles?: any[]
  customers?: any[]
  suppliers?: any[]
}

export function FortnoxView({ integration, info, isLoading, reload }: ToolViewProps) {
  const fortnoxInfo = (info || {}) as FortnoxInfo
  const [activeTab, setActiveTab] = useState("company")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-1 mb-6">
        <TabsTrigger value="company">Company</TabsTrigger>
        <TabsTrigger value="customers">Customers</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
        <TabsTrigger value="supplierInvoices">Supplier Invoices</TabsTrigger>
        <TabsTrigger value="accounts">Accounts</TabsTrigger>
        <TabsTrigger value="articles">Articles</TabsTrigger>
        <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
      </TabsList>

      {/* ⬇⬇ PASTE JSX from [id]/page.tsx:3824-4382 here, replacing each outer wrapper with <TabsContent value="..."> */}
      {/* Example for the Company block: */}
      <TabsContent value="company">
        {/* paste lines 3824-3928 inner JSX */}
      </TabsContent>

      <TabsContent value="customers">{/* paste lines 3930-4001 */}</TabsContent>
      <TabsContent value="invoices">{/* paste lines 4003-4086 */}</TabsContent>
      <TabsContent value="supplierInvoices">{/* paste lines 4088-4163 */}</TabsContent>
      <TabsContent value="accounts">{/* paste lines 4165-4237 */}</TabsContent>
      <TabsContent value="articles">{/* paste lines 4239-4309 */}</TabsContent>
      <TabsContent value="suppliers">{/* paste lines 4311-4382 */}</TabsContent>
    </Tabs>
  )
}
```

**Execution detail:** Open `[id]/page.tsx` at the specified line ranges. For each block:
1. Copy the inner JSX (the content inside the outer `{isFortnox && activeDataTab === "company" && (...)}` conditional, not the conditional itself)
2. Paste inside the matching `<TabsContent value="...">`
3. Replace any `fortnoxInfo.X` reference left as-is (the prefix name is preserved)
4. Replace any reference to other top-level variables (`toolInfo`, `isLoadingInfo`, `reloadToolInfo`) with the prop names: `info`, `isLoading`, `reload`
5. Copy all `lucide-react` icon imports, `@/components/ui/*` imports, and any chart library imports that the pasted JSX uses — put them at the top of `fortnox-view.tsx`
6. Delete any `console.log` statements
7. Delete any `false && ...` guards

Also copy any helper functions defined at the top of `[id]/page.tsx` that the pasted Fortnox JSX uses (currency formatters, date formatters, etc.) into the view file locally for now. Task 17 will deduplicate if multiple views need the same helpers.

- [ ] **Step 3: Update the config**

In `frontend/lib/tools/configs/fortnox.ts`, replace:

```typescript
import { PendingToolView } from "@/components/tools/pending-tool-view"
```

with:

```typescript
import { FortnoxView } from "@/components/tools/fortnox-view"
```

And change the `viewComponent` field from `PendingToolView` to `FortnoxView`.

- [ ] **Step 4: Verify compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "(fortnox-view|configs/fortnox)" | head -20`
Expected: No errors.

- [ ] **Step 5: Manual UI verification**

Start the dev server. Navigate to `/dashboard/tools` and open a Fortnox integration. For each tab (Company, Customers, Invoices, Supplier Invoices, Accounts, Articles, Suppliers):
- Tab renders without blank content or console errors
- Data loads and displays
- Empty states show when no data exists

Spot-check the UI against the pre-migration state (switch to `main` branch in another clone, compare side-by-side). Note any discrepancies in the commit message.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/tools/fortnox-view.tsx frontend/lib/tools/configs/fortnox.ts
git commit -m "refactor(tools): migrate Fortnox detail view to dedicated component (HIGH-11)"
```

---

### Task 9: Migrate Microsoft365 view

**Files:**
- Create: `frontend/components/tools/microsoft365-view.tsx`
- Modify: `frontend/lib/tools/configs/microsoft365.ts` (wire viewComponent)

- [ ] **Step 1: Identify the source JSX**

In `frontend/app/dashboard/tools/[id]/page.tsx`:
- **Tab nav block:** lines 2757-2792
- **Content blocks:**
  - 3088-3140: Licenses
  - 3143-3207: Users
  - 3210-3214: Empty state
- **Type destructuring:** lines 117-119

- [ ] **Step 2: Create `microsoft365-view.tsx`**

Create the file with this skeleton:

```typescript
"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { ToolViewProps } from "@/lib/tools/types"

// ⬇⬇ COPY FROM [id]/page.tsx:117-119:
interface Microsoft365Info {
  licenses?: any[]
  users?: any[]
  usageReports?: any
}

export function Microsoft365View({ integration, info, isLoading, reload }: ToolViewProps) {
  const m365Info = (info || {}) as Microsoft365Info
  const [activeTab, setActiveTab] = useState("licenses")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-1 mb-6">
        <TabsTrigger value="licenses">Licenses</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
      </TabsList>

      {/* ⬇⬇ PASTE JSX from [id]/page.tsx:3088-3140 here */}
      <TabsContent value="licenses">{/* paste lines 3088-3140 inner JSX */}</TabsContent>

      {/* ⬇⬇ PASTE JSX from [id]/page.tsx:3143-3207 here */}
      <TabsContent value="users">{/* paste lines 3143-3207 inner JSX */}</TabsContent>
    </Tabs>
  )
}
```

Follow the same execution steps as Task 8 (rewire prop names, copy imports, remove dead code).

- [ ] **Step 3: Update the config**

In `frontend/lib/tools/configs/microsoft365.ts`, replace `PendingToolView` import and reference with `Microsoft365View`.

- [ ] **Step 4: Verify compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "(microsoft365-view|configs/microsoft365)" | head -20`
Expected: No errors.

- [ ] **Step 5: Manual verification**

Connect / have a Microsoft 365 integration connected. Verify Licenses and Users tabs render correctly.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/tools/microsoft365-view.tsx frontend/lib/tools/configs/microsoft365.ts
git commit -m "refactor(tools): migrate Microsoft 365 detail view to dedicated component (HIGH-11)"
```

---

### Task 10: Migrate HubSpot view

**Files:**
- Create: `frontend/components/tools/hubspot-view.tsx`
- Modify: `frontend/lib/tools/configs/hubspot.ts`

- [ ] **Step 1: Identify the source JSX**

In `[id]/page.tsx`:
- **Tab nav block:** lines 2795-2825
- **Content blocks:**
  - 3217-3279: Users
  - 3280-3327: Account
  - 3328-3333: Empty state
- **Type destructuring:** line 120

- [ ] **Step 2: Create `hubspot-view.tsx`**

Skeleton:

```typescript
"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { ToolViewProps } from "@/lib/tools/types"

interface HubSpotInfo {
  users?: any[]
  accountInfo?: any
}

export function HubSpotView({ integration, info, isLoading, reload }: ToolViewProps) {
  const hubspotInfo = (info || {}) as HubSpotInfo
  const [activeTab, setActiveTab] = useState("users")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-1 mb-6">
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="account">Account</TabsTrigger>
      </TabsList>
      <TabsContent value="users">{/* paste lines 3217-3279 inner JSX */}</TabsContent>
      <TabsContent value="account">{/* paste lines 3280-3327 inner JSX */}</TabsContent>
    </Tabs>
  )
}
```

Follow Task 8 execution steps.

- [ ] **Step 3: Update the config**

In `frontend/lib/tools/configs/hubspot.ts`, swap `PendingToolView` → `HubSpotView`.

- [ ] **Step 4: Verify compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "(hubspot-view|configs/hubspot)" | head -20`
Expected: No errors.

- [ ] **Step 5: Manual verification**

Verify HubSpot Users and Account tabs render correctly.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/tools/hubspot-view.tsx frontend/lib/tools/configs/hubspot.ts
git commit -m "refactor(tools): migrate HubSpot detail view to dedicated component (HIGH-11)"
```

---

### Task 11: Migrate QuickBooks view

**Files:**
- Create: `frontend/components/tools/quickbooks-view.tsx`
- Modify: `frontend/lib/tools/configs/quickbooks.ts`

- [ ] **Step 1: Identify the source JSX**

In `[id]/page.tsx`:
- **Tab nav block:** lines 2828-2906
- **Content blocks:**
  - 3335-3383: Company
  - 3385-3433: Invoices
  - 3435-3483: Bills
  - 3485-3529: Vendors
  - 3531-3573: Accounts
  - 3575-3580: Empty state
- **Type destructuring:** lines 121-124

- [ ] **Step 2: Create `quickbooks-view.tsx`**

Skeleton:

```typescript
"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { ToolViewProps } from "@/lib/tools/types"

interface QuickBooksInfo {
  company?: any
  invoices?: any[]
  bills?: any[]
  vendors?: any[]
  accounts?: any[]
}

export function QuickBooksView({ integration, info, isLoading, reload }: ToolViewProps) {
  const qbInfo = (info || {}) as QuickBooksInfo
  const [activeTab, setActiveTab] = useState("company")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-1 mb-6">
        <TabsTrigger value="company">Company</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
        <TabsTrigger value="bills">Bills</TabsTrigger>
        <TabsTrigger value="vendors">Vendors</TabsTrigger>
        <TabsTrigger value="accounts">Accounts</TabsTrigger>
      </TabsList>
      <TabsContent value="company">{/* paste 3335-3383 */}</TabsContent>
      <TabsContent value="invoices">{/* paste 3385-3433 */}</TabsContent>
      <TabsContent value="bills">{/* paste 3435-3483 */}</TabsContent>
      <TabsContent value="vendors">{/* paste 3485-3529 */}</TabsContent>
      <TabsContent value="accounts">{/* paste 3531-3573 */}</TabsContent>
    </Tabs>
  )
}
```

Follow Task 8 execution steps.

- [ ] **Step 3: Update the config**

In `frontend/lib/tools/configs/quickbooks.ts`, swap `PendingToolView` → `QuickBooksView`.

- [ ] **Step 4: Verify compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "(quickbooks-view|configs/quickbooks)" | head -20`
Expected: No errors.

- [ ] **Step 5: Manual verification**

Verify QuickBooks all 5 tabs render correctly.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/tools/quickbooks-view.tsx frontend/lib/tools/configs/quickbooks.ts
git commit -m "refactor(tools): migrate QuickBooks detail view to dedicated component (HIGH-11)"
```

---

### Task 12: Migrate Shopify view

**Files:**
- Create: `frontend/components/tools/shopify-view.tsx`
- Modify: `frontend/lib/tools/configs/shopify.ts`

- [ ] **Step 1: Identify the source JSX**

In `[id]/page.tsx`:
- **Tab nav block:** lines 2909-2971
- **Content blocks:**
  - 3582-3628: Shop Info
  - 3630-3694: Orders
  - 3696-3759: Products
  - 3761-3815: App Charges
  - 3817-3822: Empty state
- **Type destructuring:** lines 125-127

- [ ] **Step 2: Create `shopify-view.tsx`**

Skeleton:

```typescript
"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { ToolViewProps } from "@/lib/tools/types"

interface ShopifyInfo {
  shop?: any
  orders?: any[]
  products?: any[]
  appCharges?: any[]
}

export function ShopifyView({ integration, info, isLoading, reload }: ToolViewProps) {
  const shopifyInfo = (info || {}) as ShopifyInfo
  const [activeTab, setActiveTab] = useState("shop")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-1 mb-6">
        <TabsTrigger value="shop">Shop</TabsTrigger>
        <TabsTrigger value="orders">Orders</TabsTrigger>
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="appCharges">App Charges</TabsTrigger>
      </TabsList>
      <TabsContent value="shop">{/* paste 3582-3628 */}</TabsContent>
      <TabsContent value="orders">{/* paste 3630-3694 */}</TabsContent>
      <TabsContent value="products">{/* paste 3696-3759 */}</TabsContent>
      <TabsContent value="appCharges">{/* paste 3761-3815 */}</TabsContent>
    </Tabs>
  )
}
```

Follow Task 8 execution steps.

- [ ] **Step 3: Update the config**

In `frontend/lib/tools/configs/shopify.ts`, swap `PendingToolView` → `ShopifyView`.

- [ ] **Step 4: Verify compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "(shopify-view|configs/shopify)" | head -20`
Expected: No errors.

- [ ] **Step 5: Manual verification**

Verify Shopify all 4 tabs render correctly.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/tools/shopify-view.tsx frontend/lib/tools/configs/shopify.ts
git commit -m "refactor(tools): migrate Shopify detail view to dedicated component (HIGH-11)"
```

---

## Phase 4 — Gut the Big Files (Tasks 13-15)

### Task 13: Gut `[id]/page.tsx` to the shell

**Files:**
- Modify: `frontend/app/dashboard/tools/[id]/page.tsx`

- [ ] **Step 1: Replace the entire file**

Delete the existing content and replace with the shell version:

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { useTeamRole } from "@/lib/team-role-context"
import { getToolConfig } from "@/lib/tools/registry"
import { useToolInfo } from "@/lib/tools/use-tool-info"
import { useToolConnect } from "@/lib/tools/use-tool-connect"
import { ToolDetailShell } from "@/components/tools/tool-detail-shell"
import type { Integration, UnifiedToolConfig } from "@/lib/tools/types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export default function ToolDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { canWrite } = useTeamRole()
  const [integration, setIntegration] = useState<Integration | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const integrationId = params?.id

  const loadIntegration = useCallback(async () => {
    if (!integrationId) return
    setIsLoading(true)
    try {
      const accessToken = await getBackendToken()
      if (!accessToken) {
        router.push("/login")
        return
      }
      const res = await fetch(`${API_BASE}/api/integrations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error(`Failed to load integration: ${res.status}`)
      const data = await res.json()
      const found = (data.integrations || []).find((i: Integration) => i.id === integrationId)
      if (!found) {
        toast.error("Integration not found")
        router.push("/dashboard/tools")
        return
      }
      setIntegration(found)
    } catch (err: any) {
      toast.error("Failed to load integration", { description: err.message })
    } finally {
      setIsLoading(false)
    }
  }, [integrationId, router])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    void loadIntegration()
  }, [authLoading, user, loadIntegration, router])

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    )
  }

  if (!integration) {
    return (
      <div className="p-8 text-center">
        <p className="text-white/40 text-sm">Integration not found.</p>
        <Link href="/dashboard/tools">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-3 h-3 mr-1.5" /> Back to Tools
          </Button>
        </Link>
      </div>
    )
  }

  const config = getToolConfig(integration.tool_name || integration.provider)

  if (!config) {
    return <UnknownToolFallback integration={integration} canWrite={canWrite} onReload={loadIntegration} />
  }

  return (
    <ConnectedToolDetail
      integration={integration}
      config={config}
      canWrite={canWrite}
      onReload={loadIntegration}
    />
  )
}

// Sub-component: renders a connected (or failed) integration whose config exists in the registry.
// Isolated so the useToolInfo / useToolConnect hooks only fire when config is guaranteed non-null.
function ConnectedToolDetail({
  integration,
  config,
  canWrite,
  onReload,
}: {
  integration: Integration
  config: UnifiedToolConfig
  canWrite: boolean
  onReload: () => Promise<void>
}) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const { info, isLoading: isLoadingInfo, reload } = useToolInfo(integration)
  const { reconnect, isConnecting: isReconnecting } = useToolConnect(config, onReload)

  const handleDelete = async () => {
    if (!confirm(`Delete ${integration.tool_name}? This cannot be undone.`)) return
    setIsDeleting(true)
    try {
      const accessToken = await getBackendToken()
      if (!accessToken) {
        router.push("/login")
        return
      }
      const res = await fetch(`${API_BASE}/api/integrations/${integration.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`)
      toast.success("Integration deleted")
      router.push("/dashboard/tools")
    } catch (err: any) {
      toast.error("Failed to delete integration", { description: err.message })
    } finally {
      setIsDeleting(false)
    }
  }

  const ViewComponent = config.viewComponent
  const canReconnect = config.authType === "oauth"

  return (
    <ToolDetailShell
      integration={integration}
      config={config}
      canWrite={canWrite}
      onReconnect={canReconnect ? () => reconnect(integration.id) : undefined}
      onDelete={handleDelete}
      isReconnecting={isReconnecting}
      isDeleting={isDeleting}
    >
      {integration.status === "connected" ? (
        <ViewComponent
          integration={integration}
          info={info}
          isLoading={isLoadingInfo}
          reload={reload}
        />
      ) : (
        <Card className="bg-white/[0.02] border-white/[0.06]">
          <CardContent className="p-8 text-center">
            <p className="text-white/40 text-sm">
              This integration is currently {integration.status}.
              {canReconnect && " Click Reconnect above to restore access."}
            </p>
          </CardContent>
        </Card>
      )}
    </ToolDetailShell>
  )
}

// Sub-component: unknown-tool fallback. Can't use ToolDetailShell (needs a config)
// so it has its own minimal chrome.
function UnknownToolFallback({
  integration,
  canWrite,
  onReload,
}: {
  integration: Integration
  canWrite: boolean
  onReload: () => Promise<void>
}) {
  return (
    <div className="p-8">
      <h2 className="text-xl font-display text-white mb-2">{integration.tool_name}</h2>
      <p className="text-white/40 text-sm mb-4">
        This tool is not registered. Please contact support or check that the tool name matches a registered provider.
      </p>
      <Link href="/dashboard/tools">
        <Button variant="outline">
          <ArrowLeft className="w-3 h-3 mr-1.5" /> Back to Tools
        </Button>
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "tools/\[id\]/page" | head -20`
Expected: No errors.

- [ ] **Step 3: Manual verification**

Start the dev server. For each of the 9 tools with a connected integration (use dev test accounts if available):
- Navigate to `/dashboard/tools/<integration-id>`
- Verify the header renders (logo, label, status badge)
- Verify the detail view renders the tool's tabs/content
- Verify Reconnect button appears only for OAuth tools
- Verify Delete button works (use a disposable test integration)

- [ ] **Step 4: Commit**

```bash
git add frontend/app/dashboard/tools/[id]/page.tsx
git commit -m "refactor(tools): gut [id]/page.tsx to 150-line shell delegating to viewComponent (HIGH-11)"
```

---

### Task 14: Gut `page.tsx` connect modal + form blocks

**Files:**
- Modify: `frontend/app/dashboard/tools/page.tsx`

This is the largest single-file change. Goal: replace 9 `useState` form declarations + 9 `handleConnect<Tool>` functions + 6 `start<Tool>OAuth` functions + 9 `{selectedTool === "X" && (...)}` JSX blocks + `getReconnectHandler` + hardcoded tools array with registry-driven code.

- [ ] **Step 1: Delete per-tool form state**

In `frontend/app/dashboard/tools/page.tsx`, delete all 9 `useState` form declarations (currently lines 111-139). The entire block:

```typescript
const [fortnoxForm, setFortnoxForm] = useState({ ... })
// ... all 8 others
const [googleWorkspaceForm, setGoogleWorkspaceForm] = useState({ ... })
```

Replace with no state at all — `useToolConnect` owns form state.

- [ ] **Step 2: Delete per-tool handlers and OAuth functions**

Delete entirely (approximate line ranges — use Grep to find exact boundaries):
- `startFortnoxOAuth` (lines 501-548)
- `startMicrosoft365OAuth` (lines 549-596)
- `handleConnectFortnox` (lines 597-694)
- `handleConnectMicrosoft365` (lines 696-797)
- `startHubSpotOAuth` (lines 798-845)
- `startQuickBooksOAuth` (lines 846-893)
- `startShopifyOAuth` (lines 894-941)
- `startGoogleWorkspaceOAuth` (lines 942-989)
- `handleConnectHubSpot` (lines 990-1104)
- `handleConnectQuickBooks` (lines 1105-1199)
- `handleConnectShopify` (lines 1200-1301)
- `handleConnectOpenAI` (lines 1302-1360)
- `handleConnectAnthropic` (lines 1361-1419)
- `handleConnectGoogleWorkspace` (lines 1420-1502)
- `handleConnectGemini` (lines 1503-~1560)

All these become `useToolConnect` instances inside `<ToolConnectForm>`.

- [ ] **Step 3: Delete hardcoded tools metadata array**

Around line 2282-2291 there's a hardcoded `[{ id: "fortnox", name: "Fortnox", desc: "...", category: "...", color: "..." }, ...]` array. Delete it. Replace the usage site with a call that reads from the registry.

Find the `.map((tool) => { ... })` call that uses this array and refactor the source:

Old:
```typescript
{[
  { id: "fortnox", name: "Fortnox", ... },
  // 8 more
].map((tool) => { ... })}
```

New:
```typescript
{Object.values(TOOL_REGISTRY).map((tool) => { ... })}
```

Where `TOOL_REGISTRY` is imported from `@/lib/tools/registry`. The per-tool fields used inside the `.map()` body — `tool.id`, `tool.name` (now `tool.label`), `tool.desc` (now `tool.description`), `tool.category`, `tool.color` (now `tool.brandColor`) — need to be renamed to match the unified config shape.

- [ ] **Step 4: Delete the 9 form JSX blocks**

Locate the 9 conditional form blocks in the Dialog. Each looks like `{selectedTool === "fortnox" && (<div className="space-y-4">...</div>)}`. Line ranges:
- Fortnox: 2346-2425
- Microsoft365: 2427-2503
- HubSpot: 2504-2629
- QuickBooks: 2630-2680
- Shopify: 2681-2749
- OpenAI: 2750-2788
- GoogleWorkspace: 2789-2844
- Gemini: 2845-2902
- Anthropic: there's another block similar in size

Delete all of them. Replace the location with one generic render:

```typescript
{selectedTool && (() => {
  const config = Object.values(TOOL_REGISTRY).find((c) => c.id === selectedTool)
  if (!config) return null
  return (
    <ToolConnectForm
      config={config}
      onCancel={() => {
        setIsConnectModalOpen(false)
        setSelectedTool("")
      }}
      onSuccess={() => {
        setIsConnectModalOpen(false)
        setSelectedTool("")
        void loadIntegrations(true)
      }}
    />
  )
})()}
```

Add the import at the top:
```typescript
import { ToolConnectForm } from "@/components/tools/tool-connect-form"
import { TOOL_REGISTRY } from "@/lib/tools/registry"
```

- [ ] **Step 5: Delete the footer button block (moved into ToolConnectForm)**

Find the modal footer with Cancel + Connect buttons (it uses the `!selectedTool || ...` disabled logic and the nested `if (selectedTool === "fortnox") handleConnectFortnox()` dispatch chain). Delete it entirely — `<ToolConnectForm>` renders its own buttons.

- [ ] **Step 6: Update `getReconnectHandler`**

Find `getReconnectHandler` (lines 2109-2119). Replace with a registry-driven version:

```typescript
const getReconnectHandler = (integration: Integration) => {
  const config = getToolConfig(integration.tool_name)
  if (!config || config.authType !== "oauth" || !config.oauthStartEndpoint) return null
  // We return a handler that uses useToolConnect's reconnect — but since this is
  // inside a render function we can't call hooks here. Instead, call fetch directly:
  return async () => {
    setReconnectingId(integration.id)
    try {
      const accessToken = await getBackendToken()
      if (!accessToken) {
        router.push("/login")
        return
      }
      const oauthRes = await fetch(`${apiBase}${config.oauthStartEndpoint}`, {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      })
      if (!oauthRes.ok) {
        const errData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errData.error || "Failed to start OAuth")
      }
      const oauthData = await oauthRes.json()
      if (!oauthData.url) throw new Error("No OAuth URL returned from backend")
      toast.success(config.connectingToast || `Redirecting to ${config.label}…`)
      setTimeout(() => {
        window.location.href = oauthData.url
      }, 500)
    } catch (err: any) {
      toast.error(`Failed to start ${config.label} OAuth`, {
        description: err.message || "An error occurred.",
      })
      setReconnectingId(null)
    }
  }
}
```

Where this function is called: the call site currently passes a tool name string. Update to pass the integration object, then inside use `integration.tool_name` to look up config. If needed, rename call sites accordingly.

Add imports: `import { getToolConfig } from "@/lib/tools/registry"`.

- [ ] **Step 7: Update `getCategory`/`getDescription` to read from registry**

Find the `getCategory` function and the `getDescription` function (both inside the `tools.map(...)` block around line 1635 onward after previous refactors). Replace their bodies:

```typescript
const getCategory = (toolName: string): string => {
  const config = getToolConfig(toolName)
  return config?.category || "Other"
}

const getDescription = (toolName: string): string => {
  const config = getToolConfig(toolName)
  return config?.description || "Connected integration"
}
```

- [ ] **Step 8: Delete onOpenChange form resets**

The Dialog's `onOpenChange` handler clears all 9 forms. Since forms are now internal to `<ToolConnectForm>` (which resets on mount), delete the per-form reset block:

Find:
```typescript
onOpenChange={(open) => {
  setIsConnectModalOpen(open)
  if (open) {
    void loadTools()
  } else {
    setIsConnecting(false)
    setSelectedTool("")
    setFortnoxForm({ clientId: "", clientSecret: "" })
    setMicrosoft365Form({ ... })
    // ... 7 more resets
  }
}}
```

Replace with:
```typescript
onOpenChange={(open) => {
  setIsConnectModalOpen(open)
  if (open) {
    void loadTools()
  } else {
    setSelectedTool("")
  }
}}
```

- [ ] **Step 9: Verify compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "tools/page" | head -30`
Expected: No errors.

- [ ] **Step 10: Manual verification**

Dev server. For each of the 9 tools:
1. Open connect modal
2. Click the tool's card — verify the form renders with the right fields
3. Verify Quick Setup + Callouts render if the config has them
4. Fill form with invalid input — verify validation toast appears
5. Fill form with valid input — verify the request fires (use Network tab) with the correct body shape
6. For OAuth tools: verify redirect to provider fires
7. For API-key tools: verify modal closes on success and `loadIntegrations` reload happens

- [ ] **Step 11: Commit**

```bash
git add frontend/app/dashboard/tools/page.tsx
git commit -m "refactor(tools): replace 9 connect forms with ToolConnectForm driven by registry (HIGH-11)"
```

---

### Task 15: Replace OAuth callback handling in `page.tsx`

**Files:**
- Modify: `frontend/app/dashboard/tools/page.tsx`

- [ ] **Step 1: Delete the 5 per-tool OAuth callback blocks**

Find and delete:
- `if (googleWorkspaceStatus) { ... }` (lines 263-278)
- `if (microsoft365Status) { ... }` (lines 257-297)
- `if (hubspotStatus) { ... }` (lines 300-328)
- `if (quickbooksStatus) { ... }` (lines 331-358)
- `if (shopifyStatus) { ... }` (lines 361-388)

These are inside the first `useEffect`. After deleting them, the first useEffect may be empty — if so, delete the entire useEffect.

Also delete the Fortnox callback block in the second useEffect (lines 417-481). After deletion, the second useEffect may also be empty.

- [ ] **Step 2: Add `useOAuthCallback` call**

At the top of the component body (right after state declarations), add:

```typescript
import { useOAuthCallback } from "@/lib/tools/oauth-callback-handler"

// ...inside ToolsPage component:
useOAuthCallback({
  onSuccess: () => loadIntegrations(true),
  onDone: () => setIsConnecting(false),
})
```

- [ ] **Step 3: Verify compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "tools/page" | head -20`
Expected: No errors.

- [ ] **Step 4: Manual verification**

Complete one OAuth flow end-to-end for a disposable test integration (e.g., Shopify with a dev store). Verify the success toast fires and `loadIntegrations` reloads the list.

Separately, trigger a failed OAuth (cancel on provider side) and verify the error toast fires with the right description.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/dashboard/tools/page.tsx
git commit -m "refactor(tools): replace 5 per-tool OAuth callback blocks with useOAuthCallback (HIGH-11)"
```

---

## Phase 5 — Cleanup (Tasks 16-17)

### Task 16: Delete old registry file and the placeholder

**Files:**
- Delete: `frontend/components/tools/registry.tsx`
- Delete: `frontend/components/tools/pending-tool-view.tsx`
- Modify: `frontend/lib/tools/registry.ts`

- [ ] **Step 1: Verify no imports of `@/components/tools/registry`**

Run: `cd frontend && grep -r "from \"@/components/tools/registry\"" --include="*.ts" --include="*.tsx"`
Expected: No results. If any remain, update them to import from `@/lib/tools/registry` (which already exports `getToolConfig`).

- [ ] **Step 2: Verify no imports of `pending-tool-view`**

Run: `cd frontend && grep -r "pending-tool-view" --include="*.ts" --include="*.tsx"`
Expected: No results (Tasks 8-12 should have replaced all `PendingToolView` imports with real view components).

- [ ] **Step 3: Delete the files**

```bash
git rm frontend/components/tools/registry.tsx
git rm frontend/components/tools/pending-tool-view.tsx
```

- [ ] **Step 4: Clean up `registry.ts`**

Confirm `frontend/lib/tools/registry.ts` exports a clean unified registry. It should look like:

```typescript
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
}

export function getToolConfig(providerOrToolName?: string): UnifiedToolConfig | undefined {
  if (!providerOrToolName) return undefined
  return TOOL_REGISTRY[providerOrToolName]
}
```

If the existing file is already this shape, leave it. If not, replace with the above.

- [ ] **Step 5: Verify compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "(registry|pending-tool)" | head -20`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/tools/registry.ts
git commit -m "refactor(tools): delete old view registry and placeholder view (HIGH-11)"
```

---

### Task 17: Final sweep and manual verification

**Files:**
- Verify: entire `frontend/` tree

- [ ] **Step 1: Full TypeScript check**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -50`
Expected: Zero errors introduced by this refactor. (Pre-existing errors in unrelated files — e.g., `frontend/tsconfig.tsbuildinfo` — can be ignored.)

- [ ] **Step 2: Remove unused imports**

Run: `cd frontend && npx eslint "app/dashboard/tools/**/*.tsx" "components/tools/**/*.tsx" "lib/tools/**/*.ts" 2>&1 | grep "unused" | head -20`

For each reported unused import, remove it from the source file. Common candidates: `Loader2`, `useState` usages from deleted form state, `Input` imports no longer needed after form JSX deletion.

- [ ] **Step 3: Per-tool connect verification**

For each of the 9 tools, in the dev server:
1. Open `/dashboard/tools`
2. Click "Connect Tool"
3. Select the tool
4. Verify form renders correctly (right field count, labels, placeholders, hints, callouts)
5. Submit with dummy/invalid data — verify validation works
6. Close the modal — verify form is cleared on reopen

No need to complete all 9 OAuth flows end-to-end — just confirm the form layer is correct for each.

- [ ] **Step 4: Per-tool detail verification**

For each tool with a real connected integration (use test accounts if needed):
1. Open `/dashboard/tools/<integration-id>`
2. Verify the detail page header renders (logo, status badge, reconnect/delete buttons as expected)
3. Verify the view component renders all expected tabs and data
4. Spot-check against the pre-refactor version (switch to main in another clone for side-by-side)

- [ ] **Step 5: OAuth callback verification**

Complete one OAuth flow end-to-end (e.g., disconnect Fortnox and reconnect via the modal). Verify the redirect completes, the success toast fires, and the tools list reloads.

- [ ] **Step 6: Regressions check on adjacent features**

- Verify the tools list page cards render correctly (status badges, descriptions, categories)
- Verify the status filter dropdown still works
- Verify the search input still works

- [ ] **Step 7: Check line-count reduction**

Run: `cd frontend && wc -l app/dashboard/tools/page.tsx app/dashboard/tools/\[id\]/page.tsx`
Expected: `page.tsx` around 700-900 lines (was ~3,084). `[id]/page.tsx` around 150-200 lines (was ~5,079).

- [ ] **Step 8: Commit any cleanup from this task**

```bash
git add -A
git commit -m "refactor(tools): final sweep — remove unused imports after registry refactor (HIGH-11)"
```

---

## Issues NOT Addressed in This Plan

| Issue | Reason |
|---|---|
| Test coverage for these flows | No test framework is set up for these components. Adding one is a separate project. |
| Backend route-level limit enforcement for Google Workspace OAuth start | Covered by spec note in `2026-04-13-tools-tab-audit.md` (MEDIUM-14 partial). Out of scope. |
| Legacy type-casting inside each view (`as { ... }`) | Preserved verbatim per Option B (preserve + light cleanup). Future task: type the `info` payload per tool. |
| Shared formatter extraction (`view-helpers.ts`) | Deferred — create only if 2+ views need the same helper. Each view keeps helpers locally for now. |

---

## Rollout

Single big-bang PR on main. No feature flag. No DB migration. All changes are frontend.

Rollback plan: `git revert` the merge. The refactor is structured as 17 atomic commits, so targeted partial reverts are possible in theory, but full revert is the default.
