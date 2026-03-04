import type { MetadataRoute } from "next"
import { blogPosts as blogPostData } from "@/lib/blog-data"
import { saasTools } from "@/lib/saas-tools-data"
import { benchmarkPages } from "@/lib/benchmark-data"

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

// Blog posts (pillar + supporting)
const blogPosts = [
  "complete-guide-saas-cost-optimization",
  "how-to-audit-software-subscriptions",
  "saas-sprawl-hidden-cost",
  "cfo-guide-software-spend-management",
  "find-cancel-unused-saas-subscriptions",
  "average-saas-spend-per-employee-2026",
  "signs-company-has-saas-sprawl",
  "how-to-calculate-saas-roi",
  "subscription-fatigue-why-companies-overspend",
  "build-software-procurement-policy",
  "saas-vs-on-premise-cost-comparison",
  "negotiate-better-saas-contracts",
  "real-cost-duplicate-software-tools",
  "create-saas-inventory-business",
]

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ]

  // Add feature pages
  features.forEach((slug) =>
    pages.push({
      url: `${baseUrl}/features/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    })
  )

  // Add solution pages
  solutions.forEach((slug) =>
    pages.push({
      url: `${baseUrl}/solutions/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    })
  )

  // Add comparison pages
  comparisons.forEach((slug) =>
    pages.push({
      url: `${baseUrl}/compare/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    })
  )

  // Add integration pages
  integrations.forEach((slug) =>
    pages.push({
      url: `${baseUrl}/integrations/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    })
  )

  // Add calculator pages
  calculators.forEach((slug) =>
    pages.push({
      url: `${baseUrl}/calculator/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    })
  )

  // Add blog index
  pages.push({
    url: `${baseUrl}/blog`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  })

  // Add blog posts (from blog-data.ts for accurate dates)
  blogPostData.forEach((post) =>
    pages.push({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updatedDate),
      changeFrequency: "monthly",
      priority: post.featured ? 0.9 : 0.7,
    })
  )

  // Add benchmark index
  pages.push({
    url: `${baseUrl}/benchmarks`,
    lastModified: new Date(),
    changeFrequency: "quarterly",
    priority: 0.7,
  })

  // Add benchmark pages
  benchmarkPages.forEach((benchmark) =>
    pages.push({
      url: `${baseUrl}/benchmarks/${benchmark.slug}`,
      lastModified: new Date(benchmark.lastUpdated),
      changeFrequency: "quarterly",
      priority: 0.6,
    })
  )

  // Add tools index
  pages.push({
    url: `${baseUrl}/tools`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  })

  // Add tool analysis pages
  saasTools.forEach((tool) =>
    pages.push({
      url: `${baseUrl}/tools/${tool.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    })
  )

  return pages
}
