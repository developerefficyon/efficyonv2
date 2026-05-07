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
