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

// ─── Composition timing ──────────
// 0.0–0.5s : title bar fades in
// 0.5–3.5s : Panel 01 — Connect
// 3.5–6.5s : Panel 02 — Reconcile
// 6.5–9.0s : Panel 03 — Report
// 9.0–9.5s : outro loop fade
// total = 9.5s @ 30fps = 285 frames

const SOURCES = ["Fortnox", "Microsoft 365", "HubSpot", "QuickBooks", "Xero"];

export const HowItWorksLoop: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: DM_SANS, color: "white" }}>
      <BackgroundLayer />
      <TitleBar />

      {/* Three persistent panels — content within each gates by Sequence */}
      <PanelGrid />

      {/* Panel 01 — Connect (0.5s → 3.5s) */}
      <Sequence from={0.5 * fps} durationInFrames={3.0 * fps}>
        <ConnectPanel />
      </Sequence>

      {/* Panel 02 — Reconcile (3.5s → 6.5s) */}
      <Sequence from={3.5 * fps} durationInFrames={3.0 * fps}>
        <ReconcilePanel />
      </Sequence>

      {/* Panel 03 — Report (6.5s → 9.0s) */}
      <Sequence from={6.5 * fps} durationInFrames={2.5 * fps}>
        <ReportPanel />
      </Sequence>

      <OutroFade durationInFrames={durationInFrames} />
    </AbsoluteFill>
  );
};

/* ─── BACKGROUND ─── */
const BackgroundLayer: React.FC = () => {
  const frame = useCurrentFrame();
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

/* ─── TITLE BAR ─── */
const TitleBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dotPulse = 0.45 + 0.55 * Math.abs(Math.sin(frame / 7));
  const fadeIn = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 110,
        right: 110,
        opacity: fadeIn,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: MONO,
        fontSize: 16,
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
        <span>EFFICYON · How it works · animated</span>
      </div>
      <span style={{ color: "rgba(255,255,255,0.4)" }}>Three steps to clarity</span>
    </div>
  );
};

/* ─── PANEL GRID — three vertical columns, persistent ─── */
const PanelGrid: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        top: 130,
        left: 110,
        right: 110,
        bottom: 90,
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 0,
      }}
    >
      <PanelHeader number="01" label="Connect" />
      <PanelHeader number="02" label="Reconcile" />
      <PanelHeader number="03" label="Report" />
    </div>
  );
};

const PanelHeader: React.FC<{ number: string; label: string }> = ({ number, label }) => {
  return (
    <div
      style={{
        position: "relative",
        padding: "28px 32px 0 32px",
        borderRight: label === "Report" ? "none" : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 14,
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.1em",
          }}
        >
          {number}
        </span>
        <span style={{ width: 32, height: 1, background: GREEN }} />
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: "-0.025em",
          color: "white",
        }}
      >
        {label}
        <span
          style={{
            fontFamily: INSTRUMENT_SERIF,
            fontStyle: "italic",
            fontWeight: 400,
            color: "rgba(255,255,255,0.55)",
          }}
        >
          {label === "Connect" && " your systems"}
          {label === "Reconcile" && " the gap"}
          {label === "Report" && " in dollars"}
        </span>
      </div>
    </div>
  );
};

