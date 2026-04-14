# Integration Deletion Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the integration-delete flow explicit about data preservation + add server-side OAuth token revocation for Fortnox, QuickBooks, and Google Workspace (currently only HubSpot revokes).

**Architecture:** Add a `REVOCATION_HANDLERS` dispatch map in `integrationController.deleteIntegration` replacing the hardcoded HubSpot-only block. Each OAuth controller exports a `revoke<Provider>Token(refreshToken, ctx?)` function with consistent error-swallowing semantics. Frontend extends `UnifiedToolConfig` with a `tokenRevocation` field and renders a richer delete-confirmation dialog driven by it.

**Tech Stack:** Node.js (Express), Supabase, Next.js 14, React 18, TypeScript

---

## File Map

| File | Change | Task |
|---|---|---|
| `frontend/lib/tools/types.ts` | Add `tokenRevocation` to `UnifiedToolConfig` | 1 |
| `frontend/lib/tools/configs/*.ts` (9 files) | Populate `tokenRevocation` per tool | 2 |
| `backend/src/controllers/fortnoxController.js` | Add `revokeFortnoxToken` function + export | 3 |
| `backend/src/controllers/googleWorkspaceController.js` | Add `revokeGoogleWorkspaceToken` function + export | 4 |
| `backend/src/controllers/integrationController.js` | Replace HubSpot-only block with registry dispatch | 5 |
| `frontend/app/dashboard/tools/page.tsx` | Redesign delete confirmation dialog | 6 |

---

## Testing Strategy

No test framework for these controllers. Verification is manual per task:
- Backend tasks include a `node -e "require('./controller')"` smoke test to catch syntax/import errors
- Frontend tasks include a `tsc --noEmit` check
- Final integration verification (optional) documented at the end

---

### Task 1: Add `tokenRevocation` field to UnifiedToolConfig type

**Files:**
- Modify: `frontend/lib/tools/types.ts`

- [ ] **Step 1: Add the field to the interface**

In `frontend/lib/tools/types.ts`, find the `UnifiedToolConfig` interface. Locate the section that ends with toast-related fields. Add a new section before the closing brace:

Find:
```typescript
  // TOASTS
  connectingToast?: string
  connectedToast?: string
}
```

Replace with:
```typescript
  // TOASTS
  connectingToast?: string
  connectedToast?: string

  // DELETE FLOW
  tokenRevocation?: {
    /** true if the backend calls the provider's revocation API on delete. */
    automated: boolean
    /** Shown in the delete dialog when automated is false. Plain text with optional URLs. */
    manualStepsNote?: string
  }
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "lib/tools/types" | head -10`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/tools/types.ts
git commit -m "feat(tools): add tokenRevocation field to UnifiedToolConfig"
```

---

### Task 2: Populate `tokenRevocation` in all 9 configs

**Files:**
- Modify: all 9 files in `frontend/lib/tools/configs/`

Each config gets one additional field appended. The field is a single object literal; no other changes.

- [ ] **Step 1: Update 4 automated providers**

For each of these 4 files, append the `tokenRevocation` field before the closing `}` of the config object:

**File 1:** `frontend/lib/tools/configs/hubspot.ts` — add:
```typescript
  tokenRevocation: { automated: true },
```

**File 2:** `frontend/lib/tools/configs/quickbooks.ts` — add:
```typescript
  tokenRevocation: { automated: true },
```

**File 3:** `frontend/lib/tools/configs/fortnox.ts` — add:
```typescript
  tokenRevocation: { automated: true },
```

**File 4:** `frontend/lib/tools/configs/googleworkspace.ts` — add:
```typescript
  tokenRevocation: { automated: true },
```

For each, the field goes at the same level as `connectingToast` / `viewComponent` / etc., typically as the last property.

- [ ] **Step 2: Update Microsoft365 (manual steps needed)**

In `frontend/lib/tools/configs/microsoft365.ts`, append:
```typescript
  tokenRevocation: {
    automated: false,
    manualStepsNote: "Microsoft 365 tokens can't be revoked via API. To fully revoke access, visit https://myapps.microsoft.com, find this app, and click Remove.",
  },
```

- [ ] **Step 3: Update Shopify (manual steps needed)**

In `frontend/lib/tools/configs/shopify.ts`, append:
```typescript
  tokenRevocation: {
    automated: false,
    manualStepsNote: "To fully revoke access, uninstall the Effycion app from your Shopify admin under Settings → Apps and sales channels.",
  },
