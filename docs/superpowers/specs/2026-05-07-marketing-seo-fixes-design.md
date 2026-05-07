# Marketing-Site SEO Fixes — Design Spec

**Date:** 2026-05-07
**Status:** Approved (audit-driven)
**Predecessor:** Audit run 2026-05-07 against `frontend/app/page.tsx` + `frontend/app/(marketing)/**`

## Goal

Eliminate the structural SEO problems discovered in the marketing-site audit so search engines see a single canonical site, every page emits correct schema, and Google's helpful-content classifier doesn't deprioritize the programmatic-SEO surface. Out of scope: building net-new content (8 missing integration landings, expanded blog, new comparison pages).

## Outcomes (definition of done)

- Every page resolves to a single canonical host (one of `https://www.efficyon.com` *or* `https://efficyon.com`, never both).
- The integrations hub does not advertise sub-pages that 404.
- Every public marketing page emits `BreadcrumbList` JSON-LD; benchmark pages emit `Dataset`; the listicle emits `ItemList` of `SoftwareApplication`; blog posts emit `Article` with a real `image`.
- Every page has a per-page Twitter card (mirrors OG) and a real OG image.
- All comparison page titles carry the current year.
- `/tools/[slug]` (50 pages) has tool-specific signals injected and per-category hand-authored intros — no longer 50 near-identical templated paragraph stacks.
- Each cluster page surfaces 2–3 contextual cross-cluster internal links via a shared component.

## Audit summary (input to this spec)

3 critical, 6 high, 8 medium, ~5 low findings. Full synthesis attached in PR description; the table below condenses the decisions.

| # | Problem | Decision |
|---|---|---|
| C1 | `metadataBase` is `efficyon.com`; `sitemap.ts` + `robots.ts` use `www.efficyon.com`; per-page `openGraph.url` mixes both. | **Pick `https://www.efficyon.com` as canonical** (matches sitemap + robots; cheaper to fix than retargeting sitemap+robots). Centralize in `frontend/lib/site.ts`. |
| C2 | Integrations hub advertises 12 "Live" providers + emits JSON-LD URLs; only 4 sub-pages exist. 8 produce 404s. | **Flip the 8 unbuilt providers to `status: "coming-soon"`.** Filter `coming-soon` out of JSON-LD `itemListElement`. Visually keep them on the hub as a separate "Shipping next" rail (so the marketing claim of breadth survives). Building the 8 missing landing pages is a separate workstream. |
| C3 | Homepage `app/page.tsx` is `"use client"`; falls back to root-layout default metadata; no homepage schema (`Organization`, `WebSite`). | **Convert homepage to a server-component shell** that imports a `homepage-client.tsx` island. Server shell exports `metadata` and renders JSON-LD (`Organization`, `WebSite` with `SearchAction`, `FAQPage`, `BreadcrumbList`). |
| H1 | 6 of 7 compare-page titles missing year ("Cleanshelf Alternative" with no 2026). | **Update titles to "Efficyon vs <X>: 2026 Comparison"** pattern; year sourced from a constant. Annual review reminder in `lib/site.ts`. |
| H2 | 3 benchmark pages missing `Dataset` schema. | **Add `Dataset` JSON-LD** with `variableMeasured`, `datePublished`, `dateModified`, `creator`, `distribution`. Use a generator in `lib/seo/jsonld.ts`. |
| H3 | `BreadcrumbList` missing on every hub + every sub-page. | **One generator** in `lib/seo/jsonld.ts`; called from each page. |
| H4 | `/tools/[slug]` (50 pages) reuses one 4-paragraph template with `${tool.name}` substitution; schema nests `SoftwareApplication` under `WebPage.about`. | (a) Extend `SaasToolData` with `marketPosition`, `commonPriceRange`, `signatureWastePattern`. (b) Hand-author one intro paragraph per **category** (~13 categories) and reuse across that category's tools. (c) Restructure schema so `SoftwareApplication` is primary, with `BreadcrumbList` alongside. |
| H5 | Blog `Article` schema has no `image`. | Add `image?: string` to `BlogPost`; populate per post; thread into `Article` schema + `openGraph.images`. |
| H6 | Best-tools listicle missing `ItemList` of `SoftwareApplication`; integrations hub `ItemList` items lack `description`. | Generate proper `ItemList` with embedded `SoftwareApplication` items. |
| M1 | No per-page Twitter card site-wide. | Helper `mirrorTwitter(og)` that returns a `twitter` block from an `openGraph` block. Call from every metadata. |
| M2 | OG images: only root has `/og-image.png`. | Use Next.js `opengraph-image.tsx` per-route convention. One template per cluster (homepage, features, integrations, compare, solutions, calculator, benchmarks, blog, tools). Dynamic for blog/[slug] + tools/[slug]. |
| M3 | Cross-cluster internal linking near zero. | Shared `<RelatedLinks variant="features" />` etc. component + manual editorial pass adds 2–3 in-body links per page. |
| M4 | 7 feature sub-pages have meta descriptions 126–145 chars, jargon-led. | Rewrite to 150–160 chars, slug-keyword first. |
| M5 | `solutions/page.tsx` description is 163 chars (over cap). | Trim. |
| M6 | Compare vs-pages have OG titles ≠ HTML titles. | Unify. |
| M7 | `/docs/integrations/[slug]` falls back to `doc.blurb` which can exceed 160 chars (Xero 180). | Add `metaDescription: string` field to `IntegrationDoc`; bespoke per integration, max 155. |
| M8 | Cleanshelf compare doesn't say acquisition year. | Add "in 2021". |

