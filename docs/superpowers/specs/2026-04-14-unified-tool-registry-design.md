# Unified Tool Registry — Design

**Date:** 2026-04-14
**Issue:** HIGH-11 from the tools tab audit (`docs/superpowers/specs/2026-04-13-tools-tab-audit.md`)
**Severity:** Architecture debt — 3 parallel registries + ~2,000 lines of per-tool duplication

**Scope decisions:**
- Option C (full refactor, not partial)
- Single big-bang PR (not phased)
- Preserve UI + light cleanup during migration (Option B per-tool)

---

## Problem

The tools system currently maintains the same list of 9 tools in **three** separate places plus numerous hardcoded per-tool branches:

1. `frontend/lib/tools/registry.ts` — `TOOL_REGISTRY` for data-endpoint configs (all 9 tools)
2. `frontend/components/tools/registry.tsx` — `TOOL_VIEW_REGISTRY` for React view components (only 4 tools)
3. `frontend/app/dashboard/tools/[id]/page.tsx:1442` — `hasFullUI` hardcoded boolean for 5 legacy tools

In addition, `frontend/app/dashboard/tools/page.tsx` (~2,900 lines) contains:
- 9 `useState` form declarations
- 6 per-tool `start<Tool>OAuth` functions (~300 lines)
- 9 per-tool `handleConnect<Tool>` functions (~900 lines)
- 9 conditional `{selectedTool === "X" && (...)}` form UI blocks (~600 lines)
- A hardcoded tool metadata list (category, color, description) (~10 lines)
- `getCategory` and `getDescription` lookup functions (~30 lines)
- Nested dispatch if-else chain in the modal submit button (~30 lines)
- `getReconnectHandler` switch for OAuth tools (~10 lines)
- 5 per-tool OAuth callback query-string handlers in `useEffect` (~100 lines)

`frontend/app/dashboard/tools/[id]/page.tsx` (~5,000 lines) contains:
- 5 large hardcoded JSX blocks — one per legacy tool — rendering custom tabs for Fortnox, Microsoft 365, HubSpot, QuickBooks, Shopify

Adding a new tool currently touches 10+ locations. Renaming a tool is a grep-and-pray exercise.

---

## Goals

1. **One source of truth.** A single `UnifiedToolConfig` record per tool defines everything: metadata, auth fields, endpoints, view component, toast strings, quick-setup copy.
2. **Eliminate per-tool branching in `page.tsx` and `[id]/page.tsx`.** Replace 9 form blocks → 1 generic renderer. Replace 9 connect handlers → 1 generic hook. Replace 6 OAuth start functions → 1 generic function.
3. **Eliminate `hasFullUI`.** Every tool has a view component; the detail page delegates unconditionally.
4. **Adding a new tool = one config file.** No edits to `page.tsx`, no edits to `[id]/page.tsx`, no edits to the view registry.

## Non-goals

- No changes to backend contracts. Existing `/api/integrations/*` endpoints stay identical.
- No UI redesign — legacy tool detail pages look the same after migration.
- No changes to subscription limit enforcement (addressed in MEDIUM-14 separately).
- Not deleting the working-set auth logic — we're consolidating, not rewriting.

---

## Architecture

### One unified registry file

`frontend/lib/tools/registry.ts` becomes the single source of truth. The existing `frontend/components/tools/registry.tsx` is **deleted** — its mapping is folded into `lib/tools/registry.ts` as a `viewComponent` field on each config. The `hasFullUI` logic in `[id]/page.tsx` disappears entirely.

### Three consumer surfaces read the registry

1. **Connect modal** (tools list page) — uses `category`, `description`, `brandColor` for the picker; uses `authFields` to render the form; uses `authType` and `connectEndpoint` for submission.
2. **Tool cards** (tools list page) — uses metadata fields for badges, descriptions, categories.
3. **Detail page** (`[id]/page.tsx`) — uses `viewComponent` to render the body; uses `endpoints` and `defaultTab` for data fetching.

### Two generic services replace per-tool code

1. **`useToolConnect(config)`** — React hook returning `{ values, setValues, isConnecting, connect, reset }`. One hook replaces 9 `useState` declarations plus 9 connect handlers plus 6 OAuth start functions.
2. **`useOAuthCallback()`** — React hook that inspects the current URL for `?<provider>=status` query params, looks up the provider in the registry, and fires the appropriate success/error toast. Replaces the 5 hardcoded callback blocks.

### Legacy JSX migration

