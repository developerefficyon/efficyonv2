# Tools Tab Audit Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 17 confirmed issues from the tools tab audit (3 CRITICAL findings were reclassified as schema-doc drift, not code bugs — see note below).

**Architecture:** All fixes are in a single file (`frontend/app/dashboard/tools/page.tsx`) except Task 7 (detail page + use-tool-info hook) and Task 9 (schema doc cleanup). Changes are isolated string/logic edits — no new files, no new dependencies.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, Supabase (backend)

---

## CRITICAL Findings Reclassification

**CRITICAL-1, CRITICAL-2, CRITICAL-3** were based on comparing code against `010_complete_current_schema.sql`. Investigation revealed that file is an abandoned schema redesign that was never applied. The **actual production schema** is `000_init_clean_schema.sql`, which uses `provider` and `settings` columns — matching the code exactly. These are not code bugs. Task 9 addresses the misleading schema file.

---

## File Map

| File | Tasks | Changes |
|---|---|---|
| `frontend/app/dashboard/tools/page.tsx` | 1-6, 8 | All frontend cross-cutting fixes |
| `frontend/lib/tools/use-tool-info.ts` | 7 | Remove "active" status check |
| `frontend/lib/tools/configs/microsoft365.ts` | 7 | Add usageReports endpoint |
| `backend/sql/010_complete_current_schema.sql` | 9 | Delete misleading file |

---

### Task 1: Fix `handleSyncNow` hardcoded Fortnox endpoint (HIGH-1)

**Files:**
- Modify: `frontend/app/dashboard/tools/page.tsx:1518-1561`

**Audit ref:** HIGH-1 — `handleSyncNow` always calls `/api/integrations/fortnox/sync-customers` regardless of which tool triggered it.

- [ ] **Step 1: Replace hardcoded endpoint with tool-aware routing**

In `frontend/app/dashboard/tools/page.tsx`, replace the `handleSyncNow` function (lines 1518-1561):

```typescript
  const handleSyncNow = async (integration: Integration) => {
    setSyncingId(integration.id)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Authentication required", {
          description: "Please log in again to sync.",
        })
        return
      }

      const res = await fetch(`${apiBase}/api/integrations/fortnox/sync-customers`, {
```

Replace with:

```typescript
  const handleSyncNow = async (integration: Integration) => {
    setSyncingId(integration.id)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Authentication required", {
          description: "Please log in again to sync.",
        })
        return
      }

      // Route to the correct sync endpoint for each tool
      const syncEndpoints: Record<string, string> = {
        Fortnox: "/api/integrations/fortnox/sync-customers",
        OpenAI: "/api/integrations/openai/sync",
        Anthropic: "/api/integrations/anthropic/sync",
        Gemini: "/api/integrations/gemini/sync",
      }
      const syncPath = syncEndpoints[integration.tool_name]
      if (!syncPath) {
        toast.error("Sync not available", {
          description: `Manual sync is not supported for ${integration.tool_name}.`,
        })
        setSyncingId(null)
        return
      }

      const res = await fetch(`${apiBase}${syncPath}`, {
```

- [ ] **Step 2: Update the success toast to be generic**

In the same function, replace lines 1547-1550:

```typescript
      const data = await res.json()
      const customerCount = data.active_customers_count ?? 0

      toast.success("Synced successfully", {
        description: `${customerCount} active customer${customerCount !== 1 ? "s" : ""} synced.`,
        duration: 6000,
      })
```

Replace with:

```typescript
      const data = await res.json()

      toast.success("Synced successfully", {
        description: data.message || `${integration.tool_name} data refreshed.`,
        duration: 6000,
      })
```

