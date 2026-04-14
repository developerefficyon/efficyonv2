# AI Tool Integration Limit Enforcement — Design

**Date:** 2026-04-14
**Issue:** MEDIUM-14 from the tools tab audit (`docs/superpowers/specs/2026-04-13-tools-tab-audit.md`)
**Severity:** Bug — billing/plan bypass exposure

---

## Problem

Three AI-tool connection endpoints (`/api/integrations/openai/connect`, `/api/integrations/anthropic/connect`, `/api/integrations/gemini/connect`) insert rows into `company_integrations` without checking the company's subscription integration limit. A Free-tier user (max 2 integrations) could stack OpenAI + Anthropic + Gemini + Google Workspace + 2 generic OAuth integrations for 6 total, bypassing the limit enforced on `POST /api/integrations`.

Generic OAuth tools (Fortnox, Microsoft365, HubSpot, QuickBooks, Shopify) are protected because the frontend calls `POST /api/integrations` first, which enforces the limit in `upsertIntegrations()` at `integrationController.js:168-181`.

Google Workspace is **indirectly protected** — the frontend calls `POST /api/integrations` before OAuth start, so a row already exists with limit enforcement applied. But the OAuth start endpoint has no server-side guard against direct calls.

---

## Goals

1. Server-side enforcement of integration limits on all 3 AI connect endpoints.
2. No false limit errors when an existing user rotates an API key (reconnect flow must not trigger the limit).
3. 403 response shape consistent with existing `upsertIntegrations` so the frontend's 403 handling works without per-endpoint special-casing.
4. Optional: polish frontend toasts on the 3 AI tools to surface the limit-reached error like OAuth tools already do.

## Non-goals

- No changes to Free/Pro/Enterprise tier limits.
- No changes to the `getIntegrationLimits` public API (`GET /api/integrations/limits`).
- Not touching Google Workspace OAuth callback (already updates existing rows only).

---

## Architecture

### 1. Extract a reusable limit-check helper

Currently, `getIntegrationLimits(req, res)` in `integrationController.js` (lines 25-104) is an Express HTTP handler that both computes limits and sends the response. The computation logic is also duplicated inside `upsertIntegrations` (lines 146-183).

**Refactor:** Extract the pure computation into `checkIntegrationLimit(companyId)` exported from `integrationController.js`. It returns:

```javascript
{
  canAddMore: boolean,
  maxIntegrations: number,
  currentIntegrations: number,
  planName: string,
  planTier: string,
}
```

The existing `getIntegrationLimits` HTTP handler and `upsertIntegrations` both call the helper. No behavior change.

### 2. Guard AI controller connect functions

In `openaiUsageController.js`, `anthropicUsageController.js`, `geminiUsageController.js`, inside each `connect()` function, after resolving the company and determining whether a row already `existing`, add a limit check **only when no existing row** is found:

```javascript
if (!existing) {
  const limits = await checkIntegrationLimit(companyId)
  if (!limits.canAddMore) {
    return res.status(403).json({
      error: "Integration limit reached",
      message: `Your ${limits.planName} plan allows up to ${limits.maxIntegrations} integrations.`,
      maxIntegrations: limits.maxIntegrations,
    })
  }
}
```

This preserves the reconnect/key-rotation flow: if a user already has OpenAI connected and wants to rotate their admin key, the existing row is updated in place — no limit check.

### 3. Frontend polish (optional, included)

In `handleConnectOpenAI`, `handleConnectAnthropic`, `handleConnectGemini` (page.tsx lines ~1302-1549), after the failed fetch, add the same 403 handling the OAuth tools already have:

```javascript
if (res.status === 403 && data?.error === "Integration limit reached") {
  toast.error("Integration limit reached", {
    description: data.message || `Your plan allows up to ${data.maxIntegrations} integrations.`,
  })
  loadIntegrations()
  setIsConnecting(false)
  return
}
```

### 4. Google Workspace — no backend change

The frontend OAuth-start flow for Google Workspace goes through `POST /api/integrations` first, which enforces the limit. Backend OAuth callback only updates existing rows. A defensive backend check in `startGoogleWorkspaceOAuth` would be belt-and-suspenders, but it's out of scope for this fix — if needed later, track separately.

---

## Data Flow

### Before (bypass)
```
User → POST /api/integrations/openai/connect (api_key)
     → openaiConnect()
     → [no limit check]
     → INSERT into company_integrations
     → 200 OK
```

### After
```
User → POST /api/integrations/openai/connect (api_key)
     → openaiConnect()
     → checkIntegrationLimit(companyId)
     → [if at limit AND no existing row] → 403 { error: "Integration limit reached" }
     → [else] → INSERT / UPDATE as before → 200 OK
```

---

## Error Handling

- **At limit, new integration**: 403 with `{ error, message, maxIntegrations }`. Frontend shows "Integration limit reached" toast, refreshes limits cache.
- **At limit, existing integration (reconnect)**: Proceeds normally (not blocked).
- **`checkIntegrationLimit` throws**: Propagates to Express error middleware. Don't swallow.

---

## Testing Strategy

No unit test framework is currently set up for these controllers (no `*.test.js` files in `backend/src/controllers/`). Verification is manual:

1. **Limit-reached path**: On a Free-tier account with 2 integrations already, attempt to connect OpenAI. Expect 403 with the limit-reached error shape.
2. **Under-limit path**: On a Pro-tier account with 1 integration, connect OpenAI. Expect 200.
3. **Reconnect path**: With OpenAI already connected on a Free-tier account (current=2, max=2), submit a new admin key. Expect 200 (update, not blocked).
4. **Shape compatibility**: Compare the 403 body to what `upsertIntegrations` returns — must have the same `error` and `message` fields so the frontend's existing 403 branch works without per-tool forks.
5. **Same tests for Anthropic and Gemini** controllers.

If the team chooses to add tests as part of this work, use the existing assertion style in the codebase. No new test framework proposed.

---

## Files Changed

| File | Change |
|---|---|
| `backend/src/controllers/integrationController.js` | Extract `checkIntegrationLimit(companyId)` helper. Refactor `getIntegrationLimits` handler and `upsertIntegrations` to use it. |
| `backend/src/controllers/openaiUsageController.js` | Import `checkIntegrationLimit`. Call it inside `connect()` when `!existing`. Return 403 if at limit. |
| `backend/src/controllers/anthropicUsageController.js` | Same as OpenAI. |
| `backend/src/controllers/geminiUsageController.js` | Same as OpenAI. |
| `frontend/app/dashboard/tools/page.tsx` | Add 403 handling to `handleConnectOpenAI`, `handleConnectAnthropic`, `handleConnectGemini`. |

---

## Rollout

Single PR, merge to main. No migration, no feature flag needed. Any user currently above their plan limit stays there (we don't retroactively delete) but cannot add new AI integrations above the limit going forward.

---

## Audit Cross-Reference

This design addresses **MEDIUM-14** from `docs/superpowers/specs/2026-04-13-tools-tab-audit.md`. HIGH-11 (triple registry sync) is tracked separately.
