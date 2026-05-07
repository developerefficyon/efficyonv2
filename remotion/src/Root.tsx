import { Composition } from "remotion";
import {
  HeroLoop,
  HeroLoopSchema,
  defaultHeroLoopProps,
  type HeroLoopProps,
} from "./HeroLoop/HeroLoop";
import {
  CompareLoop,
  CompareLoopSchema,
  defaultCompareSpreadsheetsProps,
  defaultCompareZyloProps,
} from "./CompareLoop/CompareLoop";

const FPS = 30;
// Intro 0.6s + (4 vendors × 1.4s) + total summary 1.4s + outro fade 0.6s ≈ 8.2s.
// 10s gives a small safety margin and a clean seamless loop.
const DURATION_SECONDS = 10;
const D = FPS * DURATION_SECONDS;

/* ─────────── per-integration prop sets ─────────── */
const fortnoxProps: HeroLoopProps = {
  brandLabel: "Fortnox",
  invoiceSource: "Invoice · Fortnox",
  usageSource: "Usage · API + activity logs",
  totalLabel: "Annual leak · sample 18-person Swedish stack",
  vendors: [
    { name: "Microsoft 365 Business Std.", monthlyCost: 920, paidSeats: 28, activeSeats: 11, leakAnnual: 6400 },
    { name: "HubSpot Pro", monthlyCost: 640, paidSeats: 8, activeSeats: 3, leakAnnual: 4300 },
    { name: "Slack Business+", monthlyCost: 320, paidSeats: 22, activeSeats: 16, leakAnnual: 2700 },
    { name: "Mailchimp Standard", monthlyCost: 180, paidSeats: 4, activeSeats: 0, leakAnnual: 2200 },
  ],
};

const quickbooksProps: HeroLoopProps = {
  brandLabel: "QuickBooks",
  invoiceSource: "Invoice · QuickBooks Online",
  usageSource: "Usage · API + identity logs",
  totalLabel: "Annual leak · sample 22-person US stack",
  vendors: [
    { name: "Microsoft 365 E3", monthlyCost: 770, paidSeats: 22, activeSeats: 9, leakAnnual: 5600 },
    { name: "Salesforce Pro", monthlyCost: 1500, paidSeats: 12, activeSeats: 5, leakAnnual: 8400 },
    { name: "Asana Business", monthlyCost: 425, paidSeats: 17, activeSeats: 11, leakAnnual: 3000 },
    { name: "Adobe CC (duplicate)", monthlyCost: 220, paidSeats: 4, activeSeats: 1, leakAnnual: 2200 },
  ],
};

const stripeProps: HeroLoopProps = {
  brandLabel: "Stripe",
  invoiceSource: "Invoice · Stripe subscriptions",
  usageSource: "Usage · workspace activity",
  totalLabel: "Annual leak · sample SaaS-on-Stripe stack",
  vendors: [
    { name: "Notion Business", monthlyCost: 380, paidSeats: 38, activeSeats: 22, leakAnnual: 4800 },
    { name: "Loom Business", monthlyCost: 295, paidSeats: 24, activeSeats: 9, leakAnnual: 3700 },
    { name: "Linear Standard", monthlyCost: 168, paidSeats: 14, activeSeats: 8, leakAnnual: 2200 },
    { name: "Webflow CMS+", monthlyCost: 99, paidSeats: 3, activeSeats: 0, leakAnnual: 1300 },
  ],
};

const xeroProps: HeroLoopProps = {
  brandLabel: "Xero",
  invoiceSource: "Invoice · Xero (multi-org)",
  usageSource: "Usage · API + license logs",
  totalLabel: "Annual leak · sample 30-person UK/AU stack",
  vendors: [
    { name: "Microsoft 365 Business", monthlyCost: 1080, paidSeats: 30, activeSeats: 14, leakAnnual: 6900 },
    { name: "ClickUp Business", monthlyCost: 360, paidSeats: 24, activeSeats: 12, leakAnnual: 3000 },
    { name: "Trello Premium (overlap)", monthlyCost: 250, paidSeats: 25, activeSeats: 8, leakAnnual: 3100 },
    { name: "Slack Pro", monthlyCost: 187, paidSeats: 25, activeSeats: 19, leakAnnual: 1500 },
  ],
};

export const Root: React.FC = () => {
  return (
    <>
      {/* ─── Generic — used everywhere a non-branded loop fits ─── */}
      <Composition
        id="HeroLoop"
        component={HeroLoop}
        schema={HeroLoopSchema}
        defaultProps={defaultHeroLoopProps}
        durationInFrames={D}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="HeroLoopSquare"
        component={HeroLoop}
        schema={HeroLoopSchema}
        defaultProps={defaultHeroLoopProps}
        durationInFrames={D}
        fps={FPS}
        width={1080}
        height={1080}
      />
      <Composition
        id="HeroLoopVertical"
        component={HeroLoop}
        schema={HeroLoopSchema}
        defaultProps={defaultHeroLoopProps}
        durationInFrames={D}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* ─── Per-integration variants ─── */}
      <Composition
        id="HeroLoopFortnox"
        component={HeroLoop}
        schema={HeroLoopSchema}
        defaultProps={fortnoxProps}
        durationInFrames={D}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="HeroLoopQuickBooks"
        component={HeroLoop}
        schema={HeroLoopSchema}
        defaultProps={quickbooksProps}
        durationInFrames={D}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="HeroLoopStripe"
        component={HeroLoop}
        schema={HeroLoopSchema}
        defaultProps={stripeProps}
        durationInFrames={D}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="HeroLoopXero"
        component={HeroLoop}
        schema={HeroLoopSchema}
        defaultProps={xeroProps}
        durationInFrames={D}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* ─── Compare videos — 12s for the longer "punchline" beat ─── */}
      <Composition
        id="CompareSpreadsheets"
        component={CompareLoop}
        schema={CompareLoopSchema}
        defaultProps={defaultCompareSpreadsheetsProps}
        durationInFrames={FPS * 12}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="CompareZylo"
        component={CompareLoop}
        schema={CompareLoopSchema}
        defaultProps={defaultCompareZyloProps}
        durationInFrames={FPS * 12}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
