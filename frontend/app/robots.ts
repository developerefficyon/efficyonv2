import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/features/",
          "/solutions/",
          "/compare/",
          "/blog/",
          "/integrations/",
          "/calculator/",
          "/tools/",
          "/benchmarks/",
        ],
        disallow: [
          "/dashboard/",
          "/api/",
          "/login",
          "/register",
          "/verify-email",
          "/onboarding",
          "/onboarding-payment",
          "/invite/",
          "/auth/",
          "/reset-password",
          "/forgot-password",
        ],
      },
    ],
    sitemap: "https://www.efficyon.com/sitemap.xml",
  }
}
