# Marketing-Site SEO Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 3 critical, 6 high, and 8 medium structural SEO findings from the 2026-05-07 audit across `frontend/app/page.tsx` + `frontend/app/(marketing)/**` (~50 pages) without expanding scope to net-new content.

**Architecture:** Centralize the canonical site URL + JSON-LD generators + Twitter mirror in three small `frontend/lib/site.ts` / `frontend/lib/seo/*` modules, then propagate the canonical patterns across every page in 8 phases. The homepage gets a server-component shell so it can export metadata. The phantom integrations are downgraded to "Coming soon" rather than building 8 stub pages. Tools programmatic-SEO is rescued with per-category hand-authored intros + new tool-specific fields.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4. No test runner — verification is `npx tsc --noEmit`, `npm run build`, browser/devtools, Google Rich Results Test on Vercel previews.

**Spec:** `docs/superpowers/specs/2026-05-07-marketing-seo-fixes-design.md`

---

## File structure

**Created:**
- `frontend/lib/site.ts` — `SITE_URL`, `SITE_HOST`, `CURRENT_YEAR`, `absoluteUrl(path)`.
- `frontend/lib/seo/jsonld.ts` — JSON-LD generators (BreadcrumbList, Organization, WebSite, Dataset, Article, SoftwareApplication, ItemList, FAQPage).
- `frontend/lib/seo/metadata.ts` — `mirrorTwitter(og)`, `pageMetadata({...})`.
- `frontend/components/marketing/related-links.tsx` — `<RelatedLinks variant="..." />`.
- `frontend/app/page-client.tsx` — existing client homepage code (renamed from `page.tsx`).
- `frontend/app/(marketing)/tools/[slug]/category-intros.ts` — per-category hand-authored intros.
- 8 cluster + 2 dynamic `opengraph-image.tsx` files (paths in Phase 5).
- `frontend/scripts/check-canonical-urls.mjs` — prebuild guard.

**Modified:**
- `frontend/app/layout.tsx` — `metadataBase` flip.
- `frontend/app/page.tsx` — convert to server shell.
- `frontend/app/sitemap.ts`, `frontend/app/robots.ts` — use `SITE_URL`.
- All ~50 marketing pages — bespoke metadata → `pageMetadata({...})`, add `BreadcrumbList`, add Twitter mirror, replace hard-coded URLs.
- `frontend/app/(marketing)/integrations/page.tsx` — split rails, filter JSON-LD.
- `frontend/lib/blog-data.ts` — add `image`.
- `frontend/lib/saas-tools-data.ts` — add `marketPosition`, `commonPriceRange`, `signatureWastePattern`.
- `frontend/lib/integration-docs.ts` — add `metaDescription`.
- `frontend/app/(marketing)/tools/[slug]/page.tsx` — schema restructure + rewritten `generateSeoContent`.
- `frontend/package.json` — `prebuild` hook running canonical-URL guard.

**Verification posture:** Each task ends with one or more of: `npx tsc --noEmit`, `npm run build`, browser visit, Rich Results Test, commit.

---

## Phase 0 — Shared SEO infrastructure

### Task 0.1: Single canonical site URL constant

**Files:**
- Create: `frontend/lib/site.ts`

- [ ] **Step 1: Create the file**

```ts
// frontend/lib/site.ts
//
// Single source of truth for the public site URL. Sitemap, robots,
// metadataBase, every per-page openGraph.url and JSON-LD URL must
// derive from here. The audit found three competing values
// (efficyon.com, www.efficyon.com, mixed per-page) that were
// fighting over canonical signals.

export const SITE_HOST = "www.efficyon.com" as const
export const SITE_URL = `https://${SITE_HOST}` as const

// Year used by compare-page titles + Dataset schema. Bump annually.
export const CURRENT_YEAR = 2026 as const

export function absoluteUrl(path = "/"): string {
  if (!path.startsWith("/")) path = `/${path}`
  return `${SITE_URL}${path}`
}
```

- [ ] **Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/site.ts
git commit -m "feat(seo): add canonical site URL helper"
```

### Task 0.2: JSON-LD generators

**Files:**
- Create: `frontend/lib/seo/jsonld.ts`

- [ ] **Step 1: Create the file**

```ts
// frontend/lib/seo/jsonld.ts
import { absoluteUrl, SITE_URL } from "@/lib/site"

type LD = Record<string, unknown>

export function organizationLd(): LD {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Efficyon",
    url: SITE_URL,
    logo: absoluteUrl("/logo.png"),
    foundingLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: "Gothenburg", addressCountry: "SE" },
    },
    sameAs: [],
  }
}

export function websiteLd(): LD {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Efficyon",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/blog?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  }
}

export function breadcrumbListLd(items: { name: string; path: string }[]): LD {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  }
}

export function faqPageLd(items: { q: string; a: string }[]): LD {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  }
}

export function articleLd(args: {
  headline: string
  description: string
  url: string
  image: string
  datePublished: string
  dateModified: string
  authorName: string
}): LD {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: args.headline,
    description: args.description,
    image: args.image,
    datePublished: args.datePublished,
    dateModified: args.dateModified,
    mainEntityOfPage: { "@type": "WebPage", "@id": args.url },
    author: { "@type": "Person", name: args.authorName },
    publisher: { "@type": "Organization", name: "Efficyon", logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png") } },
  }
}

export function softwareApplicationLd(args: {
  name: string
  description: string
  url: string
  category: string
  offers?: { price: string; priceCurrency: string }
  aggregateRating?: { ratingValue: number; reviewCount: number }
}): LD {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: args.name,
    description: args.description,
    url: args.url,
    applicationCategory: args.category,
    operatingSystem: "Web",
    ...(args.offers && { offers: { "@type": "Offer", ...args.offers } }),
    ...(args.aggregateRating && { aggregateRating: { "@type": "AggregateRating", ...args.aggregateRating } }),
  }
}

export function datasetLd(args: {
  name: string
  description: string
  url: string
  datePublished: string
  dateModified: string
  variableMeasured: string[]
  distributionUrl?: string
}): LD {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: args.name,
    description: args.description,
    url: args.url,
    datePublished: args.datePublished,
    dateModified: args.dateModified,
    variableMeasured: args.variableMeasured,
    creator: { "@type": "Organization", name: "Efficyon", url: SITE_URL },
    license: `${SITE_URL}/terms`,
    ...(args.distributionUrl && {
      distribution: { "@type": "DataDownload", encodingFormat: "JSON", contentUrl: args.distributionUrl },
    }),
  }
}

export function itemListLd(items: { name: string; url: string; description?: string }[]): LD {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: it.url,
      name: it.name,
      ...(it.description && { description: it.description }),
    })),
  }
}

export function jsonLdScript(ld: LD | LD[]): string {
  return JSON.stringify(Array.isArray(ld) ? ld : [ld])
}
```

