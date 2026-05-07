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

/* ─── Schema ─── */
export const CompareRowSchema = z.object({
  vendor: z.string(),
  monthlyCost: z.number(),
  paidSeats: z.number(),
  activeSeats: z.number(),
  leakAnnual: z.number(),
  action: z.string(), // e.g. "Downgrade to Standard"
});

export const CompareLoopSchema = z.object({
  competitorName: z.string(),     // e.g. "Spreadsheet" or "Zylo"
  competitorMode: z.enum(["spreadsheet", "discovery"]), // controls which left columns to show
  scenarioLabel: z.string(),      // e.g. "Q4 audit · 22 vendors"
  scenarioTitle: z.string(),      // e.g. "Same data, two outputs."
  rows: z.array(CompareRowSchema).min(2).max(5),
});

export type CompareLoopProps = z.infer<typeof CompareLoopSchema>;
type CompareRow = z.infer<typeof CompareRowSchema>;

/* ─── Default props (Spreadsheet variant) ─── */
export const defaultCompareSpreadsheetsProps: CompareLoopProps = {
  competitorName: "Spreadsheet",
  competitorMode: "spreadsheet",
  scenarioLabel: "Q4 SaaS audit · 22 vendors · same input data",
  scenarioTitle: "Same data, two outputs.",
  rows: [
    { vendor: "Microsoft 365", monthlyCost: 890, paidSeats: 28, activeSeats: 10, leakAnnual: 6200, action: "Downgrade · 17 seats" },
    { vendor: "HubSpot Pro", monthlyCost: 640, paidSeats: 8, activeSeats: 3, leakAnnual: 4300, action: "Cancel · 5 seats" },
    { vendor: "Intercom", monthlyCost: 270, paidSeats: 6, activeSeats: 0, leakAnnual: 3250, action: "Cancel · replaced" },
    { vendor: "Adobe CC", monthlyCost: 220, paidSeats: 4, activeSeats: 1, leakAnnual: 2200, action: "Downgrade · 3 seats" },
  ],
};

/* ─── Default props (Zylo variant) ─── */
export const defaultCompareZyloProps: CompareLoopProps = {
  competitorName: "Zylo",
  competitorMode: "discovery",
  scenarioLabel: "Q4 audit · 22 vendors · same discovery data",
  scenarioTitle: "Same discovery, different decisions.",
  rows: [
    { vendor: "Microsoft 365", monthlyCost: 890, paidSeats: 28, activeSeats: 10, leakAnnual: 6200, action: "Downgrade · 17 seats" },
    { vendor: "HubSpot Pro", monthlyCost: 640, paidSeats: 8, activeSeats: 3, leakAnnual: 4300, action: "Cancel · 5 seats" },
    { vendor: "Salesforce", monthlyCost: 1500, paidSeats: 12, activeSeats: 5, leakAnnual: 8400, action: "Renegotiate · 7 seats" },
    { vendor: "Adobe CC", monthlyCost: 220, paidSeats: 4, activeSeats: 1, leakAnnual: 2200, action: "Downgrade · 3 seats" },
  ],
};

/* ─── timing (seconds) ─── */
const T = {
  intro: 1.0,        // title + scenario fade
  headers: 0.4,      // table headers
  perRow: 1.2,       // each row 1.2s
  punchline: 1.6,    // final callout
};

const fmtUSD = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