## File map

**Created (shared infra):**
- `frontend/lib/site.ts` — single source of truth: `SITE_URL`, `SITE_HOST`, `CURRENT_YEAR`, `absoluteUrl(path)`.
- `frontend/lib/seo/jsonld.ts` — generators: `breadcrumbList(items)`, `organizationLd()`, `websiteLd()`, `datasetLd(args)`, `articleLd(args)`, `softwareApplicationLd(args)`, `itemListLd(items)`, `faqPageLd(items)`.
- `frontend/lib/seo/metadata.ts` — `mirrorTwitter(og)` helper; `pageMetadata({ title, description, path, og })` convenience that fills in canonical + OG URL + Twitter card.
- `frontend/components/marketing/related-links.tsx` — `<RelatedLinks variant="features" | "compare" | "solutions" | "integrations" | "calculator" | "benchmarks" | "blog" | "tools" />` with cluster-aware link presets.

**Created (homepage shell):**
- `frontend/app/page-client.tsx` — the existing client homepage code, renamed.
- `frontend/app/page.tsx` — new server shell exporting metadata + rendering homepage JSON-LD + the client island.

**Created (OG images):**
- `frontend/app/(marketing)/features/opengraph-image.tsx`
- `frontend/app/(marketing)/integrations/opengraph-image.tsx`
- `frontend/app/(marketing)/compare/opengraph-image.tsx`
- `frontend/app/(marketing)/solutions/opengraph-image.tsx`
- `frontend/app/(marketing)/calculator/opengraph-image.tsx`
- `frontend/app/(marketing)/benchmarks/opengraph-image.tsx`
- `frontend/app/(marketing)/blog/opengraph-image.tsx`
- `frontend/app/(marketing)/tools/opengraph-image.tsx`
- `frontend/app/(marketing)/blog/[slug]/opengraph-image.tsx` (dynamic — pulls post title)
- `frontend/app/(marketing)/tools/[slug]/opengraph-image.tsx` (dynamic — pulls tool name + category)