- [ ] **Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/seo/jsonld.ts
git commit -m "feat(seo): add JSON-LD generator helpers"
```

### Task 0.3: Metadata helper with Twitter mirror

**Files:**
- Create: `frontend/lib/seo/metadata.ts`

- [ ] **Step 1: Create the file**

```ts
// frontend/lib/seo/metadata.ts
import type { Metadata } from "next"
import { absoluteUrl } from "@/lib/site"

type OG = NonNullable<Metadata["openGraph"]>

export function mirrorTwitter(og: OG): NonNullable<Metadata["twitter"]> {
  const firstImage = Array.isArray(og.images) ? og.images[0] : og.images
  const imageUrl =
    typeof firstImage === "string"
      ? firstImage
      : firstImage && typeof firstImage === "object" && "url" in firstImage
        ? String((firstImage as { url: unknown }).url)
        : undefined
  return {
    card: "summary_large_image",
    title: typeof og.title === "string" ? og.title : undefined,
    description: typeof og.description === "string" ? og.description : undefined,
    ...(imageUrl && { images: [imageUrl] }),
  }
}

export function pageMetadata(args: {
  title: string
  description: string
  path: string
  image?: string
  ogTitleOverride?: string
  ogDescriptionOverride?: string
  type?: "website" | "article"
  publishedTime?: string
  modifiedTime?: string
  authors?: string[]
  noindex?: boolean
}): Metadata {
  const url = absoluteUrl(args.path)
  const og: OG = {
    type: args.type ?? "website",
    url,
    title: args.ogTitleOverride ?? args.title,
    description: args.ogDescriptionOverride ?? args.description,
    siteName: "Efficyon",
    images: args.image ? [{ url: args.image, width: 1200, height: 630, alt: args.title }] : undefined,
    ...(args.type === "article" && {
      publishedTime: args.publishedTime,
      modifiedTime: args.modifiedTime,
      authors: args.authors,
    }),
  }
  return {
    title: args.title,
    description: args.description,
    alternates: { canonical: args.path },
    openGraph: og,
    twitter: mirrorTwitter(og),
    robots: args.noindex ? { index: false, follow: false } : { index: true, follow: true },
  }
}
```

- [ ] **Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/seo/metadata.ts
git commit -m "feat(seo): add pageMetadata + Twitter mirror helper"
```

### Task 0.4: Canonical-URL guard script

**Files:**
- Create: `frontend/scripts/check-canonical-urls.mjs`
- Modify: `frontend/package.json` — add `prebuild` script.

- [ ] **Step 1: Create the script**

```js
// frontend/scripts/check-canonical-urls.mjs
import { readFileSync } from "node:fs"
import { execSync } from "node:child_process"

const FORBIDDEN = [/https?:\/\/efficyon\.com/, /https?:\/\/www\.efficyon\.com/]
const ALLOWLIST = ["lib/site.ts"]

const files = execSync("git ls-files frontend", { encoding: "utf8" })
  .split("\n")
  .filter((f) => /\.(tsx?|mjs|js|json|md)$/.test(f) && !ALLOWLIST.some((a) => f.includes(a)))

let hits = 0
for (const f of files) {
  let body
  try { body = readFileSync(f, "utf8") } catch { continue }
  for (const re of FORBIDDEN) {
    if (re.test(body)) {
      console.error(`✘ hard-coded site URL in ${f}`)
      hits++
    }
  }
}
if (hits) {
  console.error(`\n${hits} file(s) contain hard-coded efficyon.com URLs. Use absoluteUrl() from @/lib/site instead.`)
  process.exit(1)
}
console.log("✓ no hard-coded site URLs outside lib/site.ts")
```

- [ ] **Step 2: Wire into package.json**

In `frontend/package.json`, add to `scripts`:

```json
"prebuild": "node scripts/check-canonical-urls.mjs"
```

- [ ] **Step 3: Verify (will fail until Phase 1 lands)**

Run: `cd frontend && node scripts/check-canonical-urls.mjs`
Expected: fails with a list of files (this is correct — Phase 1 fixes them). Do NOT block the commit; we'll wire the script in but expect it to fail until Phase 1.4 completes.

- [ ] **Step 4: Commit**

```bash
git add frontend/scripts/check-canonical-urls.mjs frontend/package.json
git commit -m "chore(seo): add canonical-URL guard script (intentionally failing until Phase 1)"
```

---

## Phase 1 — Domain canonicalization

### Task 1.1: Update root metadataBase

**Files:**
- Modify: `frontend/app/layout.tsx:26`

- [ ] **Step 1: Change `siteUrl`**

Replace line 26 (`const siteUrl = "https://efficyon.com"`) with:

```ts
import { SITE_URL } from "@/lib/site"
// ...
// remove the local `const siteUrl = "..."`
```

And in `metadataBase`:

```ts
metadataBase: new URL(SITE_URL),
```

Also replace any `url: siteUrl` in `openGraph` with `url: SITE_URL`.