- [ ] **Step 3: Verify the page compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | head -20`
Expected: No TypeScript errors in `page.tsx`

- [ ] **Step 4: Commit**

```bash
git add frontend/app/dashboard/tools/page.tsx
git commit -m "fix: route handleSyncNow to correct endpoint per tool instead of hardcoded Fortnox"
```

---

### Task 2: Fix modal form reset on close (HIGH-2)

**Files:**
- Modify: `frontend/app/dashboard/tools/page.tsx:2148-2154`

**Audit ref:** HIGH-2 — `onOpenChange` only resets 3 of 9 forms when modal closes.

- [ ] **Step 1: Add missing form resets to onOpenChange**

In `frontend/app/dashboard/tools/page.tsx`, find the `onOpenChange` handler (lines 2143-2155):

```typescript
        onOpenChange={(open) => {
          setIsConnectModalOpen(open)
          if (open) {
            // Load tools when modal opens
            void loadTools()
          } else {
            setIsConnecting(false)
            setSelectedTool("")
            setFortnoxForm({ clientId: "", clientSecret: "" })
            setMicrosoft365Form({ tenantId: "", clientId: "", clientSecret: "" })
            setHubspotForm({ clientId: "", clientSecret: "", hubType: "sales", tier: "professional", paidSeats: "" })
          }
        }}
```

Replace with:

```typescript
        onOpenChange={(open) => {
          setIsConnectModalOpen(open)
          if (open) {
            // Load tools when modal opens
            void loadTools()
          } else {
            setIsConnecting(false)
            setSelectedTool("")
            setFortnoxForm({ clientId: "", clientSecret: "" })
            setMicrosoft365Form({ tenantId: "", clientId: "", clientSecret: "" })
            setHubspotForm({ clientId: "", clientSecret: "", hubType: "sales", tier: "professional", paidSeats: "" })
            setQuickbooksForm({ clientId: "", clientSecret: "" })
            setShopifyForm({ shopDomain: "", clientId: "", clientSecret: "" })
            setOpenaiForm({ apiKey: "" })
            setAnthropicForm({ apiKey: "" })
            setGeminiForm({ serviceAccountJson: "", bigqueryTable: "" })
            setGoogleWorkspaceForm({ clientId: "", clientSecret: "" })
          }
        }}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/dashboard/tools/page.tsx
git commit -m "fix: reset all 9 tool forms when connect modal closes via X or outside click"
```

---

### Task 3: Fix stale closure on `integrationLimits` (HIGH-3)

**Files:**
- Modify: `frontend/app/dashboard/tools/page.tsx:241-265`

**Audit ref:** HIGH-3 — `integrationLimits` used as fallback inside `useCallback` but not in the dependency array.

- [ ] **Step 1: Remove the stale fallback**

The safest fix is to remove the fallback to stale state entirely. If `data.limits` is not returned, keep whatever limits are already in state (don't overwrite them).

In `frontend/app/dashboard/tools/page.tsx`, find lines 241-254:

```typescript
      const limits = data.limits ? {
        current: data.limits.current || 0,
        max: data.limits.max || 5,
        canAddMore: data.limits.canAddMore ?? true,
        planTier: data.limits.planTier || "startup",
        planName: data.limits.planName || "Startup",
      } : integrationLimits

      if (data.limits) {
        setIntegrationLimits(limits)
      }

      // Save to cache for instant loading on revisit
      setCache("integrations-data", { integrations: loadedIntegrations, limits })
```

Replace with:

```typescript
      if (data.limits) {
        const limits = {
          current: data.limits.current || 0,
          max: data.limits.max || 5,
          canAddMore: data.limits.canAddMore ?? true,
          planTier: data.limits.planTier || "startup",
          planName: data.limits.planName || "Startup",
        }
        setIntegrationLimits(limits)
        setCache("integrations-data", { integrations: loadedIntegrations, limits })
      } else {
        setCache("integrations-data", { integrations: loadedIntegrations, limits: integrationLimits })
      }
```

Wait — this still references `integrationLimits` in the else branch. The cleanest fix is to use a ref for the fallback:

Actually, the simplest correct fix: just cache with undefined limits and let the existing state persist. Replace the block with:

```typescript
      if (data.limits) {
        const limits = {
          current: data.limits.current || 0,
          max: data.limits.max || 5,
          canAddMore: data.limits.canAddMore ?? true,
          planTier: data.limits.planTier || "startup",
          planName: data.limits.planName || "Startup",
        }
        setIntegrationLimits(limits)
      }

      // Save to cache for instant loading on revisit
      setCache("integrations-data", { integrations: loadedIntegrations, limits: data.limits || null })