All 5 legacy tools get new files under `frontend/components/tools/`:
- `fortnox-view.tsx`
- `microsoft365-view.tsx`
- `hubspot-view.tsx`
- `quickbooks-view.tsx`
- `shopify-view.tsx`

Each contains the JSX currently hardcoded in `[id]/page.tsx`, moved verbatim with light cleanup (dead code, disabled tabs, duplicate style props). They match the existing `ToolViewProps` contract (`{ integration, info, isLoading, reload }`).

After migration, `[id]/page.tsx` shrinks from ~5,000 lines to ~150 lines — pure routing + shell + `<ViewComponent />` delegation.

---

## Data Model — `UnifiedToolConfig`

```typescript
interface UnifiedToolConfig {
  // IDENTITY
  provider: string              // "Fortnox" — matches company_integrations.provider
  id: string                    // "fortnox" — lowercase slug for URLs, select values
  label: string                 // "Fortnox", "Microsoft 365" — display name

  // UI METADATA
  category: "Finance" | "Productivity" | "CRM/Marketing" | "E-Commerce" | "AI" | "Communication" | "Other"
  description: string           // "Invoices, suppliers & accounting data"
  brandColor: string            // "#2DB250" — hex

  // AUTH & CONNECT
  authType: "oauth" | "apiKey" | "serviceAccount"
  authFields: AuthField[]       // drives the form renderer
  connectEndpoint: string       // "/api/integrations" (default) or "/api/integrations/openai/connect" (AI tools)
  oauthStartEndpoint?: string   // "/api/integrations/fortnox/oauth/start" — required iff authType === "oauth"
  buildConnectRequest: (formValues: Record<string, any>) => Record<string, any>
  validate?: (formValues: Record<string, any>) => string | null

  // UI HINTS
  quickSetup?: { title: string, steps: string[], note?: string }
  callouts?: { type: "info" | "warning" | "success", title: string, body: string, link?: string }[]

  // DATA FETCHING (existing shape preserved)
  endpoints: ToolEndpoint[]
  defaultTab: string

  // DETAIL PAGE
  viewComponent: ComponentType<ToolViewProps>

  // TOASTS
  connectingToast?: string      // "Redirecting to Fortnox to authorize..."
  connectedToast?: string       // "OpenAI connected" / "Backfilling 90 days..."
}

interface AuthField {
  name: string                  // "clientId", "apiKey"
  label: string                 // "Client ID"
  type: "text" | "password" | "textarea" | "select"
  required: boolean
  placeholder?: string
  hint?: string
  options?: { value: string, label: string }[]
  validate?: (value: string) => string | null
}

interface ToolEndpoint {
  // UNCHANGED from current definition
  key: string
  path: string
  pick?: string[]
  fallback?: any
}

interface ToolViewProps {
  integration: Integration
  info: ToolInfo | null
  isLoading: boolean
  reload: () => Promise<void>
}
```

### Key design choices

1. **`authFields` drives form rendering entirely.** No more per-tool JSX. `type: "password"` hides input. `type: "textarea"` renders a multi-line input for Gemini's service-account JSON. `type: "select"` renders a dropdown for HubSpot's hub-type / tier fields.

2. **`buildConnectRequest` is a function, not a schema.** Each tool maps form values to its API body shape. OpenAI returns `{ api_key: formValues.apiKey }`; Fortnox returns `{ integrations: [{ tool_name: "Fortnox", connection_type: "oauth", client_id: formValues.clientId, client_secret: formValues.clientSecret }] }`. Keeps the registry data-driven but accommodates per-tool request shapes without new abstractions.

3. **`viewComponent` is required, no fallback path.** Every tool must have one — `hasFullUI` disappears. If someone adds a new tool without a view component, TypeScript will fail at registry-registration time.

4. **`validate` is optional.** Only Gemini needs cross-field validation (JSON shape check). Per-field `AuthField.validate` handles common cases (required, min-length, prefix checks).

---

## New & Modified Files

### New files