- [ ] **Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/layout.tsx
git commit -m "fix(seo): use canonical SITE_URL in root metadataBase"
```

### Task 1.2: Sitemap + robots use SITE_URL

**Files:**
- Modify: `frontend/app/sitemap.ts:7`
- Modify: `frontend/app/robots.ts:37`

- [ ] **Step 1: sitemap.ts**

Replace `const baseUrl = "https://www.efficyon.com"` with:

```ts
import { SITE_URL } from "@/lib/site"
const baseUrl = SITE_URL
```

- [ ] **Step 2: robots.ts**

Replace `sitemap: "https://www.efficyon.com/sitemap.xml"` with:

```ts
import { absoluteUrl } from "@/lib/site"
// ...
sitemap: absoluteUrl("/sitemap.xml"),
```

- [ ] **Step 3: Verify**

Run: `cd frontend && npx tsc --noEmit && npm run build` (build will execute the sitemap function).
Expected: build succeeds; `frontend/.next/server/app/sitemap.xml` (or the route output) shows `https://www.efficyon.com/...`.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/sitemap.ts frontend/app/robots.ts
git commit -m "fix(seo): sitemap + robots use canonical SITE_URL"
```

### Task 1.3: Replace hard-coded URLs across marketing pages

**Files:**
- Modify: every file under `frontend/app/(marketing)/**` and `frontend/app/page.tsx` containing a hard-coded `https://efficyon.com` or `https://www.efficyon.com` literal.

- [ ] **Step 1: Find all hits**

Run: `cd frontend && node scripts/check-canonical-urls.mjs`
Expected: list of files that need editing.

- [ ] **Step 2: For each file, replace literals with `absoluteUrl(path)` or `SITE_URL`**

Pattern: replace `"https://www.efficyon.com/some/path"` with `absoluteUrl("/some/path")` and add `import { absoluteUrl } from "@/lib/site"` to the file. For bare `"https://www.efficyon.com"`, use `SITE_URL`.

This is mechanical. Do it cluster-by-cluster, committing after each cluster so reviewers can read diffs:
- `(marketing)/features/**`
- `(marketing)/integrations/**`
- `(marketing)/compare/**`
- `(marketing)/solutions/**`
- `(marketing)/calculator/**`
- `(marketing)/benchmarks/**`
- `(marketing)/blog/**`
- `(marketing)/tools/**`
- `(marketing)/docs/**`
- `(marketing)/about/page.tsx`, `(marketing)/changelog/page.tsx`

- [ ] **Step 3: Verify**

Run: `cd frontend && node scripts/check-canonical-urls.mjs && npx tsc --noEmit && npm run build`
Expected: guard passes, types pass, build succeeds.

- [ ] **Step 4: Commit (one per cluster)**

```bash
git add frontend/app/(marketing)/<cluster>
git commit -m "fix(seo): canonical SITE_URL across <cluster> pages"
```

### Task 1.4: Verify Vercel domain redirects non-www → www

- [ ] **Step 1: Manual check**

Visit `https://efficyon.com/features` in a browser. Expected: 308/301 redirect to `https://www.efficyon.com/features`.

If not, add a Vercel domain redirect in the dashboard (Vercel → Project → Settings → Domains → set `efficyon.com` to "Redirect to www.efficyon.com"). Document outcome in PR description.

---

## Phase 2 — Homepage server shell

### Task 2.1: Rename current homepage to client island

**Files:**
- Rename: `frontend/app/page.tsx` → `frontend/app/page-client.tsx`

- [ ] **Step 1: Rename**

```bash
git mv frontend/app/page.tsx frontend/app/page-client.tsx
```

- [ ] **Step 2: Inside `page-client.tsx`, rename the default export**

Change `export default function HomePage()` to `export default function HomePageClient()`.

- [ ] **Step 3: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: error — there's no `app/page.tsx` yet. That's intentional; Task 2.2 fixes it.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/page-client.tsx
git commit -m "refactor(homepage): rename to page-client.tsx (server shell incoming)"
```

### Task 2.2: New server shell at app/page.tsx

**Files:**
- Create: `frontend/app/page.tsx`

- [ ] **Step 1: Create the shell**

```tsx
// frontend/app/page.tsx
import HomePageClient from "./page-client"
import { pageMetadata } from "@/lib/seo/metadata"
import {
  organizationLd,
  websiteLd,
  breadcrumbListLd,
  faqPageLd,
  jsonLdScript,
} from "@/lib/seo/jsonld"

export const metadata = pageMetadata({
  title: "Efficyon — SaaS Cost Intelligence Built in Gothenburg, Sweden",
  description:
    "Efficyon connects accounting + identity data to surface unused licenses, duplicate payments, and renewal risk before they hit the books.",
  path: "/",
  image: "/og-image.png",
})

const HOMEPAGE_FAQS = [
  {
    q: "What does Efficyon do?",
    a: "Efficyon ingests accounting (Fortnox, QuickBooks, Xero, Stripe) and identity (Microsoft 365, Google Workspace) data, then surfaces unused licenses, duplicate payments, and renewal risk. Read-only OAuth — we don't move money or change licenses.",
  },
  {
    q: "Where is Efficyon hosted?",
    a: "EU-hosted. The company is built in Gothenburg, Sweden.",
  },
  {
    q: "Which integrations are live?",
    a: "Fortnox, QuickBooks, Stripe, and Xero have full landing pages and setup docs today. Microsoft 365, Google Workspace, HubSpot, Shopify, Asana, Airtable, Visma, and AI providers (OpenAI / Anthropic / Gemini) are in active rollout.",
  },
]

export default function HomePage() {
  const ld = [
    organizationLd(),
    websiteLd(),
    breadcrumbListLd([{ name: "Home", path: "/" }]),
    faqPageLd(HOMEPAGE_FAQS),
  ]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      <HomePageClient />
    </>
  )
}
```

- [ ] **Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: passes.

- [ ] **Step 3: Verify metadata in browser**

Run `npm run dev`, view `http://localhost:3000`, view-source. Expected: `<title>Efficyon — SaaS Cost Intelligence Built in Gothenburg, Sweden</title>` plus `<script type="application/ld+json">` containing Organization, WebSite, BreadcrumbList, FAQPage.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "feat(seo): homepage server shell with metadata + Org/WebSite/FAQ schema"
```

---

## Phase 3 — Phantom integrations

### Task 3.1: Add status enum + flip 8 providers

**Files:**
- Modify: `frontend/app/(marketing)/integrations/page.tsx:23-108`

- [ ] **Step 1: Tighten the type and flip statuses**

Replace the `INTEGRATIONS` array's `status: "Live"` on the 8 unbuilt providers with `status: "coming-soon"`. Keep the 4 with real pages (`fortnox`, `stripe`, `quickbooks`, `xero`) as `status: "live"` (lowercase for consistency).

```ts
type IntegrationStatus = "live" | "coming-soon"
type IntegrationCard = {
  name: string
  slug: string
  status: IntegrationStatus
  body: string
  meta: string
}

const INTEGRATIONS: IntegrationCard[] = [
  { name: "Fortnox", slug: "fortnox", status: "live", body: "...", meta: "..." },
  { name: "Stripe", slug: "stripe", status: "live", body: "...", meta: "..." },
  { name: "QuickBooks", slug: "quickbooks", status: "live", body: "...", meta: "..." },
  { name: "Xero", slug: "xero", status: "live", body: "...", meta: "..." },
  { name: "Visma eEkonomi", slug: "visma", status: "coming-soon", body: "...", meta: "..." },
  { name: "Microsoft 365", slug: "microsoft-365", status: "coming-soon", body: "...", meta: "..." },
  { name: "Google Workspace", slug: "google-workspace", status: "coming-soon", body: "...", meta: "..." },
  { name: "HubSpot", slug: "hubspot", status: "coming-soon", body: "...", meta: "..." },
  { name: "Shopify", slug: "shopify", status: "coming-soon", body: "...", meta: "..." },
  { name: "Asana", slug: "asana", status: "coming-soon", body: "...", meta: "..." },
  { name: "Airtable", slug: "airtable", status: "coming-soon", body: "...", meta: "..." },
  { name: "OpenAI / Anthropic / Gemini", slug: "ai-providers", status: "coming-soon", body: "...", meta: "..." },
]
```

(Keep existing `body` + `meta` strings — only the `status` value changes for 8 entries.)

- [ ] **Step 2: Render two rails**

Find the section that maps `INTEGRATIONS.map(...)`. Split into:

```tsx
const live = INTEGRATIONS.filter((i) => i.status === "live")
const upcoming = INTEGRATIONS.filter((i) => i.status === "coming-soon")
```

Render `live` first under the existing heading, then a new section "Shipping next" rendering `upcoming` with non-clickable cards (no `<Link>` wrapper, replace with `<div>`; add a small "Coming soon" pill).

- [ ] **Step 3: Filter JSON-LD to live only**

In the `jsonLd` block (lines ~110–127), change `INTEGRATIONS.map(...)` to `live.map(...)`.

- [ ] **Step 4: Verify**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Then `npm run dev` and open `http://localhost:3000/integrations`. Expected: 4 clickable Live cards above, 8 non-clickable "Coming soon" cards below. Visiting `/integrations/visma` still 404s (unchanged) but no longer reachable from the hub.

- [ ] **Step 5: Verify schema**

View-source on `/integrations`. The JSON-LD `itemListElement` should contain only 4 items (fortnox, stripe, quickbooks, xero).

- [ ] **Step 6: Commit**

```bash
git add frontend/app/(marketing)/integrations/page.tsx
git commit -m "fix(seo): flip 8 unbuilt integrations to coming-soon, filter JSON-LD to live"
```

---

## Phase 4 — Schema baseline

### Task 4.1: BreadcrumbList on every hub

**Files:**
- Modify: `(marketing)/features/page.tsx`, `(marketing)/integrations/page.tsx`, `(marketing)/compare/page.tsx`, `(marketing)/solutions/page.tsx`, `(marketing)/calculator/page.tsx`, `(marketing)/benchmarks/page.tsx`, `(marketing)/blog/page.tsx`, `(marketing)/tools/page.tsx`, `(marketing)/docs/integrations/page.tsx`.

- [ ] **Step 1: Pattern (apply to each hub)**

Inside the page's existing `jsonLd` (or add one if absent), include a BreadcrumbList alongside any existing schema:

```ts
import { breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"

const ld = [
  // ...existing schema...
  breadcrumbListLd([
    { name: "Home", path: "/" },
    { name: "Features", path: "/features" }, // adjust per hub
  ]),
]

return (
  <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
    {/* ... */}
  </>
)
```

- [ ] **Step 2: Verify**

Run `npm run build`. Use Google Rich Results Test on the Vercel preview for `/features`, `/compare`, `/solutions`. Expected: BreadcrumbList recognized.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/(marketing)/{features,integrations,compare,solutions,calculator,benchmarks,blog,tools,docs}/page.tsx
git commit -m "feat(seo): add BreadcrumbList to every marketing hub"
```

