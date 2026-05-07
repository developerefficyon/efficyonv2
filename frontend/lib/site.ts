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