| File | Responsibility |
|---|---|
| `frontend/lib/tools/use-tool-connect.ts` | Generic connect hook — owns form state, validation, submission, OAuth redirect |
| `frontend/lib/tools/oauth-callback-handler.ts` | Generic query-string parser for `?<provider>=status` redirects post-OAuth |
| `frontend/components/tools/tool-connect-form.tsx` | Generic form renderer — maps `AuthField[]` → inputs |
| `frontend/components/tools/tool-detail-shell.tsx` | Chrome around view component — header, reconnect, delete buttons |
| `frontend/components/tools/fortnox-view.tsx` | Migrated from `[id]/page.tsx` — Fortnox tabs |
| `frontend/components/tools/microsoft365-view.tsx` | Migrated — Microsoft 365 tabs |
| `frontend/components/tools/hubspot-view.tsx` | Migrated — HubSpot tabs |
| `frontend/components/tools/quickbooks-view.tsx` | Migrated — QuickBooks tabs |
| `frontend/components/tools/shopify-view.tsx` | Migrated — Shopify tabs |
| `frontend/components/tools/view-helpers.ts` | Shared formatters (only if 2+ views use them) |

### Modified files

| File | Change |
|---|---|
| `frontend/lib/tools/types.ts` | Add `UnifiedToolConfig`, `AuthField`; consolidate `ToolViewProps` |
| `frontend/lib/tools/registry.ts` | Unified export; each entry is a `UnifiedToolConfig` |
| `frontend/lib/tools/configs/*.ts` (all 9) | Add metadata, auth fields, `buildConnectRequest`, `viewComponent`, toast strings |
| `frontend/lib/tools/use-tool-info.ts` | Minor — accept `UnifiedToolConfig` instead of old `ToolConfig` |
| `frontend/app/dashboard/tools/page.tsx` | ~2,900 → ~700 lines. Delete form states, handlers, OAuth functions, modal JSX blocks, callback handlers, category/description helpers |
| `frontend/app/dashboard/tools/[id]/page.tsx` | ~5,000 → ~150 lines. Delete all legacy JSX; replace with shell + `<ViewComponent />` |

### Deleted files

| File | Reason |
|---|---|
| `frontend/components/tools/registry.tsx` | Merged into `lib/tools/registry.ts` |

---

## Execution Order

Single big-bang PR, but done in this sequence to keep the tree in a buildable state more often:

1. **Extend `types.ts`** — add `UnifiedToolConfig`, `AuthField`, merged `ToolViewProps`. Additive — old shape still works.
2. **Extend each of the 9 config files** — add all new fields. For the 5 legacy tools, point `viewComponent` to a temporary placeholder.
3. **Build generic plumbing** — `use-tool-connect.ts`, `tool-connect-form.tsx`, `oauth-callback-handler.ts`, `tool-detail-shell.tsx`. Verify with a small smoke test against one AI tool config.
4. **Migrate 5 legacy detail pages** — create 5 `<Tool>View.tsx` files, copy JSX from `[id]/page.tsx`, light cleanup. Point each config's `viewComponent` at the real file. Verify each tool's detail page still renders identically.
5. **Gut `[id]/page.tsx`** — replace the ~4,850-line body with the 150-line shell. Delete `hasFullUI`.
6. **Gut `page.tsx` connect modal** — replace the 9 `{selectedTool === "X" && (...)}` blocks with `<ToolConnectForm config={getToolConfig(selectedTool)} />`. Delete 9 form `useState`s, 9 `handleConnect*` functions, 6 `start*OAuth` helpers.
7. **Replace OAuth callback handling** — swap the 5 hardcoded blocks in `useEffect` for `useOAuthCallback()`.
8. **Delete `components/tools/registry.tsx`** — update its one remaining consumer (the new `tool-detail-shell.tsx`) to import from `lib/tools/registry.ts`.
9. **Final sweep** — remove unused imports, run `tsc --noEmit`, click through every tool's connect form and every connected tool's detail page in dev.

---

## Migration Pattern — One Legacy Tool

Applied identically to Fortnox, MS365, HubSpot, QuickBooks, Shopify. Example for Fortnox:

1. **Locate the JSX block** in `[id]/page.tsx` (Fortnox tabs around lines 1630-2756).
2. **Create `frontend/components/tools/fortnox-view.tsx`** exporting `function FortnoxView({ integration, info, isLoading, reload }: ToolViewProps)`.
3. **Copy the JSX verbatim** into the component body.
4. **Rewrite data access**: the legacy block reads from local state `const fortnoxInfo = (toolInfo || {}) as { ... }` at `[id]/page.tsx:112-127`. In the new component, use `const fortnoxInfo = (info || {}) as { ... }`. Preserve the existing type casts — don't rewrite types during the move.
5. **Resolve imports**: copy icon imports (`lucide-react`), UI components (`@/components/ui/*`), and chart libraries (`recharts`).
6. **Light cleanup (Option B)**:
   - Delete `console.log` statements
   - Remove dead tab branches (e.g., `false && ...` guards)
   - Normalize inline styles that duplicate Tailwind classes
   - Only extract constants when it clarifies intent
