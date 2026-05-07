import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/changelog",
          "/features/",
          "/solutions/",
          "/compare/",
          "/blog/",
          "/integrations/",
          "/calculator/",
          "/tools/",
          "/benchmarks/",
          "/docs/",
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
