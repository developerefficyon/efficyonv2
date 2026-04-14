# AI Tool Limit Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-side integration limit enforcement to the 3 AI tool connect endpoints (OpenAI, Anthropic, Gemini) so free-tier users cannot bypass the integration cap.

**Architecture:** Import the existing `getIntegrationLimits(userId)` helper from `integrationController.js` into each AI controller. Before a new INSERT (only when no existing row), check `canAddMore` and return 403 with the same error shape as `upsertIntegrations`. Add matching 403 handling to the 3 frontend connect handlers so the "limit reached" toast surfaces correctly.

**Tech Stack:** Node.js (Express), Supabase, Next.js 14, React, TypeScript

---

## Spec Deviation from Design

The design spec (Section "Architecture → 1. Extract a reusable limit-check helper") assumed `getIntegrationLimits` needed refactoring. Investigation shows it's **already a pure helper** exported from `integrationController.js` — no refactor needed. Task 1 from the spec is dropped. Remaining work is 4 tasks.

---

## File Map

| File | Change |
|---|---|
| `backend/src/controllers/openaiUsageController.js` | Add limit check before INSERT branch in `connect()` |
| `backend/src/controllers/anthropicUsageController.js` | Same as OpenAI |
| `backend/src/controllers/geminiUsageController.js` | Same as OpenAI |
| `frontend/app/dashboard/tools/page.tsx` | Add 403 handling to `handleConnectOpenAI`, `handleConnectAnthropic`, `handleConnectGemini` |

---

## Testing Strategy

This codebase has no test framework set up for controllers. The plan uses **manual verification** per the spec. Each backend task includes a verification step using a one-off Node script that exercises the controller path directly against a test company. The frontend task uses visual verification in the dev server.

---

### Task 1: Add limit check to OpenAI connect

**Files:**
- Modify: `backend/src/controllers/openaiUsageController.js:1-15,39-101`

**Audit ref:** MEDIUM-14 part 1/4

- [ ] **Step 1: Add import for `getIntegrationLimits`**

In `backend/src/controllers/openaiUsageController.js`, find the imports block at the top (lines 10-14):

```javascript
const { supabase } = require("../config/supabase")
const { encrypt, decrypt } = require("../utils/encryption")
const {
  validateAdminKey,
  syncCompanyUsage,
} = require("../services/openaiCostAnalysis")
```

Add one more require after the last import, before the `const PROVIDER = "OpenAI"` line:

```javascript
const { supabase } = require("../config/supabase")
const { encrypt, decrypt } = require("../utils/encryption")
const {
  validateAdminKey,
  syncCompanyUsage,
} = require("../services/openaiCostAnalysis")
const { getIntegrationLimits } = require("./integrationController")
```

- [ ] **Step 2: Insert limit check before the INSERT branch**

In the same file, find the `connect()` function. Locate the existing `Upsert` block (lines 61-89):

```javascript
    // Upsert: one OpenAI integration per company
    const { data: existing } = await supabase
      .from("company_integrations")
      .select("id")
      .eq("company_id", companyId)
      .eq("provider", PROVIDER)
      .maybeSingle()

    let integrationId
    if (existing) {
      const { error } = await supabase
        .from("company_integrations")
        .update({ settings, status: "active", updated_at: new Date().toISOString() })
        .eq("id", existing.id)
      if (error) throw new Error(error.message)
      integrationId = existing.id
    } else {
      const { data, error } = await supabase
```

Replace with (inserting the limit check inside the `else` branch, before the INSERT):

```javascript
    // Upsert: one OpenAI integration per company
    const { data: existing } = await supabase
      .from("company_integrations")
      .select("id")
      .eq("company_id", companyId)
      .eq("provider", PROVIDER)
      .maybeSingle()

    let integrationId
    if (existing) {
      const { error } = await supabase
        .from("company_integrations")
        .update({ settings, status: "active", updated_at: new Date().toISOString() })
        .eq("id", existing.id)
      if (error) throw new Error(error.message)
      integrationId = existing.id
    } else {
      // Enforce subscription integration limit on new connections (reconnects/key-rotations skip this)
      const limits = await getIntegrationLimits(user.id)
      if (!limits.canAddMore) {
        log("warn", endpoint, `Integration limit reached: ${limits.currentIntegrations}/${limits.maxIntegrations}`)
        return res.status(403).json({
          error: "Integration limit reached",
          message: `Your ${limits.planName} plan allows up to ${limits.maxIntegrations} integrations. You currently have ${limits.currentIntegrations} connected.`,
          currentIntegrations: limits.currentIntegrations,
          maxIntegrations: limits.maxIntegrations,
          planTier: limits.planTier,
          planName: limits.planName,
        })
      }

      const { data, error } = await supabase
```

- [ ] **Step 3: Verify backend starts without errors**

