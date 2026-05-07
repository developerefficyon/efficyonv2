import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  Sequence,
} from "remotion";
import { loadFont as loadDmSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";
import { z } from "zod";

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
const RED = "#FF6B5B";
const BG = "#080809";

/* ─── Zod schema for parameterized compositions ─── */
export const VendorSchema = z.object({
  name: z.string(),
  monthlyCost: z.number(),
  paidSeats: z.number(),
  activeSeats: z.number(),
  leakAnnual: z.number(),
});

export const HeroLoopSchema = z.object({
  brandLabel: z.string(),       // e.g. "Fortnox", "QuickBooks"
  invoiceSource: z.string(),    // e.g. "Invoice · Fortnox"
  usageSource: z.string(),      // e.g. "Usage · API + activity logs"
  totalLabel: z.string(),       // e.g. "Annual leak · sample 18-person stack"
  vendors: z.array(VendorSchema).min(1).max(6),
});

export type HeroLoopProps = z.infer<typeof HeroLoopSchema>;

/* ─── Default props (the generic homepage version) ─── */
export const defaultHeroLoopProps: HeroLoopProps = {
  brandLabel: "Efficyon",
  invoiceSource: "Invoice · Accounting feed",
  usageSource: "Usage · API + activity logs",
  totalLabel: "Annual leak · sample 18-person stack",
  vendors: [
    { name: "Microsoft 365", monthlyCost: 890, paidSeats: 28, activeSeats: 10, leakAnnual: 6200 },
    { name: "HubSpot Pro", monthlyCost: 640, paidSeats: 8, activeSeats: 3, leakAnnual: 4300 },
    { name: "Intercom", monthlyCost: 270, paidSeats: 6, activeSeats: 0, leakAnnual: 3250 },
    { name: "Notion / Asana / Slack", monthlyCost: 225, paidSeats: 18, activeSeats: 14, leakAnnual: 2700 },
  ],
};

// ─── timing (seconds) ──────────
const T = {
  intro: 0.6,            // "engine engaging"
  perVendor: 1.4,        // each row gets 1.4s to scan + reveal
  totalBeat: 1.4,        // final total reveal
};

const fmt = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US");

export const HeroLoop: React.FC<HeroLoopProps> = ({
  brandLabel,
  invoiceSource,
  usageSource,
  totalLabel,
  vendors,
}) => {
  const { fps, durationInFrames } = useVideoConfig();

  const introFrames = T.intro * fps;
  const vendorFrames = T.perVendor * fps;
  const totalFrames = T.totalBeat * fps;

  const vendorStart = (i: number) => introFrames + i * vendorFrames;
  const totalStart = introFrames + vendors.length * vendorFrames;
  const totalLeak = vendors.reduce((s, v) => s + v.leakAnnual, 0);

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: DM_SANS, color: "white" }}>
      <BackgroundLayer />
      <TitleBar brandLabel={brandLabel} />
      <ScanProgress start={introFrames} end={totalStart} />

      {/* Vendor reconciliation rows — only one shown at a time */}
      {vendors.map((v, i) => (
        <Sequence
          key={v.name + i}
          from={vendorStart(i)}
          durationInFrames={vendorFrames + 4}
          layout="none"
        >
          <ReconciliationCard
            vendor={v}
            invoiceSource={invoiceSource}
            usageSource={usageSource}
          />
        </Sequence>
      ))}

      {/* Final total */}
      <Sequence from={totalStart} durationInFrames={totalFrames + 12} layout="none">
        <TotalSummary totalLeak={totalLeak} totalLabel={totalLabel} />
      </Sequence>

      {/* Outro fade for seamless loop */}
      <OutroFade durationInFrames={durationInFrames} />
    </AbsoluteFill>
  );
};

// ───────────────────────────── BACKGROUND ─────────────────────────────
const BackgroundLayer: React.FC = () => {
  const frame = useCurrentFrame();
  // very slow drift in green wash to keep it alive without being noisy
  const drift = Math.sin(frame / 80) * 8;
  return (
    <>
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(ellipse 55% 45% at ${10 + drift}% -8%, rgba(0,209,122,0.18), transparent 60%),` +
            `radial-gradient(ellipse 45% 35% at ${95 - drift}% 6%, rgba(0,209,122,0.06), transparent 65%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          opacity: 0.55,
        }}
      />
    </>
  );
};

