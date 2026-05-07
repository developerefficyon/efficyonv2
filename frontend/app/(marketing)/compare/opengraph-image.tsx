import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Efficyon — Compare"

export default function OG() {
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
            fontSize: 28,
            color: "#00D17A",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          ✦ Efficyon · Compare
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
          Honest comparisons. No spin.
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 22,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          Built in Gothenburg, Sweden · EU-hosted
        </div>
      </div>
    ),
    { ...size }
  )
}