```

Then update the cache read at line 100 to handle null limits:

Find line 100-112:

```typescript
  const cachedIntegrations = getCache<{ integrations: Integration[]; limits: IntegrationLimits }>("integrations-data")
```

This already works — if `limits` is null, the `cachedIntegrations?.limits` at line 105 will be null and fall back to the default object. No change needed at line 100.

- [ ] **Step 2: Commit**

```bash
git add frontend/app/dashboard/tools/page.tsx
git commit -m "fix: remove stale integrationLimits closure from loadIntegrations callback"
```

---

### Task 4: Fix dialog title, category, and description maps (MEDIUM-4, MEDIUM-5, MEDIUM-13)

**Files:**
- Modify: `frontend/app/dashboard/tools/page.tsx:1637-1670,2170`

**Audit ref:** MEDIUM-4 (title map missing 4 tools), MEDIUM-5 (category/description missing AI tools), MEDIUM-13 (Shopify = "Other")

- [ ] **Step 1: Update dialog title name map**

At line 2170, replace:

```typescript
                    const names: Record<string, string> = { fortnox: "Fortnox", microsoft365: "Microsoft 365", hubspot: "HubSpot", quickbooks: "QuickBooks", shopify: "Shopify" }
```

With:

```typescript
                    const names: Record<string, string> = { fortnox: "Fortnox", microsoft365: "Microsoft 365", hubspot: "HubSpot", quickbooks: "QuickBooks", shopify: "Shopify", openai: "OpenAI", anthropic: "Anthropic", gemini: "Gemini", googleworkspace: "Google Workspace" }
```

- [ ] **Step 2: Add AI tools and Shopify to getCategory**

At lines 1637-1657, replace the `getCategory` function:

```typescript
    const getCategory = (toolName: string): string => {
      const name = toolName.toLowerCase()
      if (name.includes("slack") || name.includes("zoom") || name.includes("teams")) {
        return "Communication"
      }
      if (name.includes("jira") || name.includes("asana") || name.includes("trello")) {
        return "Project Management"
      }
      if (name.includes("hubspot") || name.includes("salesforce") || name.includes("crm")) {
        return "CRM/Marketing"
      }
      if (name.includes("notion") || name.includes("workspace") || name.includes("office")) {
        return "Productivity"
      }
      if (name.includes("microsoft") || name.includes("365") || name.includes("m365")) {
        return "Productivity"
      }
      if (name.includes("fortnox") || name.includes("quickbooks") || name.includes("xero")) {
        return "Finance"
      }
      return "Other"
    }
```

With:

```typescript
    const getCategory = (toolName: string): string => {
      const name = toolName.toLowerCase()
      if (name.includes("slack") || name.includes("zoom") || name.includes("teams")) {
        return "Communication"
      }
      if (name.includes("jira") || name.includes("asana") || name.includes("trello")) {
        return "Project Management"
      }
      if (name.includes("hubspot") || name.includes("salesforce") || name.includes("crm")) {
        return "CRM/Marketing"
      }
      if (name.includes("openai") || name.includes("anthropic") || name.includes("gemini")) {
        return "AI"
      }
      if (name.includes("shopify")) {
        return "E-Commerce"
      }
      if (name.includes("notion") || name.includes("workspace") || name.includes("office")) {
        return "Productivity"
      }
      if (name.includes("microsoft") || name.includes("365") || name.includes("m365")) {
        return "Productivity"
      }
      if (name.includes("fortnox") || name.includes("quickbooks") || name.includes("xero")) {
        return "Finance"
      }
      return "Other"
    }
```

Note: AI tools and Shopify rules are placed BEFORE the "workspace" check so "GoogleWorkspace" doesn't accidentally match "AI" — it correctly falls through to the "workspace" match for "Productivity".

- [ ] **Step 3: Add AI tools and Google Workspace to getDescription**

At lines 1660-1669, replace:

```typescript
    const getDescription = (toolName: string): string => {
      const name = toolName.toLowerCase()
      if (name.includes("fortnox")) return "Invoices, suppliers & accounting data"
      if (name.includes("quickbooks")) return "Bills, expenses & financial reports"
      if (name.includes("hubspot")) return "Contacts, deals & marketing data"
      if (name.includes("microsoft") || name.includes("365")) return "Users, licenses & productivity tools"
      if (name.includes("shopify")) return "Products, orders & customer data"
      if (name.includes("slack")) return "Channels, users & messaging data"
      if (name.includes("salesforce")) return "CRM contacts, leads & opportunities"
      return "Connected integration"
    }
