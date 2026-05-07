import { ImageResponse } from "next/og"
import { blogPosts } from "@/lib/blog-data"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Efficyon blog post"

export async function generateImageMetadata() {
  return blogPosts.map((p) => ({
    id: p.slug,
    alt: p.title,
    size,
    contentType,
  }))
}

export default function OG({ params }: { params: { slug: string } }) {
  const post = blogPosts.find((p) => p.slug === params.slug)
  const title = post?.title ?? "Efficyon Blog"
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#080809",
          color: "#fff",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 24,
            color: "#00D17A",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          ✦ Efficyon · Blog
        </div>
        <div
          style={{
            marginTop: "auto",
            fontSize: 64,
            lineHeight: 1.1,
            fontWeight: 500,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>
      </div>
    ),
    { ...size }
  )
}
