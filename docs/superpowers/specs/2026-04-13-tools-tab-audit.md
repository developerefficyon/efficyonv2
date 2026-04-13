# Tools Tab Full Audit — Issues, Gaps, Bugs & Inconsistencies

**Date:** 2026-04-13
**Scope:** Full audit of the tools/integrations tab on the user-facing dashboard
**Approach:** Hybrid — cross-cutting systemic issues first, then per-tool sweep
**Tools audited:** Fortnox, Microsoft365, HubSpot, QuickBooks, Shopify, OpenAI, Anthropic, Gemini, GoogleWorkspace

---

## Section 1: Data Integrity (Database vs Backend)

### CRITICAL-1: Column name `provider` does not exist in schema

**Files:** `backend/sql/010_complete_current_schema.sql` (line 108), all controllers
**Severity:** CRITICAL

The `company_integrations` table defines `tool_name` as the column for provider identifiers. But every controller queries against `.eq("provider", ...)` — a column that does not exist in the schema.

**Affected controllers (40+ occurrences):**
- `integrationController.js` — lines 158, 230, 266, 489, 496, 526
- `openaiUsageController.js` — lines 65, 119, 146, 270
- `anthropicUsageController.js` — lines 56, 106, 129, 243
- `geminiUsageController.js` — lines 74, 133, 148, 293
- `googleWorkspaceController.js` — lines 181, 278, 314
- Plus fortnoxController, quickbooksController, microsoft365Controller, hubspotController, shopifyController, analysisHistoryController, recommendationController, openaiSyncScheduler

**Impact:** All queries filtering by provider would fail or return zero results. If this works in production, there is likely a migration that added/renamed the column not reflected in the schema file — but the schema file and code are out of sync either way.

---

### CRITICAL-2: Status CHECK constraint vs actual status values used

**File:** `backend/sql/010_complete_current_schema.sql` (line 110)
**Severity:** CRITICAL

Schema constraint allows only: `'connected', 'disconnected', 'error'`

Code writes these invalid values:

| Invalid Status | Controller | Lines |
|---|---|---|
| `"active"` | openaiUsageController.js | 72, 82 |
| `"active"` | anthropicUsageController.js | 63, 74 |
| `"active"` | geminiUsageController.js | 81, 91 |
| `"expired"` | googleWorkspaceController.js | 78 |
| `"pending"` | integrationController.js | 80 |
| `"warning"` | integrationController.js | 80 |

**Impact:** INSERT/UPDATE operations with these values would violate the CHECK constraint and fail at the database level.

---

### CRITICAL-3: `settings` column vs individual columns

**File:** `integrationController.js` (line 268)
**Severity:** CRITICAL

The schema defines individual columns (`oauth_data`, `api_key`, `client_id`, `client_secret`), but the controller inserts a single `settings` blob. This is either schema drift or the code is targeting a different table shape.

---

## Section 2: Frontend Cross-Cutting Issues

### HIGH-1: `handleSyncNow` is hardcoded to Fortnox

**File:** `frontend/app/dashboard/tools/page.tsx` (line 1531)
**Severity:** HIGH

The sync function always calls `/api/integrations/fortnox/sync-customers` regardless of which tool triggered it. The `integration` parameter is accepted but never used for routing. Clicking "Sync" on any non-Fortnox tool hits the wrong endpoint.

---

### HIGH-2: Modal `onOpenChange` only resets 3 of 9 forms

**File:** `frontend/app/dashboard/tools/page.tsx` (lines 2148-2154)
**Severity:** HIGH

When the dialog closes via X button or clicking outside, only `fortnoxForm`, `microsoft365Form`, and `hubspotForm` are cleared. The Cancel button (line 2856) correctly resets all 9 forms.

**Missing resets:** quickbooksForm, shopifyForm, openaiForm, anthropicForm, geminiForm, googleWorkspaceForm

**Impact:** If a user partially fills a form, closes the modal via X, and reopens it, stale credentials persist in the form fields.

---

### HIGH-3: `integrationLimits` stale closure

**File:** `frontend/app/dashboard/tools/page.tsx` (lines 247, 265)
**Severity:** HIGH

`integrationLimits` is used as a fallback inside `loadIntegrations` (line 247), but the `useCallback` dependency array (line 265) only includes `[router]`. The fallback always references the initial render's value, never the updated state.

---

### HIGH-10: Status mismatch between `useToolInfo` and detail page rendering

**Files:** `frontend/lib/tools/use-tool-info.ts` (line 60), `frontend/app/dashboard/tools/[id]/page.tsx` (line 1564)
**Severity:** HIGH