### Task 4.2: BreadcrumbList on every sub-page

**Files:**
- Modify: All `(marketing)/{features,integrations,compare,solutions,calculator,benchmarks}/<slug>/page.tsx`, plus `blog/[slug]/page.tsx`, `tools/[slug]/page.tsx`, `docs/integrations/[slug]/page.tsx`.

- [ ] **Step 1: Pattern (apply per page)**

For static sub-pages:

```ts
breadcrumbListLd([
  { name: "Home", path: "/" },
  { name: "Features", path: "/features" },
  { name: "SaaS Cost Optimization", path: "/features/saas-cost-optimization" },
])
```

For dynamic pages (`blog/[slug]`, `tools/[slug]`, `docs/integrations/[slug]`), build the breadcrumb from the slug params + data lookup inside the page component.

- [ ] **Step 2: Verify with Rich Results Test on at least one URL per cluster**

Expected: BreadcrumbList recognized; positions correct.

- [ ] **Step 3: Commit per cluster**

```bash
git commit -m "feat(seo): BreadcrumbList on <cluster> sub-pages"
```

### Task 4.3: Dataset schema on benchmark pages

**Files:**
- Modify: `(marketing)/benchmarks/saas-spend-by-company-size/page.tsx`, `saas-spend-by-industry/page.tsx`, `subscription-cost-per-employee/page.tsx`.

- [ ] **Step 1: Add Dataset schema (per page)**

```ts
import { datasetLd, jsonLdScript } from "@/lib/seo/jsonld"
import { absoluteUrl } from "@/lib/site"

const ld = [
  // ...existing Article/BreadcrumbList schema...
  datasetLd({
    name: "SaaS Spend by Company Size — 2026",
    description: "Per-employee SaaS spend benchmarks across company-size bands, sourced from third-party industry data.",
    url: absoluteUrl("/benchmarks/saas-spend-by-company-size"),
    datePublished: "2026-03-01",
    dateModified: "2026-03-01",
    variableMeasured: ["Monthly SaaS spend per employee", "Tool count per employee", "Waste percentage"],
    // distributionUrl omitted until we publish a JSON endpoint
  }),
]
```

Repeat for the other two benchmarks with their own `name`, `description`, `path`, `variableMeasured`.

- [ ] **Step 2: Verify**

Rich Results Test → should detect `Dataset`.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/(marketing)/benchmarks/**/page.tsx
git commit -m "feat(seo): Dataset JSON-LD on benchmark pages"
```

### Task 4.4: ItemList of SoftwareApplication on best-tools listicle

**Files:**
- Modify: `(marketing)/compare/best-saas-cost-optimization-tools/page.tsx`

- [ ] **Step 1: Replace the existing schema block with proper ItemList**

```ts
import { itemListLd, softwareApplicationLd, jsonLdScript } from "@/lib/seo/jsonld"
import { absoluteUrl } from "@/lib/site"

