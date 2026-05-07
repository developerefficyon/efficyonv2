import { ImageResponse } from "next/og"
import { saasTools } from "@/lib/saas-tools-data"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Efficyon — SaaS tool analysis"

export default function OG({ params }: { params: { slug: string } }) {
  const tool = saasTools.find((t) => t.slug === params.slug)
  const name = tool?.name ?? "SaaS Tool"
  const category = tool?.category ?? ""
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
          ✦ Efficyon · {category || "Tools Directory"}
        </div>
        <div
          style={{
            marginTop: "auto",
            fontSize: 84,
            lineHeight: 1.05,
            fontWeight: 500,
            letterSpacing: "-0.025em",
          }}
        >
          {name}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 22,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          Common waste patterns + cost analysis
        </div>
      </div>
    ),
    { ...size }
  )
}