`useToolInfo` loads data when status is `"connected"` OR `"active"`. But the detail page only renders the UI when status is exactly `"connected"`. If a tool has `status="active"`, data loads but the UI shows a blank body.

---

### HIGH-11: Three separate "registries" must stay in sync manually

**Files:** `frontend/lib/tools/registry.ts`, `frontend/components/tools/registry.tsx`, `frontend/app/dashboard/tools/[id]/page.tsx` (line 1442)
**Severity:** HIGH

| Tool | TOOL_REGISTRY | TOOL_VIEW_REGISTRY | hasFullUI |
|---|---|---|---|
| Fortnox | Yes | No | Yes |
| Microsoft365 | Yes | No | Yes |
| HubSpot | Yes | No | Yes |
| QuickBooks | Yes | No | Yes |
| Shopify | Yes | No | Yes |
| OpenAI | Yes | Yes | No |
| Anthropic | Yes | Yes | No |
| Gemini | Yes | Yes | No |
| GoogleWorkspace | Yes | Yes | No |

If a tool is added to one registry but forgotten in the others, the detail page silently shows a blank body. The `hasFullUI` variable is hardcoded rather than derived from the registries.

---

### MEDIUM-4: Dialog title name map missing 4 tools

**File:** `frontend/app/dashboard/tools/page.tsx` (line 2170)
**Severity:** MEDIUM

The map only includes `{ fortnox, microsoft365, hubspot, quickbooks, shopify }`. When OpenAI/Anthropic/Gemini/GoogleWorkspace is selected, the title falls through to the raw ID string (e.g., "Connect googleworkspace" instead of "Connect Google Workspace").

---

### MEDIUM-5: `getCategory` and `getDescription` missing AI tools

**File:** `frontend/app/dashboard/tools/page.tsx` (lines 1637-1670)
**Severity:** MEDIUM

OpenAI, Anthropic, and Gemini have no category rules (fall to "Other") and no description rules (fall to "Connected integration"). Google Workspace gets a correct category via the `"workspace"` match but also has no description.

---

### MEDIUM-6: `disconnected` status renders as "Unknown"

**File:** `frontend/app/dashboard/tools/page.tsx` (lines 1724-1748)
**Severity:** MEDIUM

`getStatusIcon` handles `connected`, `error`/`expired`, and `pending`, but `disconnected` falls through to the gray "Unknown" badge despite being a valid status in the `Tool` interface (line 73).

---

### MEDIUM-7: Status filter dropdown is incomplete

**File:** `frontend/app/dashboard/tools/page.tsx` (lines 1958-1961)
**Severity:** MEDIUM

Only offers "All", "Connected", "Error". Missing "Pending", "Expired", "Disconnected" — all valid statuses that users can't filter by.

---

### MEDIUM-12: Missing `usageReports` endpoint in Microsoft365 config

**Files:** `frontend/lib/tools/configs/microsoft365.ts`, `frontend/app/dashboard/tools/[id]/page.tsx` (lines 117-119)
**Severity:** MEDIUM

The detail page expects `usageReports` in the toolInfo payload, but the Microsoft365 config only defines `licenses` and `users` endpoints. `usageReports` is always undefined.

---

### LOW-8: `alreadyConnected` matching is fragile

**File:** `frontend/app/dashboard/tools/page.tsx` (lines 2196-2197)
**Severity:** LOW

Relies on `toLowerCase().replace(/\s+/g, '')` normalization. Works now by coincidence, but any format like `"google-workspace"` (hyphenated) would break the match.

---

### LOW-9: Duplicate `Integration` interface

**Files:** `frontend/app/dashboard/tools/page.tsx` (lines 49-65), `frontend/lib/tools/types.ts` (lines 12-22)
**Severity:** LOW

Two separate `Integration` interfaces with different `oauth_data` typing. The page version is strongly typed; the types.ts version uses `any`. They can drift apart.

---

## Section 3: Per-Tool Gaps

### Complete Feature Matrix

| Feature | Fortnox | MS365 | HubSpot | QuickBooks | Shopify | OpenAI | Anthropic | Gemini | GWorkspace |
|---|---|---|---|---|---|---|---|---|---|
| Connect Form | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Connect Handler | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Limit Check | Yes | Yes | Yes | Yes | Yes | **No** | **No** | **No** | Yes |
| OAuth Callback | Yes | Yes | Yes | Yes | Yes | N/A | N/A | N/A | Yes |
| Reconnect Button | Yes | Yes | Yes | Yes | Yes | **No** | **No** | **No** | **No** |
| Category | Finance | Productivity | CRM/Marketing | Finance | **"Other"** | **"Other"** | **"Other"** | **"Other"** | Productivity |
| Description | Yes | Yes | Yes | Yes | Yes | **Generic** | **Generic** | **Generic** | **Generic** |
| Detail View | Legacy | Legacy | Legacy | Legacy | Legacy | Registry | Registry | Registry | Registry |