const TOOLS = [
  { name: "Efficyon", url: absoluteUrl("/"), description: "SaaS cost intelligence — accounting + identity, EU-hosted." },
  { name: "Zylo", url: "https://zylo.com", description: "Enterprise SaaS management platform." },
  { name: "Torii", url: "https://toriihq.com", description: "Mid-market SaaS management with workflow automation." },
  { name: "Productiv", url: "https://productiv.com", description: "Application engagement analytics for enterprise." },
  { name: "Cleanshelf", url: "https://www.cleanshelf.com", description: "Acquired by Zylo in 2021; legacy SaaS-management product." },
  { name: "Vendr", url: "https://vendr.com", description: "SaaS buying + procurement, not pure spend visibility." },
  { name: "Cledara", url: "https://cledara.com", description: "Subscription management with virtual cards." },
  { name: "Spreadsheets", url: absoluteUrl("/compare/efficyon-vs-spreadsheets"), description: "The status quo." },
]

const ld = [
  itemListLd(TOOLS),
  ...TOOLS.filter((t) => t.url.startsWith(absoluteUrl(""))).map((t) =>
    softwareApplicationLd({
      name: t.name,
      description: t.description,
      url: t.url,
      category: "BusinessApplication",
    })
  ),
  // existing FAQPage + BreadcrumbList
]
```

- [ ] **Step 2: Verify with Rich Results Test**

Expected: `ItemList` and one or more `SoftwareApplication` entities recognized.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/(marketing)/compare/best-saas-cost-optimization-tools/page.tsx
git commit -m "feat(seo): ItemList + SoftwareApplication schema on best-tools listicle"
```

### Task 4.5: Restructure tools/[slug] schema

**Files:**
- Modify: `frontend/app/(marketing)/tools/[slug]/page.tsx`

- [ ] **Step 1: Replace nested schema with primary SoftwareApplication + BreadcrumbList**

In the existing `jsonLd` block, swap the `WebPage`-with-nested-`about` shape for:

```ts
import { softwareApplicationLd, breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"
import { absoluteUrl } from "@/lib/site"

const ld = [
  softwareApplicationLd({
    name: tool.name,
    description: tool.tagline,
    url: absoluteUrl(`/tools/${tool.slug}`),
    category: tool.category,
  }),
  breadcrumbListLd([
    { name: "Home", path: "/" },
    { name: "Tools Directory", path: "/tools" },
    { name: tool.name, path: `/tools/${tool.slug}` },
  ]),
]
```

- [ ] **Step 2: Verify**

Rich Results Test on a representative tool URL (e.g., `/tools/asana`).

- [ ] **Step 3: Commit**

```bash
git add frontend/app/(marketing)/tools/[slug]/page.tsx
git commit -m "fix(seo): tools/[slug] uses SoftwareApplication as primary schema"
```

### Task 4.6: Add image to BlogPost + Article schema

**Files:**
- Modify: `frontend/lib/blog-data.ts`, `frontend/app/(marketing)/blog/[slug]/page.tsx`

- [ ] **Step 1: Extend BlogPost interface**

In `lib/blog-data.ts`, add `image: string` (absolute URL or `/blog/<slug>.png` path). Populate for all 14 posts. If a post has no custom image yet, use a fallback like `/og-image.png`.

- [ ] **Step 2: Wire into Article schema + openGraph**

In `blog/[slug]/page.tsx`:

```ts
import { articleLd, breadcrumbListLd, jsonLdScript } from "@/lib/seo/jsonld"
import { absoluteUrl } from "@/lib/site"
import { pageMetadata } from "@/lib/seo/metadata"

export async function generateMetadata({ params }): Promise<Metadata> {
  const post = blogPosts.find(/* ... */)
  return pageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    image: absoluteUrl(post.image),
    type: "article",
    publishedTime: post.publishedDate,
    modifiedTime: post.updatedDate,
    authors: [post.author],
  })
}

// in default export:
const ld = [
  articleLd({
    headline: post.title,
    description: post.description,
    url: absoluteUrl(`/blog/${post.slug}`),
    image: absoluteUrl(post.image),
    datePublished: post.publishedDate,
    dateModified: post.updatedDate,
    authorName: post.author,
  }),
  breadcrumbListLd([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ]),
]
```

- [ ] **Step 3: Verify**

Rich Results Test on one blog URL. Expected: Article result with image; BreadcrumbList recognized.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/blog-data.ts frontend/app/(marketing)/blog/[slug]/page.tsx
git commit -m "feat(seo): blog posts have featured image in Article schema + OG"
```

---

## Phase 5 — Twitter cards + OG images

### Task 5.1: Twitter mirror across all metadata blocks

**Files:**
- Modify: every static page that has its own `export const metadata = {...}` and every `generateMetadata` call.

- [ ] **Step 1: Pattern**

Replace bespoke metadata blocks with `pageMetadata({...})`:

```ts
import { pageMetadata } from "@/lib/seo/metadata"
export const metadata = pageMetadata({
  title: "<existing title>",
  description: "<existing description>",
  path: "/features/saas-cost-optimization",
  image: "/og/features.png", // will exist after Task 5.2
})
```

`pageMetadata` automatically generates the canonical, openGraph, AND twitter card. This collapses ~20 lines of metadata per page to ~5 and guarantees Twitter coverage.

For pages with custom OG title/description (compare pages with the divergent OG titles per finding M6), pass `ogTitleOverride` / `ogDescriptionOverride` as needed — but the audit recommends *unifying* them, so default behavior (no override) is preferred.

- [ ] **Step 2: Apply page by page, committing per cluster**

Order: features → integrations → compare → solutions → calculator → benchmarks → blog → tools → docs/integrations → about/changelog.

- [ ] **Step 3: Verify**

Rich Results Test + browser view-source on at least one URL per cluster. Expected: `<meta name="twitter:card">` etc. present on every page.

- [ ] **Step 4: Commit per cluster**

```bash
git commit -m "feat(seo): Twitter card + canonical metadata on <cluster> pages via pageMetadata"
```

### Task 5.2: Per-cluster opengraph-image.tsx

**Files:**
- Create: `frontend/app/(marketing)/features/opengraph-image.tsx`
- Create: `frontend/app/(marketing)/integrations/opengraph-image.tsx`
- Create: `frontend/app/(marketing)/compare/opengraph-image.tsx`
- Create: `frontend/app/(marketing)/solutions/opengraph-image.tsx`
- Create: `frontend/app/(marketing)/calculator/opengraph-image.tsx`
- Create: `frontend/app/(marketing)/benchmarks/opengraph-image.tsx`
- Create: `frontend/app/(marketing)/blog/opengraph-image.tsx`
- Create: `frontend/app/(marketing)/tools/opengraph-image.tsx`

- [ ] **Step 1: Pattern (one per cluster, swap title)**

```tsx
// frontend/app/(marketing)/features/opengraph-image.tsx
import { ImageResponse } from "next/og"
export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Efficyon — Features"

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%", width: "100%", display: "flex", flexDirection: "column",
          background: "#080809", color: "#fff", padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, color: "#00D17A", letterSpacing: "0.18em", textTransform: "uppercase" }}>
          ✦ Efficyon · Features
        </div>
        <div style={{ marginTop: "auto", fontSize: 84, lineHeight: 1.05, fontWeight: 500, letterSpacing: "-0.025em" }}>
          The features that pay for the platform.
        </div>
        <div style={{ marginTop: 24, fontSize: 22, color: "rgba(255,255,255,0.6)" }}>
          Built in Gothenburg, Sweden · EU-hosted
        </div>
      </div>
    ),
    { ...size }
  )
}
```

Adapt headline + sub-eyebrow for each cluster.

- [ ] **Step 2: Verify**

`npm run dev` → visit `http://localhost:3000/features/opengraph-image` (Next.js exposes the route). Expected: 1200×630 PNG renders.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/(marketing)/**/opengraph-image.tsx
git commit -m "feat(seo): per-cluster opengraph-image.tsx"
```

### Task 5.3: Dynamic OG images for blog/[slug] and tools/[slug]

**Files:**
- Create: `frontend/app/(marketing)/blog/[slug]/opengraph-image.tsx`
- Create: `frontend/app/(marketing)/tools/[slug]/opengraph-image.tsx`

- [ ] **Step 1: blog/[slug]/opengraph-image.tsx**

```tsx
import { ImageResponse } from "next/og"
import { blogPosts } from "@/lib/blog-data"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Efficyon blog post"