/* ─── ROOT ─── */
export const CompareLoop: React.FC<CompareLoopProps> = (props) => {
  const { fps, durationInFrames } = useVideoConfig();

  const introFrames = T.intro * fps;
  const headerFrames = T.headers * fps;
  const perRowFrames = T.perRow * fps;

  const headerStart = introFrames;
  const rowsStart = headerStart + headerFrames;
  const punchlineStart = rowsStart + perRowFrames * props.rows.length;

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: DM_SANS, color: "white" }}>
      <BackgroundLayer />
      <TitleBar competitorName={props.competitorName} />

      {/* Scenario card */}
      <Sequence from={0} durationInFrames={durationInFrames} layout="none">
        <ScenarioCard label={props.scenarioLabel} title={props.scenarioTitle} />
      </Sequence>

      {/* Headers */}
      <Sequence from={headerStart} durationInFrames={durationInFrames - headerStart} layout="none">
        <TableHeaders competitorName={props.competitorName} mode={props.competitorMode} />
      </Sequence>

      {/* Rows */}
      {props.rows.map((row, i) => (
        <Sequence
          key={row.vendor + i}
          from={rowsStart + i * perRowFrames}
          durationInFrames={durationInFrames - (rowsStart + i * perRowFrames)}
          layout="none"
        >
          <CompareRowView row={row} index={i} mode={props.competitorMode} />
        </Sequence>
      ))}

      {/* Punchline */}
      <Sequence from={punchlineStart} durationInFrames={durationInFrames - punchlineStart} layout="none">
        <Punchline competitorName={props.competitorName} mode={props.competitorMode} />
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
const TitleBar: React.FC<{ competitorName: string }> = ({ competitorName }) => {
  const frame = useCurrentFrame();
  const dotPulse = 0.45 + 0.55 * Math.abs(Math.sin(frame / 7));
  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 110,
        right: 110,
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
        <span>{competitorName.toUpperCase()} vs. EFFICYON · Side-by-side</span>
      </div>
      <span style={{ color: "rgba(255,255,255,0.4)" }}>Compare engine · running</span>
    </div>
  );
};