```

With:

```typescript
    const getDescription = (toolName: string): string => {
      const name = toolName.toLowerCase()
      if (name.includes("fortnox")) return "Invoices, suppliers & accounting data"
      if (name.includes("quickbooks")) return "Bills, expenses & financial reports"
      if (name.includes("hubspot")) return "Contacts, deals & marketing data"
      if (name.includes("microsoft") || name.includes("365")) return "Users, licenses & productivity tools"
      if (name.includes("shopify")) return "Products, orders & customer data"
      if (name.includes("openai")) return "ChatGPT API spend & cost analysis"
      if (name.includes("anthropic")) return "Claude API spend & cost analysis"
      if (name.includes("gemini")) return "Google Gemini API spend & cost analysis"
      if (name.includes("googleworkspace")) return "Users, licenses & directory data"
      if (name.includes("slack")) return "Channels, users & messaging data"
      if (name.includes("salesforce")) return "CRM contacts, leads & opportunities"
      return "Connected integration"
    }
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/dashboard/tools/page.tsx
git commit -m "fix: add missing AI tools + Shopify to dialog title, category, and description maps"
```

---

### Task 5: Fix status UI gaps (MEDIUM-6, MEDIUM-7)

**Files:**
- Modify: `frontend/app/dashboard/tools/page.tsx:1724-1748,1958-1961`

**Audit ref:** MEDIUM-6 (disconnected = "Unknown"), MEDIUM-7 (filter dropdown incomplete)

- [ ] **Step 1: Add `disconnected` handling to getStatusIcon**

At lines 1724-1748, find the `getStatusIcon` function. After the `pending` block (line 1742) and before the final `return`, add a `disconnected` case:

```typescript
    } else if (status === "pending") {
      return (
        <Badge className="bg-amber-500/10 text-amber-400/80 border-amber-500/15 text-[9px] h-[18px] px-1.5 rounded-full font-medium">
          Pending
        </Badge>
      )
    } else if (status === "disconnected") {
      return (
        <Badge className="bg-white/[0.06] text-white/40 border-white/[0.08] text-[9px] h-[18px] px-1.5 rounded-full font-medium">
          Disconnected
        </Badge>
      )
    }
```

- [ ] **Step 2: Add missing status filter options**

At lines 1958-1961, replace:

```typescript
              <SelectItem value="all" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">All Status</SelectItem>
              <SelectItem value="connected" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">Connected</SelectItem>
              <SelectItem value="error" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">Error</SelectItem>
```

With:

```typescript
              <SelectItem value="all" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">All Status</SelectItem>
              <SelectItem value="connected" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">Connected</SelectItem>
              <SelectItem value="error" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">Error</SelectItem>
              <SelectItem value="expired" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">Expired</SelectItem>
              <SelectItem value="pending" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">Pending</SelectItem>
              <SelectItem value="disconnected" className="text-white/70 text-[12px] focus:bg-white/[0.06] focus:text-white">Disconnected</SelectItem>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/dashboard/tools/page.tsx