```

- [ ] **Step 4: Update 3 AI tools (API-key, no OAuth)**

**File 1:** `frontend/lib/tools/configs/openai.ts` — add:
```typescript
  tokenRevocation: {
    automated: false,
    manualStepsNote: "Your stored API key is deleted from our servers. To fully revoke access, also delete the admin key from your OpenAI dashboard.",
  },
```

**File 2:** `frontend/lib/tools/configs/anthropic.ts` — add:
```typescript
  tokenRevocation: {
    automated: false,
    manualStepsNote: "Your stored API key is deleted from our servers. To fully revoke access, also delete the admin key from your Anthropic console.",
  },
```

**File 3:** `frontend/lib/tools/configs/gemini.ts` — add:
```typescript
  tokenRevocation: {
    automated: false,
    manualStepsNote: "Your stored service-account JSON is deleted from our servers. To fully revoke access, also delete or disable the service account in Google Cloud Console.",
  },
```

- [ ] **Step 5: Verify TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "lib/tools/configs" | head -20`
Expected: zero errors in any config file.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/tools/configs/
git commit -m "feat(tools): populate tokenRevocation across all 9 configs"
```

---

### Task 3: Add `revokeFortnoxToken` function

**Files:**
- Modify: `backend/src/controllers/fortnoxController.js`

Fortnox uses RFC 7009 with Basic auth. The function needs `clientId` and `clientSecret` in addition to the refresh token.

- [ ] **Step 1: Add the function before `module.exports`**

In `backend/src/controllers/fortnoxController.js`, find the `module.exports = { ... }` block (currently at lines ~1187-1204). Immediately ABOVE that `module.exports`, add this function:

```javascript
async function revokeFortnoxToken(refreshToken, ctx = {}) {
  const endpoint = "revokeFortnoxToken"

  if (!refreshToken) {
    log("warn", endpoint, "No refresh token provided for revocation")
    return { success: false, error: "No refresh token" }
  }

  const { clientId, clientSecret } = ctx
  if (!clientId || !clientSecret) {
    log("warn", endpoint, "Missing client credentials for Fortnox revocation")
    return { success: false, error: "Missing client credentials" }
  }

  try {
    log("log", endpoint, "Revoking Fortnox refresh token...")

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
    const body = new URLSearchParams({
      token_type_hint: "refresh_token",
      token: refreshToken,
    }).toString()

    const response = await fetch("https://apps.fortnox.se/oauth-v1/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body,
    })

    if (response.ok || response.status === 204) {
      log("log", endpoint, "Fortnox token revoked successfully")
      return { success: true }
    } else {
      const errorText = await response.text()
      log("warn", endpoint, `Token revocation returned ${response.status}: ${errorText}`)
      return { success: false, error: errorText }
    }
  } catch (error) {
    log("error", endpoint, `Token revocation error: ${error.message}`)
    return { success: false, error: error.message }
  }
}
```

- [ ] **Step 2: Export the new function**

In the same file, find the `module.exports` block:

```javascript
module.exports = {
  startFortnoxOAuth,
  fortnoxOAuthCallback,
  syncFortnoxCustomers,
  getFortnoxCustomers,
  getFortnoxCompanyInfo,
  getFortnoxSettings,
  getFortnoxProfile,
  getFortnoxInvoices,
  getFortnoxSupplierInvoices,
  getFortnoxExpenses,
  getFortnoxVouchers,
  getFortnoxAccounts,
  getFortnoxArticles,
  getFortnoxSuppliers,
  analyzeFortnoxCostLeaks,
}
```

Add `revokeFortnoxToken` as a new entry. The exports become:

```javascript
module.exports = {
  startFortnoxOAuth,
  fortnoxOAuthCallback,
  syncFortnoxCustomers,
  getFortnoxCustomers,
  getFortnoxCompanyInfo,
  getFortnoxSettings,
  getFortnoxProfile,
  getFortnoxInvoices,
  getFortnoxSupplierInvoices,
  getFortnoxExpenses,
  getFortnoxVouchers,
  getFortnoxAccounts,
  getFortnoxArticles,
  getFortnoxSuppliers,
  analyzeFortnoxCostLeaks,
  revokeFortnoxToken,
}
```

- [ ] **Step 3: Verify the controller loads**

Run: `cd backend && node -e "require('./src/controllers/fortnoxController')"`
Expected: no output (success). Any output indicates a syntax or import error.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/fortnoxController.js
git commit -m "feat(tools): add revokeFortnoxToken helper for integration deletion"
```