/* ─── PANEL 01 — CONNECT ─── */
/* Five source wordmarks light up as connections, with green dots pulsing in left to right */
const ConnectPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        position: "absolute",
        top: 220,
        left: 142,             // panel-01 column starts at left:110 + small inset
        width: `calc((100% - 220px) / 3 - 32px)`,
        bottom: 120,
        padding: "0 32px",
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.4)",
          marginBottom: 24,
        }}
      >
        ↳ OAuth · read-only
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {SOURCES.map((source, i) => {
          const dotIn = interpolate(frame, [(0.2 + i * 0.4) * fps, (0.45 + i * 0.4) * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const labelIn = interpolate(frame, [(0.3 + i * 0.4) * fps, (0.55 + i * 0.4) * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={source}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: GREEN,
                  boxShadow: `0 0 14px ${GREEN}`,
                  opacity: dotIn,
                  transform: `scale(${0.5 + dotIn * 0.5})`,
                }}
              />
              <span
                style={{
                  fontSize: 22,
                  color: `rgba(255,255,255,${0.4 + labelIn * 0.45})`,
                  fontWeight: 500,
                  letterSpacing: "-0.005em",
                  opacity: 0.5 + labelIn * 0.5,
                }}
              >
                {source}
              </span>
              <span
                style={{
                  flex: 1,
                  height: 1,
                  background: `linear-gradient(90deg, ${GREEN} ${labelIn * 60}%, rgba(255,255,255,0.08) ${labelIn * 60}%)`,
                  opacity: labelIn,
                }}
              />
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  color: GREEN,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  opacity: labelIn,
                }}
              >
                ✦ live
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── PANEL 02 — RECONCILE ─── */
/* Invoice card on left, usage card on right, scan beam connects them, mismatch highlights */
const ReconcilePanel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const invoiceIn = spring({ frame: frame - 0.1 * fps, fps, config: { damping: 22, stiffness: 110, mass: 0.6 } });
  const usageIn = spring({ frame: frame - 0.4 * fps, fps, config: { damping: 22, stiffness: 110, mass: 0.6 } });
  const scanProgress = interpolate(frame, [0.9 * fps, 1.6 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });
  const matchT = interpolate(frame, [1.7 * fps, 2.2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Panel 2 occupies the middle column. left:110 base + 2/6 of inner width.
  return (
    <div
      style={{
        position: "absolute",
        top: 220,
        left: `calc(110px + (100% - 220px) / 3 + 32px)`,
        width: `calc((100% - 220px) / 3 - 64px)`,
        bottom: 120,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {/* Invoice card */}
      <Card
        side="invoice"
        opacity={invoiceIn}
        translateY={(1 - invoiceIn) * 14}
        title="Microsoft 365"
        primary="$890 /mo"
        secondary="28 paid seats"
      />

      {/* Scan strip */}
      <div style={{ position: "relative", height: 24, display: "flex", alignItems: "center" }}>
        <div
          style={{
            flex: 1,
            height: 1,
            background: "rgba(255,255,255,0.12)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${scanProgress * 100}%`,
              background: GREEN,
              boxShadow: `0 0 14px ${GREEN}`,
            }}
          />
        </div>
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            background: BG,
            padding: "0 10px",
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: matchT > 0.5 ? GREEN : "rgba(255,255,255,0.4)",
          }}
        >
          {matchT > 0.5 ? "✦ Gap detected" : "Comparing…"}
        </span>
      </div>

      {/* Usage card */}
      <Card
        side="usage"
        opacity={usageIn}
        translateY={(1 - usageIn) * 14}
        title="Active 90d"
        primary={
          matchT > 0.3 ? (
            <>
              <span style={{ color: GREEN }}>10</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}> / </span>
              <span>28</span>
            </>
          ) : (
            "—"
          )
        }
        secondary={matchT > 0.5 ? "18 dormant · leak surfaced" : "scanning…"}
        highlight={matchT > 0.5}
      />
    </div>
  );
};

const Card: React.FC<{
  side: "invoice" | "usage";
  opacity: number;
  translateY: number;
  title: string;
  primary: React.ReactNode;
  secondary: string;
  highlight?: boolean;
}> = ({ side, opacity, translateY, title, primary, secondary, highlight }) => (
  <div
    style={{
      opacity,
      transform: `translateY(${translateY}px)`,
      border: `1px solid ${highlight ? GREEN : "rgba(255,255,255,0.1)"}`,
      padding: "14px 18px",
      background: "rgba(255,255,255,0.012)",
    }}
  >
    <div
      style={{
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.4)",
        marginBottom: 6,
      }}
    >
      ↳ {side === "invoice" ? "Invoice · Fortnox" : "Usage · Microsoft Graph"}
    </div>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 16, color: "rgba(255,255,255,0.65)" }}>{title}</span>
      <span style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
        {primary}
      </span>
    </div>
    <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{secondary}</div>
  </div>
);

/* ─── PANEL 03 — REPORT ─── */
const ReportPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardIn = spring({ frame, fps, config: { damping: 22, stiffness: 110, mass: 0.6 } });
  const counter = interpolate(frame, [0.4 * fps, 1.1 * fps], [0, 6200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const actionIn = interpolate(frame, [1.0 * fps, 1.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 220,
        left: `calc(110px + ((100% - 220px) / 3) * 2 + 32px)`,
        width: `calc((100% - 220px) / 3 - 64px)`,
        bottom: 120,
        opacity: cardIn,
        transform: `translateY(${(1 - cardIn) * 14}px)`,
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.22em",
          color: "rgba(255,255,255,0.4)",
          marginBottom: 14,
        }}
      >
        ↳ Monthly report · 1 of 4 findings
      </div>

      <div
        style={{
          border: `1px solid ${GREEN}`,
          padding: "20px 22px",
          background: "rgba(0,209,122,0.04)",
        }}
      >
        <div style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", marginBottom: 6 }}>
          Microsoft 365 over-provisioning
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span
            style={{
              fontSize: 56,
              fontWeight: 500,
              letterSpacing: "-0.04em",
              color: GREEN,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ${Math.round(counter).toLocaleString("en-US")}
          </span>
          <span
            style={{
              fontFamily: INSTRUMENT_SERIF,
              fontStyle: "italic",
              fontSize: 24,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            /yr
          </span>
        </div>
        <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
          17 dormant seats — Business Std. → downgrade
        </div>

        <div
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop: "1px solid rgba(0,209,122,0.25)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            opacity: actionIn,
            transform: `translateY(${(1 - actionIn) * 6}px)`,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: GREEN,
              border: `1px solid ${GREEN}`,
              padding: "4px 10px",
            }}
          >
            ↳ Action · Downgrade 17 seats
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          fontFamily: INSTRUMENT_SERIF,
          fontStyle: "italic",
          fontSize: 18,
          color: "rgba(255,255,255,0.45)",
          opacity: actionIn,
        }}
      >
        Three more findings in the same report.
      </div>
    </div>
  );
};

/* ─── OUTRO FADE ─── */
const OutroFade: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [durationInFrames - 0.5 * fps, durationInFrames - 1],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <AbsoluteFill style={{ background: BG, opacity, pointerEvents: "none" }} />
  );
};
