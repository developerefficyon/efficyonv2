import type { MetadataRoute } from "next"
import { blogPosts as blogPostData } from "@/lib/blog-data"
import { saasTools } from "@/lib/saas-tools-data"
import { benchmarkPages } from "@/lib/benchmark-data"
import { INTEGRATION_DOCS } from "@/lib/integration-docs"

const baseUrl = "https://www.efficyon.com"

// Feature pages
const features = [
  "saas-cost-optimization",
  "subscription-tracking",
  "duplicate-payment-detection",
  "unused-license-detection",
  "saas-spend-management",
  "ai-cost-analysis",
  "software-audit",
]

// Solution pages
const solutions = [
  "for-startups",
  "for-finance-teams",
  "for-it-managers",
  "for-cfo",
  "for-enterprise",
]

// Comparison pages
const comparisons = [
  "efficyon-vs-zylo",
  "efficyon-vs-torii",
  "efficyon-vs-cleanshelf",
  "efficyon-vs-productiv",
  "efficyon-vs-spreadsheets",
  "best-saas-cost-optimization-tools",
]

// Integration pages
const integrations = ["fortnox", "stripe", "quickbooks", "xero"]

// Calculator pages
const calculators = ["saas-cost", "roi", "waste-estimator"]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const pages: MetadataRoute.Sitemap = [
    // ─── Top-level pages ──────────────────────────────────────────
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ]

  // ─── Section hub pages ─────────────────────────────────────────
  const hubs: { path: string; priority: number }[] = [
    { path: "/features", priority: 0.9 },
    { path: "/integrations", priority: 0.9 },
    { path: "/solutions", priority: 0.8 },
    { path: "/compare", priority: 0.8 },
    { path: "/calculator", priority: 0.8 },
    { path: "/benchmarks", priority: 0.7 },
    { path: "/blog", priority: 0.8 },
    { path: "/tools", priority: 0.7 },
    { path: "/docs/integrations", priority: 0.7 },
  ]
  hubs.forEach(({ path, priority }) =>
    pages.push({
      url: `${baseUrl}${path}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority,
    })
  )

  // ─── Feature pages ─────────────────────────────────────────────
  features.forEach((slug) =>
    pages.push({
      url: `${baseUrl}/features/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    })
  )

  // ─── Solution pages ────────────────────────────────────────────
  solutions.forEach((slug) =>
    pages.push({
      url: `${baseUrl}/solutions/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    })
  )

  // ─── Comparison pages ──────────────────────────────────────────
  comparisons.forEach((slug) =>
    pages.push({
      url: `${baseUrl}/compare/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    })
  )

  // ─── Integration pages ─────────────────────────────────────────
  integrations.forEach((slug) =>
    pages.push({
      url: `${baseUrl}/integrations/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    })
  )

  // ─── Integration setup docs ────────────────────────────────────
  INTEGRATION_DOCS.forEach((doc) =>
    pages.push({
      url: `${baseUrl}/docs/integrations/${doc.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    })
  )

  // ─── Calculator pages ──────────────────────────────────────────
  calculators.forEach((slug) =>
    pages.push({
      url: `${baseUrl}/calculator/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    })
  )

  // ─── Blog posts ────────────────────────────────────────────────
  blogPostData.forEach((post) =>
    pages.push({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updatedDate),
      changeFrequency: "monthly",
      priority: post.featured ? 0.9 : 0.7,
    })
  )

  // ─── Benchmark pages ───────────────────────────────────────────
  // Note: Next.js sitemap changeFrequency only supports
  // always|hourly|daily|weekly|monthly|yearly|never — using "monthly"
  // for benchmarks (refreshed on industry-data revisions).
  benchmarkPages.forEach((benchmark) =>
    pages.push({
      url: `${baseUrl}/benchmarks/${benchmark.slug}`,
      lastModified: new Date(benchmark.lastUpdated),
      changeFrequency: "monthly",
      priority: 0.6,
    })
  )

  // ─── Tool analysis pages ───────────────────────────────────────
  saasTools.forEach((tool) =>
    pages.push({
      url: `${baseUrl}/tools/${tool.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    })
  )

  return pages
}