/* ─── SCENARIO CARD ─── */
const ScenarioCard: React.FC<{ label: string; title: string }> = ({ label, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = spring({ frame, fps, config: { damping: 22, stiffness: 90, mass: 0.7 } });

  return (
    <div
      style={{
        position: "absolute",
        top: 130,
        left: 110,
        right: 110,
        opacity: fadeIn,
        transform: `translateY(${(1 - fadeIn) * 12}px)`,
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 13,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
          marginBottom: 14,
        }}
      >
        ✦ Scenario · {label}
      </div>
      <div
        style={{
          fontSize: 64,
          fontWeight: 500,
          letterSpacing: "-0.035em",
          lineHeight: 1.05,
          maxWidth: "20ch",
        }}
      >
        <span style={{ fontFamily: INSTRUMENT_SERIF, fontStyle: "italic", fontWeight: 400 }}>
          {title}
        </span>
      </div>
    </div>
  );
};

/* ─── TABLE HEADERS ─── */
const TableHeaders: React.FC<{
  competitorName: string;
  mode: "spreadsheet" | "discovery";
}> = ({ competitorName, mode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = interpolate(frame, [0, 0.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 360,
        left: 110,
        right: 110,
        display: "grid",
        gridTemplateColumns: "1fr 2px 1fr",
        gap: 0,
        opacity: op,
      }}
    >
      <Header
        title={competitorName.toUpperCase()}
        sub={mode === "spreadsheet" ? "Vendor / Cost" : "Discovery + usage data"}
        muted
      />
      <div style={{ background: GREEN, opacity: 0.6 }} />
      <Header title="EFFICYON" sub="Spend · Usage · Leak · Action" green />
    </div>
  );
};

const Header: React.FC<{ title: string; sub: string; muted?: boolean; green?: boolean }> = ({
  title,
  sub,
  muted,
  green,
}) => (
  <div style={{ paddingLeft: green ? 28 : 0, paddingRight: muted ? 28 : 0 }}>
    <div
      style={{
        fontFamily: MONO,
        fontSize: 14,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: green ? GREEN : "rgba(255,255,255,0.5)",
        marginBottom: 6,
      }}
    >
      {title}
    </div>
    <div
      style={{
        fontFamily: INSTRUMENT_SERIF,
        fontStyle: "italic",
        fontSize: 22,
        color: "rgba(255,255,255,0.45)",
      }}
    >
      {sub}
    </div>
  </div>
);

/* ─── ROW ─── */
const ROW_HEIGHT = 96;
const ROWS_TOP = 460;

const CompareRowView: React.FC<{
  row: CompareRow;
  index: number;
  mode: "spreadsheet" | "discovery";
}> = ({ row, index, mode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase timings within the Sequence
  const slideIn = spring({ frame, fps, config: { damping: 22, stiffness: 130, mass: 0.6 } });
  const activityT = interpolate(frame, [0.25 * fps, 0.6 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });
  const leakT = interpolate(frame, [0.5 * fps, 0.9 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const actionT = interpolate(frame, [0.75 * fps, 1.05 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const counter = interpolate(frame, [0.5 * fps, 0.95 * fps], [0, row.leakAnnual], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const top = ROWS_TOP + index * ROW_HEIGHT;
  const activePct = row.activeSeats / row.paidSeats;

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 110,
        right: 110,
        display: "grid",
        gridTemplateColumns: "1fr 2px 1fr",
        gap: 0,
        opacity: slideIn,
        transform: `translateY(${(1 - slideIn) * 16}px)`,
        height: ROW_HEIGHT,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        alignItems: "center",
      }}
    >
      {/* LEFT — competitor view */}
      <div
        style={{
          paddingRight: 28,
          display: "grid",
          gridTemplateColumns: mode === "spreadsheet" ? "1.5fr 1fr" : "1.5fr 1fr 1.4fr",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div style={{ fontSize: 22, color: "rgba(255,255,255,0.85)" }}>{row.vendor}</div>
        <div
          style={{
            fontSize: 20,
            color: "rgba(255,255,255,0.55)",
            fontVariantNumeric: "tabular-nums",
            textAlign: "right",
          }}
        >
          {fmtUSD(row.monthlyCost)}/mo
        </div>
        {mode === "discovery" && (
          <div
            style={{
              fontFamily: MONO,
              fontSize: 13,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
              textAlign: "right",
            }}
          >
            {row.activeSeats}/{row.paidSeats} active
          </div>
        )}
      </div>

      {/* DIVIDER */}
      <div style={{ background: GREEN, opacity: 0.55 }} />

      {/* RIGHT — Efficyon view */}
      <div
        style={{
          paddingLeft: 28,
          display: "grid",
          gridTemplateColumns: "1.4fr 0.8fr 1.1fr 1.4fr",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div style={{ fontSize: 22, color: "white" }}>{row.vendor}</div>
        <div
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.55)",
            fontVariantNumeric: "tabular-nums",
            textAlign: "right",
          }}
        >
          {fmtUSD(row.monthlyCost)}/mo
        </div>

        {/* Activity bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: activityT }}>
          <div
            style={{
              height: 5,
              background: "rgba(255,255,255,0.08)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${activityT * activePct * 100}%`,
                background: GREEN,
                boxShadow: `0 0 12px ${GREEN}`,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                left: `${activityT * activePct * 100}%`,
                width: `${activityT * (1 - activePct) * 100}%`,
                background: `rgba(255,107,91,0.25)`,
              }}
            />
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <span style={{ color: GREEN }}>{row.activeSeats}</span>
            <span> / {row.paidSeats} active</span>
          </div>
        </div>

        {/* Leak amount + action */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: GREEN,
              fontVariantNumeric: "tabular-nums",
              opacity: leakT,
            }}
          >
            {fmtUSD(counter)}
            <span
              style={{
                fontFamily: INSTRUMENT_SERIF,
                fontStyle: "italic",
                fontSize: 14,
                color: "rgba(255,255,255,0.5)",
                marginLeft: 4,
              }}
            >
              /yr
            </span>
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: GREEN,
              border: `1px solid ${GREEN}`,
              padding: "3px 8px",
              opacity: actionT,
              transform: `translateY(${(1 - actionT) * 6}px)`,
            }}
          >
            ↳ {row.action}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── PUNCHLINE ─── */
const Punchline: React.FC<{
  competitorName: string;
  mode: "spreadsheet" | "discovery";
}> = ({ competitorName, mode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = spring({ frame, fps, config: { damping: 22, stiffness: 90, mass: 0.7 } });

  const left = mode === "spreadsheet" ? "Cells with numbers." : "Tools with users.";
  const right = "Decisions with dollars.";

  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 110,
        right: 110,
        opacity: fadeIn,
        transform: `translateY(${(1 - fadeIn) * 12}px)`,
        display: "grid",
        gridTemplateColumns: "1fr 2px 1fr",
        alignItems: "center",
        paddingTop: 20,
      }}
    >
      <div
        style={{
          fontFamily: INSTRUMENT_SERIF,
          fontStyle: "italic",
          fontSize: 36,
          color: "rgba(255,255,255,0.55)",
          paddingRight: 28,
        }}
      >
        {competitorName}: {left}
      </div>
      <div style={{ background: GREEN, opacity: 0.55, height: 80 }} />
      <div
        style={{
          fontFamily: INSTRUMENT_SERIF,
          fontStyle: "italic",
          fontSize: 36,
          color: GREEN,
          paddingLeft: 28,
        }}
      >
        Efficyon: {right}
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

/* unused but exported to avoid tree-shake of RED */
export const _palette = { RED };
