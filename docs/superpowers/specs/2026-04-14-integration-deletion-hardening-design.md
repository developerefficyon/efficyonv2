# Integration Deletion Hardening — Design

**Date:** 2026-04-14
**Scope:** Better delete-confirmation UX + OAuth token revocation for 3 additional providers
**Origin:** User follow-up to "what happens when I delete a tool" audit

---

## Problem

Two user-visible gaps in the integration deletion flow:

1. **Silent data preservation.** When a user deletes a tool, the confirmation dialog says only "This action cannot be undone." In reality, usage history (`openai_usage`, `anthropic_usage`, `gemini_usage`) persists indefinitely, and cost-leak analyses and recommendations are detached (FK set to NULL) but kept. Users aren't told.

2. **OAuth tokens leak on provider side.** Only HubSpot revokes its OAuth refresh token on delete. Fortnox, Microsoft 365, QuickBooks, Shopify, and Google Workspace all leave tokens active on the provider side until they expire naturally — a minor security/compliance gap.

## Goals

1. The delete confirmation dialog explicitly describes what's destroyed, what's preserved, and what the user may need to do manually.
2. Revocation is implemented server-side for every OAuth provider that supports it: adds Fortnox, Google Workspace (new functions), and QuickBooks (wire existing function to the delete flow).
3. For providers without a clean revocation API (Microsoft 365, Shopify), the UI gives the user clear instructions on how to revoke manually at the provider's portal.

## Non-goals

- No changes to the actual data preservation behavior. Usage history and analyses continue to be preserved — that's intentional, so users can reconnect without losing history. Out of scope: giving users a "purge everything" option.
- No changes to the AI-tool API-key flows (OpenAI, Anthropic, Gemini). Those aren't OAuth and don't have refresh tokens to revoke; the dialog just reminds users to rotate the key at the provider if they want to fully cut access.
- Not implementing Microsoft 365's `/me/revokeSignInSessions` — it revokes *all* Microsoft refresh tokens for the user across *all* apps, not just ours. Disproportionate side effect. Documented as a manual step instead.

---

## Research summary

Provider revocation API coverage (researched via provider docs, April 2026):

| Provider | Endpoint | Notes |
|---|---|---|
| HubSpot | `DELETE https://api.hubapi.com/oauth/v1/refresh-tokens/{token}` | Already implemented & wired |
| QuickBooks | `POST https://developer.api.intuit.com/v2/oauth2/tokens/revoke` with `{ token }` JSON body | Function exists (`revokeQuickBooksToken`) but not wired |
| Fortnox | `POST https://apps.fortnox.se/oauth-v1/revoke` with form body `token_type_hint=refresh_token&token={token}` + Basic auth header (`base64(client_id:client_secret)`) | New function |
| Google Workspace | `POST https://accounts.google.com/o/oauth2/revoke?token={token}` | Standard RFC 7009, no body or auth |
| Microsoft 365 | No standard revocation; only `POST /me/revokeSignInSessions` on Graph which affects all tokens for the user across all apps | Not implementing — manual step only |
| Shopify | No revocation API. Tokens invalidate only when merchant uninstalls app from store admin | Manual step only |

---

## Architecture

### Backend

**New per-provider revocation functions** (one each for Fortnox and Google Workspace). Each follows the existing pattern established by HubSpot and QuickBooks:

```js
async function revoke<Provider>Token(refreshToken, ctx = {}) {
  // returns { success, error? } — always non-fatal
}
```

Fortnox is the only one that needs extra context (client credentials for Basic auth), so its signature accepts `ctx.clientId` and `ctx.clientSecret`. Google Workspace and QuickBooks use `ctx = {}`.

**Registry of revocation handlers** in `integrationController.deleteIntegration`, replacing the current hardcoded HubSpot-only `if` block:

```js
const REVOCATION_HANDLERS = {
  HubSpot: { fn: require('./hubspotController').revokeHubSpotToken, needsCreds: false },
  QuickBooks: { fn: require('./quickbooksController').revokeQuickBooksToken, needsCreds: false },
  GoogleWorkspace: { fn: require('./googleWorkspaceController').revokeGoogleWorkspaceToken, needsCreds: false },
  Fortnox: { fn: require('./fortnoxController').revokeFortnoxToken, needsCreds: true },
}
```

Inside `deleteIntegration`:

```js
const handler = REVOCATION_HANDLERS[integration.provider]
if (handler) {
  try {
    const settings = decryptIntegrationSettings(integration.settings || {})
    const oauthData = decryptOAuthData(settings.oauth_data || {})
    const refreshToken = oauthData?.tokens?.refresh_token
    if (refreshToken) {
      const ctx = handler.needsCreds
        ? { clientId: settings.client_id, clientSecret: settings.client_secret }
        : {}
      await handler.fn(refreshToken, ctx)
    }
  } catch (e) {
    log("warn", endpoint, `Could not revoke ${integration.provider} token: ${e.message}`)
  }
}
```

Error handling stays non-fatal — a failed revocation call doesn't block the DB delete, matching the existing HubSpot behavior. The row is dropped regardless; worst case the token remains valid on the provider until natural expiry.

### Frontend

**Extend `UnifiedToolConfig`** with an optional field:

