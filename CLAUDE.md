# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Efficyon v2 is a B2B SaaS that detects cost leaks and analyzes software spend. It ingests data from integrations (Fortnox, Microsoft 365, HubSpot, QuickBooks, Shopify, Google Workspace) and API-consumption platforms (OpenAI, Anthropic, Gemini), runs rule-based + AI analyses, and presents findings / recommendations / renewals / monthly reports.

The repo is a two-app monorepo: `frontend/` (Next.js) and `backend/` (Express). There is no top-level package manager — each app is installed and run independently.

## Commands

```bash
# Backend (Express 5, Node, CommonJS). Runs on :4000.
cd backend
npm install
npm run dev                       # node src/server.js (no nodemon)
npm run seed                      # scripts/seed.js — baseline seed
npm run seed:staging              # staging seed
npm run seed:fortnox              # Fortnox sample data
npm run seed:fortnox-accounts
npm run seed:fortnox-invoices
npm run seed:fortnox-supplier-invoices
npm run cleanup:fortnox-supplier-invoices
npm run check:admin               # diagnostic: verify admin user

# Frontend (Next.js 16, React 19, TypeScript, Tailwind v4). Runs on :3000.
cd frontend
npm install                       # pnpm-lock.yaml is also present; prefer whatever lockfile is committed
npm run dev
npm run build
npm run start
npm run lint                      # next lint
```

There is **no test runner** configured in either app (`backend/package.json` test script exits with error; frontend has none). Don't fabricate test commands — verify by running the dev servers and exercising the feature.

TypeScript build errors are silently ignored in production (`frontend/next.config.mjs` sets `typescript.ignoreBuildErrors: true`). Run `tsc --noEmit` manually from `frontend/` if you need real type-checking; `next build` will not catch type errors.

## Architecture Big Picture

### Backend request flow

`backend/src/server.js` → `app.js` (CORS, JSON body parser with 50MB limit, raw body bypass for Stripe webhook) → `routes/index.js` (single flat router file — all routes registered there, ~630 lines) → controllers → services → Supabase.

Three middleware layers, applied per-route:
- `requireAuth` (`middleware/auth.js`): verifies JWT using `AUTH_SECRET` via `jose`, populates `req.user`.
- `requireRole("owner", "editor", "viewer")` (`middleware/requireRole.js`): looks up `team_members.role` for the user's company. **Solo users (no `company_id`) are auto-granted `owner`**; company creators without a `team_members` row are also bootstrap-granted `owner`. Not using Supabase RLS for this — enforcement lives in this middleware.
- `requireAdmin` (`middleware/requireAdmin.js`): gates the `/api/test/*` internal testing system.

The route file is the canonical registry of every endpoint — when adding a feature, wire the new route there rather than creating sub-routers.

### Schedulers

`server.js` boots three `node-cron` schedulers after the HTTP listener:
- `agentScheduler` — runs internal test agents on schedules defined in `agent_schedules` table.
- `monthlyReportScheduler` — generates `monthly_snapshots` + emails reports on the 1st.
- `openaiSyncScheduler` — background backfills OpenAI admin-key usage (and similar for Anthropic/Gemini).

Scheduler failures are caught and logged — they never crash the server.

### Two distinct analysis storage systems

This is easy to get wrong:
- **`cost_leak_analyses`** — stores cost-leak runs for data-source integrations (Fortnox, M365, HubSpot, QuickBooks, Shopify, GoogleWorkspace). Written by `analysisHistoryController.saveAnalysis`. Powers the dashboard History tab and `/api/analysis-history`.
- **`usage_summaries`** (migration `041_usage_summaries.sql`) — stores AI-generated narrative summaries for API-consumption tools (OpenAI, Anthropic, Gemini). Written by `usageSummaryController.generateAndSaveUsageSummary`. **These are intentionally NOT cost-leak analyses** and don't appear in the standard history endpoint.