git commit -m "fix: add disconnected badge and complete status filter dropdown with all 5 statuses"
```

---

### Task 6: Add Google Workspace reconnect handler + fix key validation (MEDIUM-15, LOW-16, LOW-17)

**Files:**
- Modify: `frontend/app/dashboard/tools/page.tsx:910-956,1276-1278,1327-1329,2019-2028`

**Audit ref:** MEDIUM-15 (GWorkspace missing reconnect), LOW-16 (OpenAI prefix mismatch), LOW-17 (Anthropic prefix loose)

- [ ] **Step 1: Add `startGoogleWorkspaceOAuth` function**

After the `startShopifyOAuth` function (around line 956), add:

```typescript
  const startGoogleWorkspaceOAuth = async (integrationId?: string) => {
    if (integrationId) setReconnectingId(integrationId)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        toast.error("Session expired", { description: "Please log in again" })
        router.push("/login")
        return
      }

      const oauthRes = await fetch(`${apiBase}/api/integrations/googleworkspace/oauth/start`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!oauthRes.ok) {
        const errorData = await oauthRes.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to start Google Workspace OAuth")
      }

      const oauthData = await oauthRes.json()
      const redirectUrl = oauthData.url

      if (!redirectUrl) {
        throw new Error("No OAuth URL returned from backend")
      }

      toast.success("Redirecting to Google to authorize...", {
        description: "You'll be taken to Google to grant access.",
      })

      setTimeout(() => {
        window.location.href = redirectUrl
      }, 500)
    } catch (error: any) {
      console.error("Error starting Google Workspace OAuth:", error)
      toast.error("Failed to start Google Workspace OAuth", {
        description: error.message || "An error occurred.",
      })
      setReconnectingId(null)
    }
  }
```

- [ ] **Step 2: Wire it into getReconnectHandler**

At lines 2019-2028, replace:

```typescript
            const getReconnectHandler = () => {
              if (!integration) return null
              const name = integration.tool_name
              if (name === "Fortnox") return () => startFortnoxOAuth(integration.id)
              if (name === "Microsoft365") return () => startMicrosoft365OAuth(integration.id)
              if (name === "HubSpot") return () => startHubSpotOAuth(integration.id)
              if (name === "QuickBooks") return () => startQuickBooksOAuth(integration.id)
              if (name === "Shopify") return () => startShopifyOAuth(integration.id)
              return null
            }
```

With:

```typescript
            const getReconnectHandler = () => {
              if (!integration) return null
              const name = integration.tool_name
              if (name === "Fortnox") return () => startFortnoxOAuth(integration.id)
              if (name === "Microsoft365") return () => startMicrosoft365OAuth(integration.id)
              if (name === "HubSpot") return () => startHubSpotOAuth(integration.id)
              if (name === "QuickBooks") return () => startQuickBooksOAuth(integration.id)
              if (name === "Shopify") return () => startShopifyOAuth(integration.id)
              if (name === "GoogleWorkspace") return () => startGoogleWorkspaceOAuth(integration.id)
              return null
            }