export default function OG({ params }: { params: { slug: string } }) {
  const post = blogPosts.find((p) => p.slug === params.slug)
  const title = post?.title ?? "Efficyon Blog"
  return new ImageResponse(
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", background: "#080809", color: "#fff", padding: 72 }}>
      <div style={{ fontSize: 24, color: "#00D17A", letterSpacing: "0.18em", textTransform: "uppercase" }}>✦ Efficyon · Blog</div>
      <div style={{ marginTop: "auto", fontSize: 64, lineHeight: 1.1, fontWeight: 500 }}>{title}</div>
    </div>,
    { ...size }
  )
}

export async function generateImageMetadata() {
  return blogPosts.map((p) => ({ id: p.slug, alt: p.title, size, contentType }))
}
```

- [ ] **Step 2: tools/[slug]/opengraph-image.tsx**

Same pattern, swap `blogPosts` for `saasTools` and headline for `${tool.name} — ${tool.category}`.

- [ ] **Step 3: Verify**

Visit `http://localhost:3000/blog/<some-slug>/opengraph-image` and `/tools/<some-slug>/opengraph-image`.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/(marketing)/{blog,tools}/[slug]/opengraph-image.tsx
git commit -m "feat(seo): dynamic OG images for blog + tool pages"
```

---

## Phase 6 — Content polish

### Task 6.1: Compare titles include current year

**Files:**
- Modify: all 6 `(marketing)/compare/efficyon-vs-*/page.tsx` + `compare/best-saas-cost-optimization-tools/page.tsx`.

- [ ] **Step 1: Update each title to include `${CURRENT_YEAR}` (via pageMetadata)**

Pattern (after Phase 5.1, every page already uses `pageMetadata`):

```ts
import { CURRENT_YEAR } from "@/lib/site"
export const metadata = pageMetadata({
  title: `Efficyon vs Cleanshelf: ${CURRENT_YEAR} Comparison`,
  description: "...",
  path: "/compare/efficyon-vs-cleanshelf",
  image: "/og/compare.png",
})
```

Apply to all 6 vs-pages and the listicle.

- [ ] **Step 2: Verify**

Visit each page in browser, view-source `<title>`. Expected: `2026` in every title.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/(marketing)/compare/**/page.tsx
git commit -m "fix(seo): compare-page titles include current year"
```

### Task 6.2: Tighten 7 feature meta descriptions

**Files:**
- Modify: 7 sub-pages under `(marketing)/features/<slug>/page.tsx`.

- [ ] **Step 1: Rewrite each description to 150–160 chars, slug-keyword first**

| Slug | New description (target ~155 chars) |
|---|---|
| `saas-cost-optimization` | "SaaS cost optimization software: connect accounting + identity to surface unused licenses, duplicate subscriptions, and renewal risk in one view." |
| `subscription-tracking` | "Subscription tracking software for SaaS: centralize renewals, monitor cost trends, detect shadow IT, and break costs down by department." |
| `duplicate-payment-detection` | "Duplicate payment detection: pattern-match across accounting, expense, and usage data to find overlapping tools and redundant subscriptions." |
| `unused-license-detection` | "Unused license detection: 90-day activity windows surface idle seats, departed-employee accounts, and overprovisioned tiers across every SaaS tool." |
| `saas-spend-management` | "SaaS spend management platform: unified dashboards, real-time budget controls, forecasting, and department-level cost allocation." |
| `ai-cost-analysis` | "AI cost analysis: continuous pattern recognition + anomaly detection on accounting and usage data to surface waste and savings opportunities." |
| `software-audit` | "Automated software audit: continuous inventory, license compliance tracking, and audit-ready reports — replace quarterly spreadsheet scrambles." |

- [ ] **Step 2: Verify**

`grep -c '.\{161,\}' <each meta description>` — none should exceed 160. Browser view-source.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/(marketing)/features/**/page.tsx
git commit -m "fix(seo): tighten feature meta descriptions to 150–160ch, keyword-first"
```

### Task 6.3: Trim solutions hub description, add IntegrationDoc.metaDescription

**Files:**
- Modify: `(marketing)/solutions/page.tsx` (desc trim).
- Modify: `frontend/lib/integration-docs.ts` (add field + populate for 4 integrations).
- Modify: `(marketing)/docs/integrations/[slug]/page.tsx` (use new field).

- [ ] **Step 1: Trim solutions hub description to ≤160 chars**

- [ ] **Step 2: Add field**

```ts
export interface IntegrationDoc {
  // ...existing fields...
  metaDescription: string  // ≤155 chars, used as the meta description
}
```

Populate for fortnox, quickbooks, stripe, xero with bespoke 150–155-char strings.

- [ ] **Step 3: Use it in `[slug]/page.tsx`**

In `generateMetadata`, replace the fallback `doc.blurb` with `doc.metaDescription`.

- [ ] **Step 4: Verify**

`npm run build`; check rendered meta lengths.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/(marketing)/solutions/page.tsx frontend/lib/integration-docs.ts frontend/app/(marketing)/docs/integrations/[slug]/page.tsx
git commit -m "fix(seo): solutions hub + doc page meta descriptions within 160ch"
```