**Modified:**
- `frontend/app/layout.tsx` — `metadataBase` flips to `https://www.efficyon.com`. Removes per-page hard-coded `https://efficyon.com`.
- `frontend/app/sitemap.ts` — uses `SITE_URL` from `lib/site.ts`.
- `frontend/app/robots.ts` — uses `SITE_URL` from `lib/site.ts`.
- All 50 marketing pages — replace hard-coded `https://www.efficyon.com` and `https://efficyon.com` with `absoluteUrl(...)`; replace bespoke metadata blocks with `pageMetadata({...})` calls; add `BreadcrumbList`; add Twitter card via mirror.
- `frontend/app/(marketing)/integrations/page.tsx` — add `status` filter; render "Live" + "Coming soon" rails separately; only emit "Live" providers in JSON-LD `itemListElement`.
- `frontend/app/(marketing)/integrations/page.tsx:23-108` — flip 8 providers to `status: "coming-soon"`.
- `frontend/lib/blog-data.ts` — add `image: string` field; populate for 14 posts.
- `frontend/lib/saas-tools-data.ts` — add `marketPosition: string`, `commonPriceRange: string`, `signatureWastePattern: string` (extend, don't replace existing fields).
- `frontend/lib/integration-docs.ts` — add `metaDescription: string` field; populate for 4 integrations.
- `frontend/app/(marketing)/tools/[slug]/page.tsx` — restructure schema (primary `SoftwareApplication`, sibling `BreadcrumbList`); rewrite `generateSeoContent` to use the new fields + per-category intro lookup.
- `frontend/app/(marketing)/tools/[slug]/category-intros.ts` — new helper exporting per-category intro paragraphs (one per category, ~13 categories).
- `frontend/app/(marketing)/blog/[slug]/page.tsx` — wire `image` into `openGraph.images` and `Article` schema; add `BreadcrumbList`.
- `frontend/app/(marketing)/compare/efficyon-vs-cleanshelf/page.tsx` — add "in 2021" to acquisition mention.
- All `compare/efficyon-vs-*` and `compare/best-saas-cost-optimization-tools` titles — append `2026` via `CURRENT_YEAR`.

## Decisions explained

### Why `https://www.efficyon.com` (with `www`) wins canonicalization
- Sitemap + robots already use `www`. Changing them is doable but means re-submission to Search Console; flipping `metadataBase` once is cheaper.
- The handful of per-page hard-coded `https://efficyon.com` strings are easier to hunt than the much larger set of `https://www.efficyon.com` strings.

### Why "Coming soon" beats stub pages for the 8 phantom integrations
- 8 thin stub pages would compound the programmatic-SEO problem flagged in H4.
- A "Shipping next" rail keeps the marketing claim of platform breadth without the 404s and without thin-content pollution.
- Real landing pages can be built per-integration as each backend integration ships (the Atlassian/Linear/Notion/Stripe/etc. workstream is already producing them).

### Why a server-shell homepage instead of `app/(home)` route group
- Lower-risk refactor: rename existing client code to `page-client.tsx`, drop in a 30-line server shell.
- Route groups would change the URL structure expectations of any analytics/A-B-test tooling.

### Why per-category intros (~13) instead of per-tool intros (~50)
- 50 hand-authored intros is two days of editorial. 13 is two hours.
- Categories already group tools that share a waste pattern (e.g., "design-collab tools" all have the same view-only-seat problem) — category-level signal is the right granularity.
- Combined with new tool-specific fields (`marketPosition`, `signatureWastePattern`), each page still ends up with ~70% unique paragraphs.

### Why a shared `<RelatedLinks>` over editorial-only links
- The audit found ~10–15 wasted contextual link slots per page. A shared component covers the structural baseline (e.g., features pages always link to compare + integrations + calculator) cheaply.
- The remaining editorial pass (2–3 in-body links per page) is then small enough to fit in a single PR.

## Out of scope

- **Building net-new pages** for the 8 phantom integrations. They become "Coming soon" until backend support exists.
- **Backlink campaigns / off-site SEO.**
- **Programmatic-SEO expansion** (more comparison pages, more tools, more benchmarks).
- **Core Web Vitals / performance work** — separate audit.
- **Translation / hreflang** — separate workstream.
- **Migrating from `www` to non-`www` (or vice versa) at the DNS / Vercel domain level.** Spec assumes Vercel already serves both and we're picking the canonical one for SEO purposes only.

## Risk & rollout

- **Schema regressions:** every page change touches JSON-LD. Mitigation: each task ends with `npm run build` + a manual check via Google's Rich Results Test on a representative URL of each cluster.
- **Domain flip:** flipping `metadataBase` while sitemap stays on `www` was the original bug. After this work, both are `www`. We do NOT change Vercel domain config; that should already redirect non-www → www (verify in Phase 1).
- **OG image misses:** the Next.js `opengraph-image.tsx` convention requires the file to be in the right route segment. If a child segment also defines one, the child wins — verify there are no conflicts.
- **Tools programmatic refactor:** if Google has already started deprioritizing the existing `/tools/[slug]` pages, recovery takes weeks. The fix should still be shipped — it stops the bleed.
- **Branch strategy:** ship as one branch, but commit per phase. Each phase is independently shippable; if a later phase causes regressions, earlier phases stay.

## Verification posture

No test runner exists per `CLAUDE.md`. Each task ends with one or more of:
- `cd frontend && npx tsc --noEmit` — type check.
- `cd frontend && npm run build` — production build (the real metadata evaluator).
- Browser visit of the changed page (`npm run dev`, then view-source / DevTools network).
- Google Rich Results Test on the deployed Vercel preview for representative URLs.
- A simple grep guard committed in Phase 0 (`scripts/check-canonical-urls.sh`) that fails CI if a hard-coded `https://efficyon.com` or `https://www.efficyon.com` string appears outside `lib/site.ts`.