// ───────────────────────────── TITLE BAR ─────────────────────────────
const TitleBar: React.FC<{ brandLabel: string }> = ({ brandLabel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = Math.floor(frame / fps);
  const ms = Math.floor(((frame / fps) - seconds) * 100);
  const dotPulse = 0.45 + 0.55 * Math.abs(Math.sin(frame / 7));

  return (
    <div
      style={{
        position: "absolute",
        top: 70,
        left: 110,
        right: 110,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: MONO,
        fontSize: 18,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.55)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: GREEN,
            boxShadow: `0 0 18px ${GREEN}`,
            opacity: dotPulse,
          }}
        />
        <span>{brandLabel.toUpperCase()} × EFFICYON · Reconciliation · running</span>
      </div>
      <span style={{ fontVariantNumeric: "tabular-nums", color: "rgba(255,255,255,0.4)" }}>
        T+ 00:{String(seconds).padStart(2, "0")}.{String(ms).padStart(2, "0")}
      </span>
    </div>
  );
};

// ───────────────────────────── SCAN PROGRESS ─────────────────────────────
const ScanProgress: React.FC<{ start: number; end: number }> = ({ start, end }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.45, 0, 0.15, 1),
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 110,
        left: 110,
        right: 110,
        height: 1,
        background: "rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress * 100}%`,
          background: GREEN,
          boxShadow: `0 0 16px ${GREEN}`,
        }}
      />
    </div>
  );
};

// ───────────────────────────── RECONCILIATION CARD ─────────────────────────────
type Vendor = z.infer<typeof VendorSchema>;
const ReconciliationCard: React.FC<{
  vendor: Vendor;
  invoiceSource: string;
  usageSource: string;
}> = ({ vendor, invoiceSource, usageSource }) => {
  const frame = useCurrentFrame(); // local to the Sequence
  const { fps } = useVideoConfig();

  // Phases inside each card (in seconds, then × fps):
  // 0.00 - 0.30s: card slides in
  // 0.30 - 0.85s: SCAN sweeping
  // 0.85 - 1.40s: result reveals (leak amount, dormant seats highlight)
  const slideIn = spring({ frame, fps, config: { damping: 22, stiffness: 130, mass: 0.6 } });
  const scanT = interpolate(frame, [0.3 * fps, 0.85 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });
  const resultT = interpolate(frame, [0.85 * fps, 1.25 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // counter ticks during result phase
  const counter = interpolate(frame, [0.95 * fps, 1.4 * fps], [0, vendor.leakAnnual], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const dormantSeats = vendor.paidSeats - vendor.activeSeats;
  const isComplete = scanT >= 1;

  return (
    <AbsoluteFill
      style={{
        opacity: slideIn,
        transform: `translateY(${(1 - slideIn) * 24}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 110,
          right: 110,
          transform: "translateY(-50%)",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 60,
        }}
      >
        {/* INVOICE side */}
        <Side label={invoiceSource} align="right">
          <div style={{ fontSize: 28, color: "rgba(255,255,255,0.5)" }}>{vendor.name}</div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 500,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ${vendor.monthlyCost}
            <span style={{ fontFamily: INSTRUMENT_SERIF, fontStyle: "italic", fontSize: 36, color: "rgba(255,255,255,0.5)" }}> /mo</span>
          </div>
          <div style={{ marginTop: 18 }}>
            <SeatGrid total={vendor.paidSeats} active={vendor.paidSeats} dim={false} />
            <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 14, color: "rgba(255,255,255,0.45)", letterSpacing: "0.16em", textTransform: "uppercase" }}>
              {vendor.paidSeats} seats paid
            </div>
          </div>
        </Side>

        {/* CONNECTOR — animated */}
        <Connector progress={scanT} resultT={resultT} />

        {/* USAGE side */}
        <Side label={usageSource} align="left">
          <div style={{ fontSize: 28, color: "rgba(255,255,255,0.5)" }}>Last 90 days</div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 500,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.round(scanT * vendor.activeSeats)}
            <span style={{ fontFamily: INSTRUMENT_SERIF, fontStyle: "italic", fontSize: 36, color: "rgba(255,255,255,0.5)" }}> active</span>
          </div>
          <div style={{ marginTop: 18 }}>
            <SeatGrid
              total={vendor.paidSeats}
              active={isComplete ? vendor.activeSeats : Math.round(scanT * vendor.activeSeats)}
              dim={isComplete}
            />
            <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 14, letterSpacing: "0.16em", textTransform: "uppercase" }}>
              <span style={{ color: GREEN, opacity: scanT }}>{Math.round(scanT * vendor.activeSeats)} active</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}> · </span>
              <span style={{ color: RED, opacity: resultT }}>{dormantSeats} dormant 90d</span>
            </div>
          </div>
        </Side>
      </div>

      {/* Result strip below card */}
      <div
        style={{
          position: "absolute",
          bottom: 130,
          left: 110,
          right: 110,
          opacity: resultT,
          transform: `translateY(${(1 - resultT) * 12}px)`,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          paddingTop: 28,
          borderTop: `1px solid ${GREEN}`,
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
          ✦ Leak surfaced — {vendor.name}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontVariantNumeric: "tabular-nums" }}>
          <span style={{ fontSize: 64, fontWeight: 500, letterSpacing: "-0.035em", color: GREEN, lineHeight: 1 }}>
            {fmt(counter)}
          </span>
          <span style={{ fontFamily: INSTRUMENT_SERIF, fontStyle: "italic", fontSize: 28, color: "rgba(255,255,255,0.5)" }}>
            /yr
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── SIDE ─────────────────────────────
const Side: React.FC<{
  label: string;
  align: "left" | "right";
  children: React.ReactNode;
}> = ({ label, align, children }) => (
  <div style={{ textAlign: align, display: "flex", flexDirection: "column", gap: 14, alignItems: align === "right" ? "flex-end" : "flex-start" }}>
    <div
      style={{
        fontFamily: MONO,
        fontSize: 13,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.4)",
      }}
    >
      {label}
    </div>
    {children}
  </div>
);

// ───────────────────────────── CONNECTOR ─────────────────────────────
const Connector: React.FC<{ progress: number; resultT: number }> = ({ progress, resultT }) => {
  const dotCount = 9;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        minWidth: 140,
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 12,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: resultT > 0.4 ? GREEN : "rgba(255,255,255,0.4)",
        }}
      >
        {resultT > 0.4 ? "✦ Match" : "Scanning..."}
      </div>

      {/* Dotted scan line */}
      <div style={{ display: "flex", gap: 10 }}>
        {Array.from({ length: dotCount }).map((_, i) => {
          const dotActive = progress * dotCount > i;
          return (
            <span
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: dotActive ? GREEN : "rgba(255,255,255,0.12)",
                boxShadow: dotActive ? `0 0 12px ${GREEN}` : "none",
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          fontFamily: INSTRUMENT_SERIF,
          fontStyle: "italic",
          fontSize: 22,
          color: resultT > 0.4 ? "rgba(255,107,91,0.9)" : "rgba(255,255,255,0.3)",
          opacity: resultT,
        }}
      >
        gap detected
      </div>
    </div>
  );
};

// ───────────────────────────── SEAT GRID ─────────────────────────────
const SeatGrid: React.FC<{ total: number; active: number; dim: boolean }> = ({ total, active, dim }) => {
  const cols = Math.min(14, total);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 14px)`,
        gap: 6,
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i < active;
        return (
          <span
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: isActive
                ? GREEN
                : dim
                ? "rgba(255,107,91,0.18)"
                : "rgba(255,255,255,0.1)",
              border: isActive
                ? "none"
                : dim
                ? `1px solid rgba(255,107,91,0.45)`
                : "1px solid rgba(255,255,255,0.15)",
              boxShadow: isActive ? `0 0 8px ${GREEN}` : "none",
            }}
          />
        );
      })}
    </div>
  );
};