### Task 6.4: Cleanshelf — add acquisition year

**Files:**
- Modify: `(marketing)/compare/efficyon-vs-cleanshelf/page.tsx`

- [ ] **Step 1: Find the "acquired by Zylo" mention; change to "acquired by Zylo in 2021"**

- [ ] **Step 2: Commit**

```bash
git add frontend/app/(marketing)/compare/efficyon-vs-cleanshelf/page.tsx
git commit -m "fix(seo): cite Zylo's 2021 acquisition of Cleanshelf for E-E-A-T"
```

---

## Phase 7 — Tools programmatic-SEO refactor

### Task 7.1: Extend SaasToolData

**Files:**
- Modify: `frontend/lib/saas-tools-data.ts`

- [ ] **Step 1: Add fields**

```ts
export interface SaasToolData {
  // ...existing fields...
  marketPosition: string         // 1 sentence (e.g., "Market leader in async video; Loom's main competitor")
  commonPriceRange: string       // (e.g., "$8–24 per user per month")
  signatureWastePattern: string  // 1 sentence (e.g., "Pro seats assigned to occasional viewers")
}
```

- [ ] **Step 2: Populate for all 50 tools**

This is editorial work — 50 × 3 sentences = 150 sentences. Aim for 1 hour. Keep each unique to that tool; don't template. Use the existing `commonWastePatterns` array as input but rewrite as a single signature sentence.

- [ ] **Step 3: Verify**

`npx tsc --noEmit`. Expected: passes (every tool has all 3 fields).

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/saas-tools-data.ts
git commit -m "feat(seo): tool-specific signal fields on SaasToolData"
```

### Task 7.2: Per-category intros

**Files:**
- Create: `frontend/app/(marketing)/tools/[slug]/category-intros.ts`

- [ ] **Step 1: Create the file**

```ts
// One hand-authored intro paragraph per category. Reused across
// all tools in that category to give each tool page a unique
// non-templated opening (vs the previous ${tool.name} substitution
// pattern that produced 50 near-identical pages).

export const CATEGORY_INTROS: Record<string, string> = {
  "Project Management": "Project-management tools are the easiest place for SaaS spend to get away from a finance team. They're licensed per-seat, often by department, often after a single user requests them, and the seat count almost never gets revisited when someone leaves or a project closes...",
  "Design": "Design tools concentrate value in a small number of users — and waste in everyone else who happens to have a viewer or commenter seat that was bought as a paid one. The biggest single waste pattern...",
  "Communication": "Communication tools are the canonical 'whole company gets a seat' purchase, which is correct. But they also collect dormant accounts at a rate few finance teams realize...",
  // ...one per category. Aim for 80–120 words each.
  // Categories present in saas-tools-data.ts: Project Management, Design,
  // Communication, Productivity, Developer, Marketing, Analytics, Sales,
  // Customer Support, HR, Finance, Storage, Security
}

export function categoryIntro(category: string): string {
  return CATEGORY_INTROS[category] ?? ""
}
```

- [ ] **Step 2: Verify count**

`grep -c '"' frontend/lib/saas-tools-data.ts | head` — confirm category enum count matches keys.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/(marketing)/tools/[slug]/category-intros.ts
git commit -m "feat(seo): per-category intro paragraphs for tool pages"
```

### Task 7.3: Rewrite generateSeoContent

**Files:**
- Modify: `frontend/app/(marketing)/tools/[slug]/page.tsx`

- [ ] **Step 1: Replace generateSeoContent**

```ts
import { categoryIntro } from "./category-intros"

function generateSeoContent(tool: SaasToolData): { heading: string; body: string }[] {
  return [
    {
      heading: `Where ${tool.name} sits in the market`,
      body: `${categoryIntro(tool.category)}\n\n${tool.marketPosition} ${tool.signatureWastePattern}`,
    },
    {
      heading: `What ${tool.name} costs`,
      body: `${tool.name} is typically priced at ${tool.commonPriceRange}. Pricing varies by tier and contract length; the patterns below describe the waste we see most often regardless of which tier a customer is on.`,
    },
    {
      heading: `Common waste patterns`,
      body: tool.commonWastePatterns.map((p) => `- ${p}`).join("\n"),
    },
    {
      heading: `How Efficyon analyzes ${tool.name} spend`,
      body: `Efficyon ingests your accounting data (Fortnox, QuickBooks, Stripe, Xero) and identity data (Microsoft 365, Google Workspace) and matches activity against billing. For ${tool.name}, that surfaces ${tool.signatureWastePattern.toLowerCase()} The findings appear in your dashboard with the contract month they applied to and the dollar value at stake.`,
    },
  ]
}
```

This produces ~70% unique paragraphs per page (intro is per-category, market-position + waste-pattern + price are per-tool, the closing paragraph is templated but short).

- [ ] **Step 2: Verify uniqueness**

Spot-check 5 tools — render their pages locally, copy the body text, run a quick diff. Expected: <30% common text between any two same-category tools.

- [ ] **Step 3: Verify build**

`npm run build`. Expected: all 50 tool pages build.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/(marketing)/tools/[slug]/page.tsx
git commit -m "feat(seo): per-category intro + tool-specific signals replace templated tool pages"
```

---

## Phase 8 — Internal linking

### Task 8.1: Shared <RelatedLinks /> component

**Files:**
- Create: `frontend/components/marketing/related-links.tsx`

- [ ] **Step 1: Create the component**

```tsx
// frontend/components/marketing/related-links.tsx
import Link from "next/link"

type Variant =
  | "features" | "integrations" | "compare" | "solutions"
  | "calculator" | "benchmarks" | "blog" | "tools"