The split matters: "integration X doesn't save to history" usually means it's an API-consumption tool writing to `usage_summaries`, or the frontend isn't calling the correct save endpoint after running the analysis. Check which of the two paths the integration is supposed to use before debugging.

### Integration controllers

Each provider has its own controller (`fortnoxController`, `microsoft365Controller`, `hubspotController`, `quickbooksController`, `shopifyController`, `googleWorkspaceController`) plus a matching cost-leak service in `services/<provider>CostLeakAnalysis.js`. AI-consumption tools (`openaiUsageController`, `anthropicUsageController`, `geminiUsageController`) follow a `connect / disconnect / sync / getUsage / getStatus` shape and pair with `services/<provider>CostAnalysis.js`.

Recommendations for all data-source integrations are served by a single shared `recommendationController` — every integration's `/recommendations*` routes point to the same handlers, differentiating by provider/integration id in the query.

### Frontend tool system (single-source-of-truth)

Per `frontend/lib/tools/registry.ts`, adding a new integration to the dashboard is a 3-step drop-in:
1. Create `lib/tools/configs/<name>.ts` exporting a `UnifiedToolConfig` (auth type, endpoints, view component, `analysisType: "cost-leak" | "usage"`, etc.).
2. Register it in `TOOL_REGISTRY` in `registry.ts`.
3. Create `components/tools/<name>-view.tsx` for the data tab and reference it in the config.

The dashboard detail page at `app/dashboard/tools/[id]/page.tsx` and the shared tabs (`components/tools/tool-detail-tabs.tsx`, `overview-tab.tsx`, `analysis-tab.tsx`, `history-tab.tsx`, `data-tab.tsx`) read config-driven fields and render accordingly — do not fork the page per-provider. `analysisType` drives whether Analysis tab renders cost-leak findings or usage summaries.

### Frontend auth

`frontend/middleware.ts` uses `next-auth` v5 (`auth` helper) to gate `/dashboard/*` and `/onboarding/*`. Public paths are hard-coded in the middleware. Supabase client is in `lib/supabaseClient.ts` but auth state flows through NextAuth (`lib/auth.ts`), not Supabase Auth directly.

Path alias `@/*` resolves to the frontend root.

### Database

Supabase/Postgres. Migrations are flat `.sql` files in `backend/sql/` numbered `000_` to `041_` — apply in order. There is no migration runner; files are executed manually against the Supabase project. `backend/src/migrations/` contains one standalone migration (`create_cost_leak_analyses_table.sql`) — prefer `backend/sql/` for new migrations to keep numbering contiguous.

## Conventions That Bite

- **Backend is CommonJS JavaScript, frontend is TypeScript.** Don't try to `import` in backend files.
- **No RLS** — access control is entirely in `requireAuth` + `requireRole`. Never ship a route without both (or `requireAdmin` for test endpoints).
- **Stripe webhook must stay on raw body.** `app.js` explicitly skips JSON parsing for `/api/stripe/webhook` and the route uses `express.raw`. Don't add JSON middleware above it.
- **`apiController.js.backup`** exists as a legacy dump (~4000 lines). It is NOT wired up — controllers have been split into per-domain files. Don't reintroduce routes pointing at it.
- **Solo-user vs team bootstrap** in `requireRole` means profiles without `company_id` still pass role checks. Account for this when testing authorization.
- Environment variables: see `backend/env.example.backend.txt`. Required at minimum — `AUTH_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and provider-specific OAuth creds per integration you're touching.

## Additional Docs

- `CODEBASE_ANALYSIS.md` — broader business/architecture context (some pricing/tiers now outdated).
- `Claude_Agents_Flow.md` / `Integration_Terminal.md` — design notes for the internal `/api/test/*` testing system (mock data, stress tests, analysis scoring, improvement cycle).
- `docs/development-plan.md` — recurring-value engine roadmap (monthly reports, renewals, savings tracking).
- `docs/cost-analysis-integrations.md` — notes on the AI-consumption integration pattern.