---

### Task 4: Add `revokeGoogleWorkspaceToken` function

**Files:**
- Modify: `backend/src/controllers/googleWorkspaceController.js`

Google uses RFC 7009 with token in query string — simpler than Fortnox, no auth headers needed.

- [ ] **Step 1: Add the function before `module.exports`**

In `backend/src/controllers/googleWorkspaceController.js`, find `module.exports = { ... }` (currently at lines ~797-806). Immediately ABOVE that, add:

```javascript
async function revokeGoogleWorkspaceToken(refreshToken) {
  const endpoint = "revokeGoogleWorkspaceToken"

  if (!refreshToken) {
    log("warn", endpoint, "No refresh token provided for revocation")
    return { success: false, error: "No refresh token" }
  }

  try {
    log("log", endpoint, "Revoking Google Workspace refresh token...")

    const url = `https://accounts.google.com/o/oauth2/revoke?token=${encodeURIComponent(refreshToken)}`
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })

    if (response.ok || response.status === 204) {
      log("log", endpoint, "Google Workspace token revoked successfully")
      return { success: true }
    } else {
      const errorText = await response.text()
      log("warn", endpoint, `Token revocation returned ${response.status}: ${errorText}`)
      return { success: false, error: errorText }
    }
  } catch (error) {
    log("error", endpoint, `Token revocation error: ${error.message}`)
    return { success: false, error: error.message }
  }
}
```

- [ ] **Step 2: Export the new function**

In the same file, find `module.exports`:

```javascript
module.exports = {
  startGoogleWorkspaceOAuth,
  googleWorkspaceOAuthCallback,
  getGoogleWorkspaceUsers,
  getGoogleWorkspaceDomain,
  getGoogleWorkspaceGroups,
  getGoogleWorkspaceLicenses,
  getGoogleWorkspaceReports,
  analyzeGoogleWorkspaceCostLeaksEndpoint,
}
```

Add `revokeGoogleWorkspaceToken`:

```javascript
module.exports = {
  startGoogleWorkspaceOAuth,
  googleWorkspaceOAuthCallback,
  getGoogleWorkspaceUsers,
  getGoogleWorkspaceDomain,
  getGoogleWorkspaceGroups,
  getGoogleWorkspaceLicenses,
  getGoogleWorkspaceReports,
  analyzeGoogleWorkspaceCostLeaksEndpoint,
  revokeGoogleWorkspaceToken,
}
```

- [ ] **Step 3: Verify the controller loads**

Run: `cd backend && node -e "require('./src/controllers/googleWorkspaceController')"`
Expected: no output (success).

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/googleWorkspaceController.js
git commit -m "feat(tools): add revokeGoogleWorkspaceToken helper for integration deletion"
```

---

### Task 5: Replace HubSpot-only revocation with registry dispatch

**Files:**
- Modify: `backend/src/controllers/integrationController.js`

- [ ] **Step 1: Update imports at the top of the file**

Find the existing require statements near the top (around lines 1-8):

```javascript
const { supabase } = require("../config/supabase")
const { encryptIntegrationSettings, decryptIntegrationSettings, decryptOAuthData } = require("../utils/encryption")
const { revokeHubSpotToken } = require("./hubspotController")
```

Replace with:

```javascript
const { supabase } = require("../config/supabase")
const { encryptIntegrationSettings, decryptIntegrationSettings, decryptOAuthData } = require("../utils/encryption")
const { revokeHubSpotToken } = require("./hubspotController")
const { revokeQuickBooksToken } = require("./quickbooksController")
const { revokeFortnoxToken } = require("./fortnoxController")
const { revokeGoogleWorkspaceToken } = require("./googleWorkspaceController")

const REVOCATION_HANDLERS = {
  HubSpot: { fn: revokeHubSpotToken, needsCreds: false },
  QuickBooks: { fn: revokeQuickBooksToken, needsCreds: false },
  GoogleWorkspace: { fn: revokeGoogleWorkspaceToken, needsCreds: false },
  Fortnox: { fn: revokeFortnoxToken, needsCreds: true },
}
```

- [ ] **Step 2: Replace the HubSpot-only revocation block with registry dispatch**