Run: `cd backend && node -e "require('./src/controllers/openaiUsageController')"`
Expected: No output (success). If the controller has a syntax error or circular require issue, this will throw.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/openaiUsageController.js
git commit -m "fix: enforce integration limit on OpenAI connect (MEDIUM-14)"
```

---

### Task 2: Add limit check to Anthropic connect

**Files:**
- Modify: `backend/src/controllers/anthropicUsageController.js:1-31,33-91`

**Audit ref:** MEDIUM-14 part 2/4

- [ ] **Step 1: Add import for `getIntegrationLimits`**

In `backend/src/controllers/anthropicUsageController.js`, find the imports (lines 6-11):

```javascript
const { supabase } = require("../config/supabase")
const { encrypt, decrypt } = require("../utils/encryption")
const {
  validateAdminKey,
  syncCompanyUsage,
} = require("../services/anthropicCostAnalysis")
```

Add after the last import:

```javascript
const { supabase } = require("../config/supabase")
const { encrypt, decrypt } = require("../utils/encryption")
const {
  validateAdminKey,
  syncCompanyUsage,
} = require("../services/anthropicCostAnalysis")
const { getIntegrationLimits } = require("./integrationController")
```

- [ ] **Step 2: Insert limit check before the INSERT branch**

In the same file, find the `connect()` function's upsert block (around lines 52-80):

```javascript
    const { data: existing } = await supabase
      .from("company_integrations")
      .select("id")
      .eq("company_id", companyId)
      .eq("provider", PROVIDER)
      .maybeSingle()

    let integrationId
    if (existing) {
      const { error } = await supabase
        .from("company_integrations")
        .update({ settings, status: "active", updated_at: new Date().toISOString() })
        .eq("id", existing.id)
      if (error) throw new Error(error.message)
      integrationId = existing.id
    } else {
      const { data, error } = await supabase
```

Replace with:

```javascript
    const { data: existing } = await supabase
      .from("company_integrations")
      .select("id")
      .eq("company_id", companyId)
      .eq("provider", PROVIDER)
      .maybeSingle()

    let integrationId
    if (existing) {
      const { error } = await supabase
        .from("company_integrations")
        .update({ settings, status: "active", updated_at: new Date().toISOString() })
        .eq("id", existing.id)
      if (error) throw new Error(error.message)
      integrationId = existing.id
    } else {
      // Enforce subscription integration limit on new connections (reconnects/key-rotations skip this)
      const limits = await getIntegrationLimits(user.id)
      if (!limits.canAddMore) {
        log("warn", endpoint, `Integration limit reached: ${limits.currentIntegrations}/${limits.maxIntegrations}`)
        return res.status(403).json({
          error: "Integration limit reached",
          message: `Your ${limits.planName} plan allows up to ${limits.maxIntegrations} integrations. You currently have ${limits.currentIntegrations} connected.`,
          currentIntegrations: limits.currentIntegrations,
          maxIntegrations: limits.maxIntegrations,
          planTier: limits.planTier,
          planName: limits.planName,
        })
      }

      const { data, error } = await supabase
```

- [ ] **Step 3: Verify the controller loads**

Run: `cd backend && node -e "require('./src/controllers/anthropicUsageController')"`
Expected: No output.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/anthropicUsageController.js
git commit -m "fix: enforce integration limit on Anthropic connect (MEDIUM-14)"
```

---

### Task 3: Add limit check to Gemini connect

**Files:**
- Modify: `backend/src/controllers/geminiUsageController.js:1-35,37-118`

**Audit ref:** MEDIUM-14 part 3/4

- [ ] **Step 1: Add import for `getIntegrationLimits`**

In `backend/src/controllers/geminiUsageController.js`, find the imports (lines 10-15):

```javascript
const { supabase } = require("../config/supabase")
const { encrypt, decrypt } = require("../utils/encryption")
const {
  validateServiceAccount,
  syncCompanyUsage,
} = require("../services/geminiCostAnalysis")
```

Add after the last import:

```javascript
const { supabase } = require("../config/supabase")
const { encrypt, decrypt } = require("../utils/encryption")
const {
  validateServiceAccount,
  syncCompanyUsage,
} = require("../services/geminiCostAnalysis")
const { getIntegrationLimits } = require("./integrationController")
```

- [ ] **Step 2: Insert limit check before the INSERT branch**

In the same file, find the `connect()` function's upsert block (around lines 74-103):

```javascript
    const { data: existing } = await supabase
      .from("company_integrations")
      .select("id")
      .eq("company_id", companyId)
      .eq("provider", PROVIDER)
      .maybeSingle()

    let integrationId
    if (existing) {
      const { error } = await supabase
        .from("company_integrations")
        .update({ settings, status: "active", updated_at: new Date().toISOString() })
        .eq("id", existing.id)
      if (error) throw new Error(error.message)
      integrationId = existing.id
    } else {
      const { data, error } = await supabase
```

Replace with:

```javascript
    const { data: existing } = await supabase
      .from("company_integrations")
      .select("id")
      .eq("company_id", companyId)
      .eq("provider", PROVIDER)
      .maybeSingle()

    let integrationId
    if (existing) {
      const { error } = await supabase
        .from("company_integrations")
        .update({ settings, status: "active", updated_at: new Date().toISOString() })
        .eq("id", existing.id)
      if (error) throw new Error(error.message)
      integrationId = existing.id
    } else {
      // Enforce subscription integration limit on new connections (reconnects/key-rotations skip this)
      const limits = await getIntegrationLimits(user.id)
      if (!limits.canAddMore) {
        log("warn", endpoint, `Integration limit reached: ${limits.currentIntegrations}/${limits.maxIntegrations}`)
        return res.status(403).json({
          error: "Integration limit reached",
          message: `Your ${limits.planName} plan allows up to ${limits.maxIntegrations} integrations. You currently have ${limits.currentIntegrations} connected.`,
          currentIntegrations: limits.currentIntegrations,
          maxIntegrations: limits.maxIntegrations,
          planTier: limits.planTier,
          planName: limits.planName,
        })
      }

      const { data, error } = await supabase
```

- [ ] **Step 3: Verify the controller loads**

Run: `cd backend && node -e "require('./src/controllers/geminiUsageController')"`
Expected: No output.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/geminiUsageController.js
git commit -m "fix: enforce integration limit on Gemini connect (MEDIUM-14)"
```

---

### Task 4: Surface the 403 error in the frontend for OpenAI, Anthropic, Gemini

**Files:**
- Modify: `frontend/app/dashboard/tools/page.tsx` — three functions: `handleConnectOpenAI`, `handleConnectAnthropic`, `handleConnectGemini`

**Audit ref:** MEDIUM-14 part 4/4

- [ ] **Step 1: Update `handleConnectOpenAI`**

In `frontend/app/dashboard/tools/page.tsx`, find the OpenAI handler's error-check block (currently around lines 1303-1305):

```typescript
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || "Failed to connect OpenAI")
    }