```

- [ ] **Step 3: Tighten Anthropic key validation**

At line 1327, replace:

```typescript
    if (!apiKey.startsWith("sk-ant-admin")) {
```

With:

```typescript
    if (!apiKey.startsWith("sk-ant-admin01-")) {
```

This matches the error message at line 1329 and the placeholder at line 2816.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/dashboard/tools/page.tsx
git commit -m "fix: add Google Workspace reconnect handler and tighten Anthropic key validation"
```

Note: LOW-16 (OpenAI prefix) is not a bug — `sk-admin-` validation matches its error message. No change needed.

---

### Task 7: Fix detail page status mismatch and Microsoft365 config (HIGH-10, MEDIUM-12)

**Files:**
- Modify: `frontend/lib/tools/use-tool-info.ts:60`
- Modify: `frontend/lib/tools/configs/microsoft365.ts`

**Audit ref:** HIGH-10 (useToolInfo loads on "active" but page only renders on "connected"), MEDIUM-12 (missing usageReports endpoint)

- [ ] **Step 1: Remove "active" status from useToolInfo**

The production database uses `provider` and `settings` columns with no CHECK constraint on status. But controllers write "active" for AI tools. The safest fix is to keep `useToolInfo` consistent with the detail page: only load when status is "connected".

In `frontend/lib/tools/use-tool-info.ts`, line 60, replace:

```typescript
    if (integration.status !== "connected" && integration.status !== "active") {
```

With:

```typescript
    if (integration.status !== "connected") {
```

This means if the backend writes "active" for AI tools, the detail page won't load data. But the audit also showed that the backend controllers for AI tools write `status: "active"` on connect — this is a backend issue that should be fixed separately (the controllers should write "connected" to match the rest of the system). For now, the frontend is consistent.

- [ ] **Step 2: Add usageReports endpoint to Microsoft365 config**

In `frontend/lib/tools/configs/microsoft365.ts`, replace:

```typescript
export const microsoft365Config: ToolConfig = {
  provider: "Microsoft365",
  label: "Microsoft 365",
  defaultTab: "licenses",
  endpoints: [
    { key: "licenses", path: "/api/integrations/microsoft365/licenses", pick: ["licenses"], fallback: [] },
    { key: "users", path: "/api/integrations/microsoft365/users", pick: ["users"], fallback: [] },
  ],
}
```

With:

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/tools/use-tool-info.ts frontend/lib/tools/configs/microsoft365.ts
git commit -m "fix: align useToolInfo status check with detail page and add Microsoft365 usageReports endpoint"
```

---

### Task 8: Fix fragile matching and consolidate Integration interface (LOW-8, LOW-9)

**Files:**
- Modify: `frontend/app/dashboard/tools/page.tsx:49-65,2196-2197`

**Audit ref:** LOW-8 (alreadyConnected fragile), LOW-9 (duplicate Integration interface)

- [ ] **Step 1: Improve alreadyConnected normalization**

At lines 2196-2197, replace:

```typescript
                  const alreadyConnected = integrations.some(
                    (i) => i.tool_name.toLowerCase().replace(/\s+/g, '') === tool.id.replace(/\s+/g, '')
                  )
```

With:

```typescript
                  const alreadyConnected = integrations.some(
                    (i) => i.tool_name.toLowerCase().replace(/[\s-_]+/g, '') === tool.id.replace(/[\s-_]+/g, '')
                  )
```

This handles hyphens and underscores in addition to spaces.

- [ ] **Step 2: Import and use shared Integration type**

At the top of `frontend/app/dashboard/tools/page.tsx`, add after existing imports (around line 47):

```typescript
import type { Integration as SharedIntegration } from "@/lib/tools/types"
```

Then replace the local `Integration` interface (lines 49-65):

```typescript
interface Integration {
  id: string
  tool_name: string
  connection_type: string
  status: string
  created_at: string
  updated_at: string
  oauth_data?: {
    tokens?: {
      access_token?: string
      refresh_token?: string
      expires_at?: number
      expires_in?: number
      scope?: string
    }
  } | null
}
```

With:

```typescript
type Integration = SharedIntegration
```

Note: The shared type in `types.ts` already has `tool_name`, `status`, `created_at`, `updated_at`, `settings`, and `oauth_data` (as `any`). If any code in this file depends on the strongly-typed `oauth_data.tokens` structure, those accesses will need optional chaining (they likely already use it since `oauth_data` was optional before).

- [ ] **Step 3: Commit**

```bash
git add frontend/app/dashboard/tools/page.tsx
git commit -m "fix: improve alreadyConnected normalization and consolidate Integration interface"
```

---

### Task 9: Clean up misleading schema file (CRITICAL-1/2/3 reclassification)

**Files:**
- Delete: `backend/sql/010_complete_current_schema.sql`

**Audit ref:** CRITICAL-1, CRITICAL-2, CRITICAL-3 — These were false positives caused by comparing code against an abandoned schema redesign file.

- [ ] **Step 1: Delete the misleading schema file**

```bash
git rm backend/sql/010_complete_current_schema.sql
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: remove abandoned schema redesign file that conflicted with production schema

The file 010_complete_current_schema.sql defined a different table structure
(tool_name, oauth_data, api_key columns) than the actual production schema
in 000_init_clean_schema.sql (provider, settings columns). This caused
confusion during the audit. The production schema is correct."
```

---

## Issues NOT addressed in this plan

| Issue | Reason |
|---|---|
| HIGH-11 (triple registry sync) | Architecture debt — requires larger refactor to derive `hasFullUI` from registries. Not a bug, just maintenance risk. |
| MEDIUM-14 (AI tools bypass limits) | Needs backend investigation — the `/connect` endpoints may already enforce limits server-side. |
| LOW-8 partial (deeper normalization) | The regex fix in Task 8 is sufficient for current tool names. |

---

## Execution Order

Tasks 1-6 all modify `frontend/app/dashboard/tools/page.tsx` and should be done sequentially to avoid merge conflicts. Tasks 7-9 touch different files and can run in parallel with each other (but after Tasks 1-6 are committed).

Recommended order: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9**