7. **Wire to registry**: set `viewComponent: FortnoxView` in `frontend/lib/tools/configs/fortnox.ts`.
8. **Verify**: connect Fortnox in dev, load `/dashboard/tools/<fortnox-integration-id>`, visually compare every tab against the pre-migration version.

### Shared UI helpers

Ad-hoc formatters at the top of `[id]/page.tsx` (e.g., currency formatters, date formatters) either:
- Move with their first/only consumer if used by one tool, or
- Go into `frontend/components/tools/view-helpers.ts` if used by 2+ tools

### Analysis tabs

Legacy tools often have an "Analysis" tab computing cost-leaks. That logic stays with its tool's view component — not hoisted into shared code (each tool's analysis is different).

---

## Error Handling

- **Missing registry entry**: `getToolConfig(provider)` returns `undefined`; `[id]/page.tsx` renders a generic "Unknown tool" fallback.
- **Missing `viewComponent`**: TypeScript blocks this at registry-registration time (field is required).
- **Form validation failure**: `useToolConnect.connect()` calls `validate()` before the network request; returns early and toasts the error.
- **OAuth start failure**: Same error-handling pattern as the existing per-tool handlers — toast with backend error message, reset `isConnecting`.
- **OAuth callback error**: `useOAuthCallback()` reads `error`/`details` query params and surfaces them via toast, same as the existing 5 blocks.
- **Reconnect for non-OAuth tool**: `useToolConnect.reconnect()` returns early with a toast (shouldn't happen — frontend only shows reconnect button for OAuth tools).

---

## Testing Strategy

No automated test framework exists for these flows. Manual verification per tool:

### Connect-form verification (all 9 tools)
For each: open modal → select tool → verify form renders correctly (field labels, types, placeholders, hints match current behavior) → fill with invalid input → verify validation toast → fill with valid input → submit → verify the right API request body is sent (Network tab inspection).

### Detail-page verification (5 legacy tools)
For each tool with an existing connected integration: open `/dashboard/tools/<id>` → compare every tab against the pre-migration version (use a screenshot or side-by-side browser window against a checked-out copy of `main`). Note any differences.

### Reconnect flow (3 tools: Fortnox, HubSpot, GoogleWorkspace)
For each: trigger the reconnect button on an existing card → verify the OAuth redirect fires → complete the flow → verify the card shows "connected" again.

### TypeScript
`cd frontend && npx tsc --noEmit` — zero new errors in the tools/ directories.

### Visual diff checklist
Plan will include a per-tool before/after visual diff checklist the implementer must fill in for each migrated detail page.

---

## Risk Areas

1. **5,000 → 150 line deletion in `[id]/page.tsx`** is the highest-risk change. Regression protection relies on the visual diff checklist in step 4 of the execution order. Mitigation: migrate one tool at a time within the big-bang PR, verify each, move to the next.

2. **Data shape drift across legacy views**. Each legacy tool reads `toolInfo` with slightly different type assertions. Moving verbatim is safe; rewriting types is NOT part of this refactor.

3. **`buildConnectRequest` for HubSpot** is the trickiest mapping — it builds a nested `pricing: { hub_type, tier, paid_seats? }` object. Tests should confirm the final request body matches the pre-refactor shape byte-for-byte.

4. **Shared helpers decision point**. If more than 2 view components end up wanting the same formatter, extract to `view-helpers.ts`. Otherwise, keep them local. Decision made per-helper during migration.

5. **`hasFullUI` fallback removal**. After this change, a tool with `status !== "connected"` still needs a view (the detail page shell handles this — no per-tool branching). Verify the shell's non-connected state covers all tools.

---

## Rollout

Single PR on main (per user's scope decision). No feature flag — the change is large enough that a flag would double the maintenance burden without reducing risk meaningfully.

Rollback plan: `git revert` the merge commit. All changes are additive except the delete of `components/tools/registry.tsx`, which is a pure move — revert is clean.

---

## Audit Cross-Reference

This design addresses **HIGH-11** from `docs/superpowers/specs/2026-04-13-tools-tab-audit.md`. It's the final piece of the tools-tab audit work (MEDIUM-14 already shipped in commits `4bc6b55..7b27df9`; the 17 other issues shipped earlier in `ade64de..400e930`).