```

Replace with:

```typescript
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      // Surface plan-limit errors the same way OAuth flows do
      if (res.status === 403 && data?.error === "Integration limit reached") {
        toast.error("Integration limit reached", {
          description: data.message || `Your plan allows up to ${data.maxIntegrations} integrations.`,
        })
        loadIntegrations()
        return
      }
      throw new Error(data.error || "Failed to connect OpenAI")
    }
```

- [ ] **Step 2: Update `handleConnectAnthropic`**

Find the Anthropic handler's equivalent error-check block (currently around lines 1354-1356):

```typescript
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || "Failed to connect Anthropic")
    }
```

Replace with:

```typescript
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 403 && data?.error === "Integration limit reached") {
        toast.error("Integration limit reached", {
          description: data.message || `Your plan allows up to ${data.maxIntegrations} integrations.`,
        })
        loadIntegrations()
        return
      }
      throw new Error(data.error || "Failed to connect Anthropic")
    }
```

- [ ] **Step 3: Update `handleConnectGemini`**

Find the Gemini handler's equivalent error-check block (currently around lines 1498-1500):

```typescript
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || "Failed to connect Gemini")
    }
```

Replace with:

```typescript
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 403 && data?.error === "Integration limit reached") {
        toast.error("Integration limit reached", {
          description: data.message || `Your plan allows up to ${data.maxIntegrations} integrations.`,
        })
        loadIntegrations()
        return
      }
      throw new Error(data.error || "Failed to connect Gemini")
    }
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E "dashboard/tools/page|error TS" | head -20`
Expected: No new errors in `page.tsx` introduced by these changes.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/dashboard/tools/page.tsx
git commit -m "fix: surface 403 limit-reached errors for OpenAI/Anthropic/Gemini connect (MEDIUM-14)"
```

---

## Manual Verification (after all 4 tasks)

Run through these scenarios on a dev environment with access to a Free-tier test account:

1. **Limit-reached, new integration**
   - On a Free-tier account (max=2) with 2 integrations already connected
   - Click "Connect OpenAI" with a valid `sk-admin-...` admin key
   - **Expect:** "Integration limit reached" toast appears; no row inserted; status code 403 visible in Network tab
   - **Repeat** for Anthropic and Gemini

2. **Under-limit, new integration**
   - On a Pro-tier account (max higher than current count)
   - Connect OpenAI with a valid admin key
   - **Expect:** Success toast "OpenAI connected"; row inserted; 200 status

3. **Reconnect / key rotation**
   - On a Free-tier account that already has OpenAI connected (so current=max=2)
   - Re-submit a new admin key via the same form
   - **Expect:** Success — the existing row is updated; no 403 error. This proves the `if (existing)` branch is not blocked.

4. **403 shape compatibility**
   - Trigger the limit-reached scenario
   - Inspect the response body in DevTools Network tab
   - **Expect:** Body has `{ error: "Integration limit reached", message: "...", currentIntegrations, maxIntegrations, planTier, planName }` — same shape as what `POST /api/integrations` returns

---

## Rollout

Single merge to `main`. No feature flag. No migration. Users currently above their plan limit are grandfathered (we don't retroactively delete) but cannot add more AI integrations until they're under the cap.