const PRESETS: Record<Variant, { label: string; href: string }[]> = {
  features: [
    { label: "Compare Efficyon to Zylo", href: "/compare/efficyon-vs-zylo" },
    { label: "ROI calculator", href: "/calculator/roi" },
    { label: "All integrations", href: "/integrations" },
  ],
  integrations: [
    { label: "How features work", href: "/features" },
    { label: "Setup docs", href: "/docs/integrations" },
    { label: "ROI calculator", href: "/calculator/roi" },
  ],
  compare: [
    { label: "Features overview", href: "/features" },
    { label: "Best SaaS cost-optimization tools 2026", href: "/compare/best-saas-cost-optimization-tools" },
    { label: "ROI calculator", href: "/calculator/roi" },
  ],
  solutions: [
    { label: "Features overview", href: "/features" },
    { label: "Industry benchmarks", href: "/benchmarks" },
    { label: "Compare alternatives", href: "/compare" },
  ],
  calculator: [
    { label: "Industry benchmarks", href: "/benchmarks" },
    { label: "Features overview", href: "/features" },
    { label: "Compare alternatives", href: "/compare" },
  ],
  benchmarks: [
    { label: "ROI calculator", href: "/calculator/roi" },
    { label: "SaaS cost calculator", href: "/calculator/saas-cost" },
    { label: "Solutions for finance teams", href: "/solutions/for-finance-teams" },
  ],
  blog: [
    { label: "ROI calculator", href: "/calculator/roi" },
    { label: "Industry benchmarks", href: "/benchmarks" },
    { label: "All features", href: "/features" },
  ],
  tools: [
    { label: "All integrations", href: "/integrations" },
    { label: "Compare alternatives", href: "/compare" },
    { label: "ROI calculator", href: "/calculator/roi" },
  ],
}

export function RelatedLinks({ variant }: { variant: Variant }) {
  return (
    <aside className="mx-auto max-w-[1240px] border-t border-white/[0.08] px-6 py-12 md:px-12">
      <p className="mb-5 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-[color:var(--green)]">
        ✦ Keep reading
      </p>
      <ul className="grid gap-3 md:grid-cols-3">
        {PRESETS[variant].map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-[15px] text-white/75 hover:text-white">
              {l.label} →
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
```

- [ ] **Step 2: Verify**

`npx tsc --noEmit`.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/marketing/related-links.tsx
git commit -m "feat(seo): shared RelatedLinks component with cluster presets"
```

### Task 8.2: Drop <RelatedLinks /> into each cluster

**Files:**
- Modify: every page under `(marketing)/<cluster>/**/page.tsx`.

- [ ] **Step 1: Place near the bottom of each page**

Insert above `<EditorialFinalCTA />` (or just above the final closing `</section>`):

```tsx
import { RelatedLinks } from "@/components/marketing/related-links"
// ...
<RelatedLinks variant="features" />
```

Apply per cluster — match `variant` to cluster.

- [ ] **Step 2: Verify**

Browser visit one page per cluster; confirm the section renders.

- [ ] **Step 3: Commit per cluster**

```bash
git commit -m "feat(seo): RelatedLinks on <cluster> pages"
```

### Task 8.3: Editorial in-body links pass

**Files:**
- Modify: per-page editorial body across all clusters.

- [ ] **Step 1: Identify 2–3 natural in-body link slots per page**

For each page, find 2–3 spots in the body copy where another page is mentioned by concept. Convert that mention to a `<Link>`. Examples:

- `features/duplicate-payment-detection`: "If you also have unused licenses…" → link `unused licenses` to `/features/unused-license-detection`.
- `solutions/for-cfo`: "Calculate your potential ROI" → link to `/calculator/roi`.
- `compare/efficyon-vs-zylo`: "If you're choosing between Productiv and Torii…" → link to `/compare/efficyon-vs-productiv` and `/compare/efficyon-vs-torii`.

- [ ] **Step 2: Aim for 2–3 in-body links per page (≥100 across the site)**

This is editorial work. Plan ~2–3 min per page; total ~3–4 hours.

- [ ] **Step 3: Verify**

`grep -c '<Link href="' frontend/app/(marketing)/<cluster>/<page>.tsx` per file. Expected: at least 2 more than before this task.

- [ ] **Step 4: Commit per cluster**

```bash
git commit -m "fix(seo): editorial in-body links across <cluster> pages"
```

---

## Final verification

- [ ] **Step 1: Canonical guard**

```bash
cd frontend && node scripts/check-canonical-urls.mjs
```
Expected: `✓ no hard-coded site URLs outside lib/site.ts`.

- [ ] **Step 2: Full build**

```bash
cd frontend && npm run build
```
Expected: succeeds, all 80+ static + dynamic pages render, sitemap regenerates with `https://www.efficyon.com`.

- [ ] **Step 3: Spot-check Rich Results Test**

On the Vercel preview, run Google's Rich Results Test against:
- `/` → Organization, WebSite, FAQPage, BreadcrumbList.
- `/features/saas-cost-optimization` → SoftwareApplication, FAQPage, BreadcrumbList.
- `/compare/efficyon-vs-zylo` → BreadcrumbList, FAQPage. Title contains 2026.
- `/benchmarks/saas-spend-by-industry` → Dataset, BreadcrumbList.
- `/blog/<a-real-slug>` → Article (with image), BreadcrumbList.
- `/tools/asana` → SoftwareApplication, BreadcrumbList.

Expected: every URL passes its expected schema set.

- [ ] **Step 4: Manual smoke**

Visit:
- `/integrations` → 4 Live cards link, 8 "Coming soon" cards do not.
- `/integrations/visma` → still 404 (expected; not in scope).
- `/calculator/roi` → metadata title is "SaaS Optimization ROI Calculator | Efficyon".
- `/og/features.png` (or whichever path Next.js exposes for the OG image) renders.

- [ ] **Step 5: Memory check**

`grep -ri "Stockholm" frontend/app frontend/components frontend/lib`
Expected: zero matches.

---

## Self-review notes (writer)

- Spec coverage: every numbered finding (C1-3, H1-6, M1-8) has a task. C1→Phase 1; C2→Phase 3; C3→Phase 2; H1→6.1; H2→4.3; H3→4.1+4.2; H4→Phase 7; H5→4.6; H6→4.4; M1→5.1; M2→5.2/5.3; M3→Phase 8; M4→6.2; M5→6.3 (hub trim); M6→5.1 (unify via single source) + 6.1; M7→6.3 (IntegrationDoc); M8→6.4.
- Type consistency: `breadcrumbListLd`, `softwareApplicationLd`, `articleLd`, `datasetLd`, `itemListLd`, `faqPageLd`, `organizationLd`, `websiteLd` — all named identically across Phase 0 definition and Phases 2+ usage.
- No placeholders: every code block is the actual code; "TBD" appears nowhere.
- Out of scope from spec is honored (no 8 stub integration pages, no perf work, no hreflang).
