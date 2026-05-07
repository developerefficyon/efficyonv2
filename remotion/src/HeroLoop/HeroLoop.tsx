import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { loadFont as loadDmSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";

// Specify only the weights/subsets used in this composition for smaller bundles.
const { fontFamily: DM_SANS } = loadDmSans("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
});
const { fontFamily: INSTRUMENT_SERIF } = loadInstrumentSerif("italic", {
  weights: ["400"],
  subsets: ["latin"],
});
const { fontFamily: MONO } = loadJetBrainsMono("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
});

const GREEN = "#00D17A";
const BG = "#080809";

interface Finding {
  tool: string;
  desc: string;
  amount: number;
}

const FINDINGS: Finding[] = [
  { tool: "Microsoft 365", desc: "10 over-provisioned licenses", amount: 6200 },
  { tool: "HubSpot", desc: "5 of 8 seats unused for 90 days", amount: 4300 },
  { tool: "Intercom", desc: "Replaced internally — still billing", amount: 3250 },
  { tool: "Price drift", desc: "Unnoticed renewal increases · 3 vendors", amount: 2700 },
];

const TOTAL = FINDINGS.reduce((s, f) => s + f.amount, 0);

const fmt = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US");

export const HeroLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ─── timing (in seconds, then × fps) ──────────────
  const eyebrowIn = 0;                  // 0.00s
  const headlineIn = 0.4 * fps;         // 0.40s
  const tableHeaderIn = 1.2 * fps;      // 1.20s
  const rowsStart = 1.5 * fps;          // 1.50s
  const rowStagger = 0.55 * fps;        // each row 550ms apart
  const totalReveal = rowsStart + rowStagger * FINDINGS.length + 0.2 * fps;
  // counter animates over ~1.4s after last row
  const counterStart = totalReveal;
  const counterEnd = counterStart + 1.4 * fps;
  // outro fade — last 0.6s — for seamless loop
  const fadeStart = durationInFrames - 0.6 * fps;

  // ─── derived animations ──────────────────────────
  const eyebrowOpacity = interpolate(frame, [eyebrowIn, eyebrowIn + 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  const headlineSpring = spring({
    frame: frame - headlineIn,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.7 },
  });

  const tableHeaderOpacity = interpolate(
    frame,
    [tableHeaderIn, tableHeaderIn + 14],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  const counter = interpolate(frame, [counterStart, counterEnd], [0, TOTAL], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const outroOpacity = interpolate(
    frame,
    [fadeStart, durationInFrames - 1],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: BG,
        fontFamily: DM_SANS,
        color: "white",
        opacity: outroOpacity,
      }}
    >
      {/* Radial green wash, top-left */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 8% -10%, rgba(0,209,122,0.18), transparent 60%), radial-gradient(ellipse 45% 35% at 96% 6%, rgba(0,209,122,0.07), transparent 65%)",
        }}
      />

      {/* Subtle grid */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          opacity: 0.6,
        }}
      />

      {/* Content frame */}
      <AbsoluteFill
        style={{
          padding: "110px 140px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            opacity: eyebrowOpacity,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: GREEN,
              boxShadow: `0 0 18px ${GREEN}`,
              opacity: 0.5 + 0.5 * Math.sin(frame / 8),
            }}
          />
          <span
            style={{
              fontFamily: MONO,
              fontSize: 18,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Efficyon scan · live · {String(Math.floor(frame / fps)).padStart(2, "0")}:
            {String(Math.floor((frame % fps) * (60 / fps))).padStart(2, "0")}
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            opacity: headlineSpring,
            transform: `translateY(${(1 - headlineSpring) * 24}px)`,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 110,
              fontWeight: 500,
              lineHeight: 0.96,
              letterSpacing: "-0.045em",
              maxWidth: "16ch",
            }}
          >
            Stop paying for{" "}
            <span
              style={{
                fontFamily: INSTRUMENT_SERIF,
                fontStyle: "italic",
                fontWeight: 400,
                color: "rgba(255,255,255,0.85)",
              }}
            >
              SaaS
            </span>{" "}
            you{" "}
            <span
              style={{
                fontFamily: INSTRUMENT_SERIF,
                fontStyle: "italic",
                fontWeight: 400,
                color: GREEN,
              }}
            >
              don&apos;t use.
            </span>
          </h1>
        </div>

        {/* Findings table */}
        <div style={{ opacity: tableHeaderOpacity }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 18,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              fontFamily: MONO,
              fontSize: 13,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            <span>Live finding stream</span>
            <span>Annual leak</span>
          </div>

          {FINDINGS.map((f, i) => {
            const start = rowsStart + i * rowStagger;
            const rowSpring = spring({
              frame: frame - start,
              fps,
              config: { damping: 22, stiffness: 100, mass: 0.6 },
            });
            return (
              <Row
                key={f.tool}
                tool={f.tool}
                desc={f.desc}
                amount={f.amount}
                progress={rowSpring}
              />
            );
          })}

          {/* Total */}
          <div
            style={{
              marginTop: 32,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              opacity: interpolate(
                frame,
                [counterStart - 8, counterStart + 8],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 14,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              Total — 18-person company
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span
                style={{
                  fontSize: 72,
                  fontWeight: 500,
                  letterSpacing: "-0.04em",
                  color: GREEN,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmt(counter)}
              </span>
              <span
                style={{
                  fontFamily: INSTRUMENT_SERIF,
                  fontStyle: "italic",
                  fontSize: 32,
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                /yr
              </span>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── ROW ──────────────────────────────────────────
const Row: React.FC<{
  tool: string;
  desc: string;
  amount: number;
  progress: number;
}> = ({ tool, desc, amount, progress }) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr auto",
        alignItems: "baseline",
        gap: 32,
        padding: "22px 0",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        opacity: progress,
        transform: `translateX(${(1 - progress) * -24}px)`,
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: 14,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.7)",
        }}
      >
        {tool}
      </span>
      <span style={{ fontSize: 22, lineHeight: 1.4, color: "rgba(255,255,255,0.85)" }}>
        {desc}
      </span>
      <span
        style={{
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: GREEN,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmt(amount)}
        <span
          style={{
            marginLeft: 6,
            fontFamily: MONO,
            fontSize: 14,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          /yr
        </span>
      </span>
    </div>
  );
};
