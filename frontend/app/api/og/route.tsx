import { ImageResponse } from "next/og"

export const runtime = "edge"

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo */}
        <img
          src="https://www.efficyon.com/logo.png"
          width={120}
          height={120}
          style={{ marginBottom: 32 }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: "#ffffff",
            marginBottom: 16,
            letterSpacing: "-0.02em",
          }}
        >
          Efficyon
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: "#94a3b8",
            maxWidth: 700,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          AI-Powered SaaS Cost Optimization
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 18,
            color: "#64748b",
            maxWidth: 800,
            textAlign: "center",
            lineHeight: 1.5,
            marginTop: 20,
          }}
        >
          Turn SaaS sprawl into financial clarity. Reveal unused licenses,
          overlapping tools, and hidden savings.
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: 40,
            padding: "14px 40px",
            borderRadius: 9999,
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            color: "#ffffff",
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          Start saving on SaaS today
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