---

### MEDIUM-13: Shopify categorized as "Other"

**File:** `frontend/app/dashboard/tools/page.tsx` (lines 1637-1657)
**Severity:** MEDIUM

`getCategory` has no rule matching "shopify". Falls through to "Other" instead of "E-Commerce". Inconsistent with the connect modal (line 2190) which hardcodes Shopify's category as "E-Commerce".

---

### MEDIUM-14: OpenAI/Anthropic/Gemini bypass integration limit checks

**File:** `frontend/app/dashboard/tools/page.tsx` (lines 1293, 1344, 1485)
**Severity:** MEDIUM

OAuth tools go through `POST /api/integrations` first (which enforces limits with a 403 check). But `handleConnectOpenAI`, `handleConnectAnthropic`, and `handleConnectGemini` call their respective `/connect` endpoints directly, skipping the standard upsert flow. If the backend `/connect` endpoints don't independently enforce limits, users could exceed their plan's integration count.

---

### MEDIUM-15: Google Workspace missing from `getReconnectHandler`

**File:** `frontend/app/dashboard/tools/page.tsx` (lines 2019-2028)
**Severity:** MEDIUM

Google Workspace is an OAuth tool with OAuth start logic embedded in `handleConnectGoogleWorkspace` (line 1424), but there's no standalone `startGoogleWorkspaceOAuth` function wired into `getReconnectHandler`. If a GWorkspace token expires, users see no reconnect button.

---

### LOW-16: OpenAI key validation prefix mismatch

**File:** `frontend/app/dashboard/tools/page.tsx` (lines 1276-1278)
**Severity:** LOW

Validates `sk-admin-` but the error message says "starts with sk-admin-". The Anthropic validation (line 1327) checks `sk-ant-admin` but the error text says "starts with sk-ant-admin01-". The validation is more lenient than what the error description suggests.

---

### LOW-17: Anthropic key format check is loose

**File:** `frontend/app/dashboard/tools/page.tsx` (line 1327)
**Severity:** LOW

Checks `apiKey.startsWith("sk-ant-admin")` which would also accept `sk-ant-administrator` or any string starting with those characters. The placeholder (line 2816) shows `sk-ant-admin01-...` suggesting a more specific format is expected.

---

## Summary

### By Severity

| Severity | Count | Issues |
|---|---|---|
| CRITICAL | 3 | CRITICAL-1, CRITICAL-2, CRITICAL-3 |
| HIGH | 5 | HIGH-1, HIGH-2, HIGH-3, HIGH-10, HIGH-11 |
| MEDIUM | 8 | MEDIUM-4, MEDIUM-5, MEDIUM-6, MEDIUM-7, MEDIUM-12, MEDIUM-13, MEDIUM-14, MEDIUM-15 |
| LOW | 4 | LOW-8, LOW-9, LOW-16, LOW-17 |
| **Total** | **20** | |

### By Category

| Category | Issues |
|---|---|
| Data Integrity (DB vs Backend) | CRITICAL-1, CRITICAL-2, CRITICAL-3 |
| Frontend Logic Bugs | HIGH-1, HIGH-2, HIGH-3, HIGH-10 |
| Architecture/Registry Gaps | HIGH-11, MEDIUM-12, LOW-9 |
| Missing UI Features | MEDIUM-4, MEDIUM-5, MEDIUM-6, MEDIUM-7 |
| Per-Tool Gaps | MEDIUM-13, MEDIUM-14, MEDIUM-15, LOW-16, LOW-17 |
| Fragile Matching | LOW-8 |

### Recommended Fix Order

1. **Immediate:** CRITICAL-1, CRITICAL-2, CRITICAL-3 — Align DB schema and backend code (or verify actual production schema matches code)
2. **High Priority:** HIGH-1 (sync hardcoded to Fortnox), HIGH-2 (form reset), HIGH-3 (stale closure)
3. **Next Sprint:** HIGH-10, HIGH-11 (registry alignment), MEDIUM-4/5/6/7 (UI completeness)
4. **Backlog:** MEDIUM-12/13/14/15, LOW-8/9/16/17