// ───────────────────────────── TOTAL SUMMARY ─────────────────────────────
const TotalSummary: React.FC<{ totalLeak: number; totalLabel: string }> = ({
  totalLeak,
  totalLabel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({ frame, fps, config: { damping: 22, stiffness: 90, mass: 0.7 } });
  const counter = interpolate(frame, [0, 1.0 * fps], [0, totalLeak], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill
      style={{
        opacity: fadeIn,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 28,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 16,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        ✦ Reconciliation complete
      </div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 500,
          lineHeight: 1.05,
          letterSpacing: "-0.035em",
          maxWidth: "20ch",
          color: "rgba(255,255,255,0.85)",
        }}
      >
        <span style={{ fontFamily: INSTRUMENT_SERIF, fontStyle: "italic", fontWeight: 400, color: GREEN }}>
          {totalLabel}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, fontVariantNumeric: "tabular-nums" }}>
        <span
          style={{
            fontSize: 200,
            fontWeight: 500,
            letterSpacing: "-0.05em",
            color: GREEN,
            lineHeight: 0.9,
          }}
        >
          {fmt(counter)}
        </span>
        <span
          style={{
            fontFamily: INSTRUMENT_SERIF,
            fontStyle: "italic",
            fontSize: 64,
            color: "rgba(255,255,255,0.55)",
          }}
        >
          /yr
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── OUTRO FADE ─────────────────────────────
const OutroFade: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [durationInFrames - 0.6 * fps, durationInFrames - 1],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <AbsoluteFill
      style={{
        background: BG,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
};