In the `deleteIntegration` function, find the existing HubSpot-specific block:

```javascript
  // Revoke OAuth tokens before deleting (for HubSpot)
  if (integration.provider?.toLowerCase() === "hubspot") {
    try {
      const settings = decryptIntegrationSettings(integration.settings || {})
      const oauthData = decryptOAuthData(settings.oauth_data || {})
      const refreshToken = oauthData?.tokens?.refresh_token

      if (refreshToken) {
        log("log", endpoint, "Revoking HubSpot token before deletion...")
        await revokeHubSpotToken(refreshToken)
      }
    } catch (e) {
      log("warn", endpoint, `Could not revoke HubSpot token: ${e.message}`)
      // Continue with deletion even if revocation fails
    }
  }
```

Replace with:

```javascript
  // Revoke OAuth token with the provider before deleting (where supported).
  // Failures are non-fatal — the DB row is still deleted, and tokens expire naturally.
  const handler = REVOCATION_HANDLERS[integration.provider]
  if (handler) {
    try {
      const settings = decryptIntegrationSettings(integration.settings || {})
      const oauthData = decryptOAuthData(settings.oauth_data || {})
      const refreshToken = oauthData?.tokens?.refresh_token

      if (refreshToken) {
        log("log", endpoint, `Revoking ${integration.provider} token before deletion...`)
        const ctx = handler.needsCreds
          ? { clientId: settings.client_id, clientSecret: settings.client_secret }
          : {}
        await handler.fn(refreshToken, ctx)
      }
    } catch (e) {
      log("warn", endpoint, `Could not revoke ${integration.provider} token: ${e.message}`)
      // Continue with deletion even if revocation fails
    }
  }
```

- [ ] **Step 3: Verify the controller loads**

