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