```ts
interface UnifiedToolConfig {
  // ... existing fields ...
  tokenRevocation?: {
    automated: boolean
    manualStepsNote?: string
  }
}
```

**Populate it across all 9 configs:**

| Tool | `automated` | `manualStepsNote` |
|---|---|---|
| HubSpot | `true` | — |
| QuickBooks | `true` | — |
| Fortnox | `true` | — |
| GoogleWorkspace | `true` | — |
| Microsoft365 | `false` | "Microsoft 365 tokens can't be revoked via API. To fully revoke access, visit [myapps.microsoft.com](https://myapps.microsoft.com), find this app, and click Remove." |
| Shopify | `false` | "To fully revoke access, uninstall the Effycion app from your Shopify admin under Settings → Apps and sales channels." |
| OpenAI | `false` | "Your stored API key is deleted from our servers. To fully revoke access, also delete the admin key from your OpenAI dashboard." |
| Anthropic | `false` | "Your stored API key is deleted from our servers. To fully revoke access, also delete the admin key from your Anthropic console." |
| Gemini | `false` | "Your stored service-account JSON is deleted from our servers. To fully revoke access, also delete or disable the service account in Google Cloud Console." |

**Replace the delete confirmation dialog** (currently in `frontend/app/dashboard/tools/page.tsx`, around lines 1000-1027) with a more informative version that reads from the integration's config:

```
Delete {Tool Name}?

This will immediately:
• Remove the integration from your dashboard
• Delete stored credentials and OAuth tokens (on our side)
{if tokenRevocation.automated: }• Revoke the OAuth token with {Provider}

Your usage history and past analyses will be preserved and 
will reappear if you reconnect this tool later.

{if tokenRevocation.manualStepsNote: }⚠ {manualStepsNote}

[Cancel]  [Delete integration]
```

## Data flow

### OAuth delete (example: Fortnox)

1. User clicks Delete on Fortnox card, confirms in dialog
2. Frontend `DELETE /api/integrations/:id`
3. `deleteIntegration` fetches row, detects `provider === "Fortnox"`, looks up `REVOCATION_HANDLERS.Fortnox`
4. Decrypts settings + oauth_data → extracts `refresh_token`, `client_id`, `client_secret`
5. Calls `revokeFortnoxToken(refresh_token, { clientId, clientSecret })`
6. Fortnox replies `{"revoked":true}` (or non-200 — logged, non-fatal)
7. Supabase `.delete()` removes the row
8. Frontend reloads list and closes modal

### API-key delete (example: OpenAI)

Same as before — no revocation step. `REVOCATION_HANDLERS` doesn't have an OpenAI entry, so the handler block is skipped and the row is dropped. The dialog's `manualStepsNote` reminded the user to rotate on OpenAI's side.

### Manual-steps delete (example: Shopify)

Same as API-key — no revocation step. Dialog flagged the uninstall step for the user to follow.

## Error handling

- **Revocation HTTP error (4xx/5xx)**: logged as warn, integration still deleted.
- **Decryption failure on settings**: logged as warn, revocation skipped, integration still deleted.
- **Missing refresh_token**: silent skip, integration still deleted.
- **Frontend delete fails (network/500)**: existing error toast behavior unchanged.

## Testing

No test framework for these controllers. Manual verification:

1. Connect each OAuth tool against a dev account
2. Open the delete dialog — verify the copy matches the config (automated bullet visible for 4 providers, manual warning visible for MS365/Shopify/AI tools)
3. Confirm delete for each automated provider — verify the revocation request fires (inspect backend logs), integration is gone from the list
4. For Fortnox: verify Basic auth header is correct format (`Basic <base64>`), Fortnox returns `{"revoked":true}`
5. For Google Workspace: verify `?token=` query-param format, accepts 200
6. Attempt deletion with a deliberately-broken refresh token — verify the backend logs a warning and still drops the row

## Files changed

| File | Change | LoC est. |
|---|---|---|
| `frontend/lib/tools/types.ts` | Add `tokenRevocation` field to `UnifiedToolConfig` | +6 |
| `frontend/lib/tools/configs/*.ts` (9 files) | Populate `tokenRevocation` per tool | +3/file = +27 |
| `frontend/app/dashboard/tools/page.tsx` | Redesign delete confirmation dialog | +60 / -25 |
| `backend/src/controllers/fortnoxController.js` | Add `revokeFortnoxToken` + export | +40 |
| `backend/src/controllers/googleWorkspaceController.js` | Add `revokeGoogleWorkspaceToken` + export | +30 |
| `backend/src/controllers/integrationController.js` | Replace HubSpot-only block with registry dispatch | +20 / -15 |

**Total: ~210 lines added, ~40 removed.** Single PR, no migrations, no breaking changes.

## Rollout

Single merge to main. All changes are additive. Users with existing integrations see no difference until their next delete action.

Rollback: clean `git revert` of the merge commit. No DB state touched.

## Follow-up ideas (not in scope)

- **Shopify uninstall webhook**: if we ever register as a proper Shopify app, the `app/uninstalled` webhook would let us auto-clean on the merchant side.
- **Microsoft 365 graph consent removal**: technically possible via an admin API call, but requires `AppRoleAssignment.ReadWrite.All` — excessive scope for a deletion feature.
- **Audit log**: separate project. Would log each revocation attempt (success/failure) for compliance.