Run: `cd backend && node -e "require('./src/controllers/integrationController')"`
Expected: no output (success).

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/integrationController.js
git commit -m "refactor(tools): dispatch OAuth token revocation via registry on integration delete"
```

---

### Task 6: Redesign delete confirmation dialog

**Files:**
- Modify: `frontend/app/dashboard/tools/page.tsx`

The current dialog only says "This action cannot be undone." Replace with a richer version that reads `tokenRevocation` from the integration's config.

- [ ] **Step 1: Add AlertTriangle import if not present**

In `frontend/app/dashboard/tools/page.tsx`, check the existing lucide-react import block. If `AlertTriangle` is not already imported, add it. (Most likely already present from prior refactors — check first.)

Example of existing import:
```typescript
import {
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  // ... other icons
} from "lucide-react"
```

If `AlertTriangle` is missing, add it to this list. Do NOT duplicate the import.

- [ ] **Step 2: Replace the delete confirmation dialog JSX**

Find the existing delete confirmation Dialog (currently around lines 1000-1040). The current version looks like:

```typescript
<Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
  <DialogContent className="!bg-[#111113] !border-white/[0.08] text-white rounded-xl">
    <DialogHeader>
      <DialogTitle className="text-[16px] font-medium text-white">Delete Integration</DialogTitle>
      <DialogDescription className="text-[13px] text-white/35">
        Are you sure you want to delete {integrationToDelete?.tool_name}? This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => {
          setIsDeleteModalOpen(false)
          setIntegrationToDelete(null)
        }}
        className="border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg h-9 text-[13px]"
        disabled={isDeleting}
      >
        Cancel
      </Button>
      <Button
        onClick={handleDeleteConfirm}
        disabled={isDeleting}
        className="bg-red-500/90 hover:bg-red-500 text-white font-medium rounded-lg h-9 text-[13px]"
      >
        {isDeleting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Deleting...
          </>
        ) : (
          <>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete
          </>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Replace the ENTIRE Dialog with the more informative version:

```typescript
<Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
  <DialogContent className="!bg-[#111113] !border-white/[0.08] text-white rounded-xl max-w-md">
    <DialogHeader>
      <DialogTitle className="text-[16px] font-medium text-white">
        Delete {integrationToDelete?.tool_name}?
      </DialogTitle>
      <DialogDescription className="text-[13px] text-white/50 leading-relaxed">
        This will immediately:
      </DialogDescription>
    </DialogHeader>

    {(() => {
      const cfg = integrationToDelete ? getToolConfig(integrationToDelete.tool_name) : undefined
      const revocation = cfg?.tokenRevocation

      return (
        <div className="space-y-3 py-2">
          <ul className="space-y-1.5 text-[12.5px] text-white/60 pl-4">
            <li className="list-disc">Remove the integration from your dashboard</li>
            <li className="list-disc">Delete stored credentials and OAuth tokens on our servers</li>
            {revocation?.automated && (
              <li className="list-disc">
                Revoke the OAuth token with {cfg?.label || integrationToDelete?.tool_name}
              </li>
            )}
          </ul>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[11.5px] text-white/45 leading-relaxed">
              Your usage history and past cost analyses will be preserved and will reappear
              if you reconnect this tool later.
            </p>
          </div>

          {revocation && !revocation.automated && revocation.manualStepsNote && (
            <div className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400/80 shrink-0 mt-0.5" />
              <p className="text-[11.5px] text-amber-100/70 leading-relaxed">
                {revocation.manualStepsNote}
              </p>
            </div>
          )}
        </div>
      )
    })()}

    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => {
          setIsDeleteModalOpen(false)
          setIntegrationToDelete(null)
        }}
        className="border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg h-9 text-[13px]"
        disabled={isDeleting}
      >
        Cancel
      </Button>
      <Button
        onClick={handleDeleteConfirm}
        disabled={isDeleting}
        className="bg-red-500/90 hover:bg-red-500 text-white font-medium rounded-lg h-9 text-[13px]"
      >
        {isDeleting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Deleting...
          </>
        ) : (
          <>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete integration
          </>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Note: This uses `getToolConfig(integrationToDelete.tool_name)` — verify that `getToolConfig` is already imported from `@/lib/tools/registry` at the top of the file (it should be, from the prior HIGH-11 refactor). If not, add:

```typescript
import { getToolConfig, TOOL_REGISTRY } from "@/lib/tools/registry"
```

(Do NOT duplicate the import if `TOOL_REGISTRY` is already imported — just add `getToolConfig` to the existing import line.)

- [ ] **Step 3: Clean up the success toast (now that the dialog explains everything)**

Find the `handleDeleteConfirm` function. It currently has HubSpot-specific toast logic:

```typescript
const isHubSpot = integrationToDelete.tool_name?.toLowerCase() === "hubspot"
toast.success("Integration deleted successfully", {
  description: isHubSpot
    ? `${integrationToDelete.tool_name} has been removed and disconnected. You'll need to re-authorize when reconnecting.`
    : `${integrationToDelete.tool_name} has been removed from your account.`,
})
```

Replace with:

```typescript
toast.success("Integration deleted", {
  description: `${integrationToDelete.tool_name} has been removed. Reconnect anytime — your history is preserved.`,
})
```

The dialog already surfaced the "you'll need to re-authorize" info via `tokenRevocation.automated`, so the toast no longer needs to repeat it.

- [ ] **Step 4: Verify TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep "dashboard/tools/page" | head -20`
Expected: zero errors.

- [ ] **Step 5: Manual smoke check (optional but recommended)**

Start the dev server: `cd frontend && npm run dev`. Open the tools page. Click delete on any integration and confirm:
- Dialog shows the bulleted list of what's deleted
- If the tool's `tokenRevocation.automated` is true, the third bullet ("Revoke the OAuth token…") appears
- If `manualStepsNote` is set, the amber warning box appears
- Cancel button closes the dialog without action

Don't need to verify all 9 tools — spot-check 2-3 (e.g., Fortnox for automated, Shopify for manual note, OpenAI for API-key note).

- [ ] **Step 6: Commit**

```bash
git add frontend/app/dashboard/tools/page.tsx
git commit -m "feat(tools): redesign delete confirmation dialog driven by tokenRevocation config"
```

---

## Post-implementation verification (optional)

After all 6 tasks are committed, run a final TypeScript check:

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "(lib/tools|app/dashboard/tools|components/tools)" | head -20
```

Expected: zero errors in any tools-related file.

End-to-end manual test (requires dev accounts):
1. Connect Fortnox → confirm it lands → delete → verify `Revoking Fortnox token before deletion...` appears in backend logs
2. Connect Google Workspace → delete → verify revocation logged
3. Connect QuickBooks → delete → verify revocation logged
4. Connect Shopify → open delete dialog → verify amber manual-steps note appears → delete → no revocation call, integration gone

## Rollout

Single merge to main. No migrations. No feature flag. 6 atomic commits, each revertable.
