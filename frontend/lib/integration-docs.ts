/* ──────────────────────────────────────────────────────────────
   Setup-doc content for each integration.
   Consumed by /docs/integrations/[slug]/page.tsx
   Keep copy honest — no fabricated scopes, no soc2/iso claims.
   ────────────────────────────────────────────────────────────── */

export interface DocStep {
  title: string
  body: string
}

export interface DocScope {
  scope: string
  explanation: string
}

export interface DocFaq {
  q: string
  a: string
}

export interface IntegrationDoc {
  slug: string
  name: string
  category: string
  region: string
  blurb: string
  prerequisites: string[]
  scopes: DocScope[]
  steps: DocStep[]
  afterConnect: string
  revoke: string
  faq: DocFaq[]
}

export const INTEGRATION_DOCS: IntegrationDoc[] = [
  {
    slug: "fortnox",
    name: "Fortnox",
    category: "Accounting · Invoicing",
    region: "Sweden",
    blurb:
      "Connect your Fortnox accounting system to Efficyon. Read-only, multi-currency, VAT-aware. Takes about 5 minutes for a Fortnox admin and roughly 10 minutes for the first scan to surface findings.",
    prerequisites: [
      "A Fortnox admin or developer account with permission to authorize new apps.",
      "Active Fortnox plans: Bokföring, Fakturering, or Komplett (any tier — invoice + supplier endpoints exist on all of them).",
      "Knowing your organization number — used to confirm the correct workspace during OAuth.",
    ],
    scopes: [
      {
        scope: "invoice",
        explanation: "Read customer invoices to identify recurring SaaS billings and detect price drift.",
      },
      {
        scope: "supplierinvoice",
        explanation: "Read supplier invoices — this is where 90% of SaaS spend actually lives in Fortnox.",
      },
      {
        scope: "customer",
        explanation: "Read customer records to associate invoices with vendors during analysis.",
      },
      {
        scope: "supplier",
        explanation: "Read supplier records — needed to group invoices by vendor for waste detection.",
      },
      {
        scope: "settings",
        explanation: "Read company settings to confirm currency, VAT rate, and chart-of-accounts conventions.",
      },
    ],
    steps: [
      {
        title: "Sign in or create an Efficyon account",
        body: "Go to /register, set up your account, then choose 'Connect Fortnox' from the Integrations tab. Or skip the dashboard and click the 'Connect Fortnox' button on this page.",
      },
      {
        title: "Authorize Efficyon in Fortnox's OAuth screen",
        body: "You'll be redirected to Fortnox's official OAuth page. Sign in with your Fortnox admin credentials. Fortnox will show you the exact scopes Efficyon is requesting (read-only on each — no write, modify, or delete permissions). Click Approve.",
      },
      {
        title: "Confirm the workspace (multi-org accounts only)",
        body: "If your account manages multiple Fortnox companies, you'll be asked which organization number to connect. Pick the one whose SaaS spend you want analyzed. You can connect more later.",
      },
      {
        title: "First scan runs automatically",
        body: "After the redirect lands you back in Efficyon, the first sync starts in the background. It typically completes in 5–10 minutes for a one-year invoice window. You'll get an in-app notification when it's done.",
      },
    ],
    afterConnect:
      "Once the first scan finishes, you'll see categorized SaaS spend on the Tools tab, surfaced findings on the Findings tab, and a monthly savings report you can read in under three minutes. Recurring scans run weekly by default — adjustable in Settings.",
    revoke:
      "To disconnect: open Settings → Integrations in your Efficyon dashboard, find Fortnox, and click Revoke. The OAuth token is immediately invalidated and we stop syncing. You can also revoke from the Fortnox side at fortnox.se → Settings → Integrations — both methods take effect within 30 seconds.",
    faq: [
      {
        q: "Does Efficyon write anything to my Fortnox account?",
        a: "No. Every scope we request is read-only. The OAuth permissions you authorize literally don't include write access — it's not a policy choice, it's a technical guarantee. Verifiable in your Fortnox app management screen.",
      },
      {
        q: "How far back do you scan?",
        a: "By default we pull 13 months of supplier invoices on the first scan, which is enough to detect annual renewal patterns. You can configure shorter or longer windows in Settings.",
      },
      {
        q: "Multi-currency — does it just work?",
        a: "Yes. We read the source currency from each invoice line and normalize to your reporting currency using daily ECB rates for analysis. The original currency is preserved on the findings detail.",
      },
      {
        q: "What if I have multiple Fortnox companies?",
        a: "Connect each one separately. They show up as independent workspaces in Efficyon. We can roll them up into a consolidated view for finance reporting if you're on the Growth or Enterprise plan.",
      },
    ],
  },

  {
    slug: "quickbooks",
    name: "QuickBooks Online",
    category: "Accounting",
    region: "United States · Canada",
    blurb:
      "Connect QuickBooks Online to Efficyon. Read-only, real-time sync, no chart-of-accounts surgery required. Setup takes about 5 minutes; the first SaaS-spend categorization completes within 10–15 minutes.",
    prerequisites: [
      "A QuickBooks Online account with admin or company-administrator privileges.",
      "Either Simple Start, Essentials, Plus, or Advanced — all four tiers expose the bills + vendors endpoints we need.",
      "Recommended: a chart-of-accounts category for software / subscriptions (we work without one, but the categorization is sharper if it exists).",
    ],
    scopes: [
      {
        scope: "com.intuit.quickbooks.accounting",
        explanation:
          "QuickBooks's standard read-only accounting scope. Grants access to bills, vendors, accounts, and classes — nothing about banking, payroll, or payments.",
      },
    ],
    steps: [
      {
        title: "Sign up for Efficyon",
        body: "Create your Efficyon account at /register, then in the dashboard pick 'Connect QuickBooks' from the Integrations tab.",
      },
      {
        title: "Authorize Efficyon in Intuit's OAuth screen",
        body: "Intuit's official 'Connect to QuickBooks' page will appear. Sign in to your Intuit account, pick the QuickBooks Online company you want to connect, and review the requested permissions (read-only accounting). Click Connect.",
      },
      {
        title: "Pick the QBO company (multi-org accounts)",
        body: "If you manage multiple QuickBooks companies under the same Intuit login, you'll be asked which one to connect. You can come back and connect others later.",
      },
      {
        title: "First sync runs automatically",
        body: "Efficyon pulls 13 months of bills on the first sync. Categorization runs in parallel. You'll see the SaaS spend breakdown within 10–15 minutes for an SMB account.",
      },
    ],
    afterConnect:
      "QuickBooks classes and locations are preserved end-to-end — your finding rows respect the way you've already structured your books. Recurring sync runs daily; you can adjust to hourly on the Growth plan.",
    revoke:
      "Disconnect from Settings → Integrations in Efficyon, or from QuickBooks Online → ⚙ Apps → Manage. Either revokes the OAuth token within seconds and we stop pulling new data.",
    faq: [
      {
        q: "Can Efficyon create or edit bills in QuickBooks?",
        a: "No. The accounting scope we request is read-only. We can't post bills, edit vendors, or write any data back to QBO. You can verify the scope in QuickBooks → Apps → Manage → My Apps → Efficyon.",
      },
      {
        q: "Do you support QuickBooks Desktop?",
        a: "Not yet. The QuickBooks Online API and QBD's data model are different enough that they need separate integrations. QBD is on the roadmap; QBO ships first because it's where most SMB SaaS spend lives now.",
      },
      {
        q: "How does Efficyon handle classes / locations?",
        a: "We read both and respect them throughout the analysis. Findings can be filtered by class or location, and per-department spend reports use them as the grouping key.",
      },
      {
        q: "What's the impact on my QuickBooks performance?",
        a: "We respect Intuit's rate limits and read in batches. You should see no measurable impact in QBO — most users don't notice we're connected at all.",
      },
    ],
  },

  {
    slug: "stripe",
    name: "Stripe",
    category: "Subscription billing",
    region: "Global",
    blurb:
      "Connect Stripe to Efficyon to analyze every SaaS subscription billed through your account. Read-only restricted-key auth; setup takes 3 minutes. The first analysis surfaces price drift, dead retries, and overlap within 5 minutes.",
    prerequisites: [
      "A Stripe account with permission to create restricted API keys (typically the account owner or a developer with API key access).",
      "Subscriptions actually billed through Stripe — Efficyon analyzes what runs through your account, so the more SaaS-on-Stripe you have, the more we can surface.",
    ],
    scopes: [
      {
        scope: "Customers · read",
        explanation: "Read customer records to associate subscriptions with vendors for analysis.",
      },
      {
        scope: "Subscriptions · read",
        explanation: "Read subscription objects to detect price changes, status, billing cadence.",
      },
      {
        scope: "Invoices · read",
        explanation: "Read past invoices to track historical billing patterns and detect retries.",
      },
      {
        scope: "Products + Prices · read",
        explanation: "Read product/price data to map subscriptions to their pricing tiers.",
      },
      {
        scope: "Charges · read",
        explanation: "Read charge events to identify failed retries and refund patterns.",
      },
    ],
    steps: [
      {
        title: "Generate a restricted Stripe API key",
        body: "In Stripe Dashboard → Developers → API keys → Restricted keys → Create restricted key. Set every permission listed above to 'Read', leave everything else as 'None'. Name the key 'Efficyon read-only'.",
      },
      {
        title: "Paste the restricted key into Efficyon",
        body: "Sign in to Efficyon → Integrations → Connect Stripe. Paste the restricted key we showed you. We never store the key in plaintext — it's encrypted at rest with AES-256 and only decrypted in-memory during a sync run.",
      },
      {
        title: "First analysis runs automatically",
        body: "We pull subscription, invoice, and charge data for the last 12 months. Analysis runs concurrently and surfaces price drift, failed-retry loops, and SaaS overlap within 5 minutes for a typical SMB account.",
      },
    ],
    afterConnect:
      "You'll see all Stripe-billed SaaS subscriptions categorized on the Tools tab. The Findings tab surfaces price-drift events (silent annual increases), failed-retry loops (where Stripe is trying to charge a card that no longer works), and dormant subscriptions where activity has dropped to zero but billing continues.",
    revoke:
      "Two ways: revoke the restricted key from your Stripe Dashboard (Developers → API keys → click the key → Reveal → Delete), or disconnect from Efficyon's Settings → Integrations → Stripe → Revoke. Both stop the sync within a minute.",
    faq: [
      {
        q: "Why a restricted key instead of OAuth?",
        a: "Stripe Connect OAuth is designed for platforms that act on behalf of the account. We're a read-only analyst, so a restricted key with read-only scopes is the more appropriate (and more auditable) auth method.",
      },
      {
        q: "Can Efficyon refund or charge anything?",
        a: "No. The restricted key permissions we ask for are all 'Read'. There's no charge, refund, or transfer endpoint in our allowlist — even if the key were compromised, the worst case is a data leak, not money movement.",
      },
      {
        q: "Do you support Stripe-on-platform (Connect) accounts?",
        a: "Standalone Stripe accounts work today. For Stripe Connect platforms (where you're the platform billing on behalf of merchants), reach out — we have a Connect-aware variant in beta.",
      },
      {
        q: "How do you handle test-mode keys?",
        a: "We refuse them. Efficyon only accepts live-mode restricted keys to avoid analyzing fake data. If you paste a test key, the connection fails fast with a clear error.",
      },
    ],
  },

  {
    slug: "xero",
    name: "Xero",
    category: "Accounting · Multi-currency",
    region: "United Kingdom · Australia · New Zealand",
    blurb:
      "Connect Xero to Efficyon for cost-leak analysis across one or many entities. Read-only, multi-currency, multi-org. Setup takes ~5 minutes per organization; the first scan completes within 10–15 minutes.",
    prerequisites: [
      "A Xero account with the role 'Adviser' or 'Standard' on every organization you want to connect.",
      "Active Xero subscription on Standard, Premium, or Ultimate plan (Starter and Ledger plans don't expose the bills API).",
      "If you run multi-currency: have your base/reporting currency set in Xero — we use whatever you've configured there.",
    ],
    scopes: [
      {
        scope: "accounting.transactions.read",
        explanation: "Read bills and invoices to identify recurring SaaS billings.",
      },
      {
        scope: "accounting.contacts.read",
        explanation: "Read contact records to group bills by vendor.",
      },
      {
        scope: "accounting.settings.read",
        explanation: "Read organization settings to confirm currency, VAT/GST/BAS preserve correctly.",
      },
      {
        scope: "offline_access",
        explanation: "Standard Xero scope — allows the OAuth token to refresh without the user re-authorizing every 30 minutes.",
      },
    ],
    steps: [
      {
        title: "Sign in to Efficyon and pick 'Connect Xero'",
        body: "From the Integrations tab in your Efficyon dashboard, choose Connect Xero. We'll route you to Xero's official OAuth page.",
      },
      {
        title: "Authorize on Xero's OAuth screen",
        body: "Xero will show you the exact scopes we request (all read-only) and ask you to confirm. Click Allow Access.",
      },
      {
        title: "Pick which organization(s) to connect",
        body: "Xero shows every organization you have access to. You can connect a single org now and add more later, or connect several at once and we'll roll them up into a consolidated view (Growth plan and above).",
      },
      {
        title: "First scan runs automatically",
        body: "Efficyon pulls 13 months of bills, contacts, and settings. Multi-currency normalization runs alongside. Findings surface within 10–15 minutes for a single-entity scan; longer for multi-org rollups.",
      },
    ],
    afterConnect:
      "Tracking categories are preserved — your findings rows respect the dimensions you've configured (department, project, region). VAT, GST, and BAS treatments are kept on the source bills; we don't touch the books.",
    revoke:
      "Two ways: in Xero, go to Settings → Connected Apps → Efficyon → Disconnect. Or in Efficyon, Settings → Integrations → Xero → Revoke. Either method invalidates the OAuth token within 30 seconds.",
    faq: [
      {
        q: "Does Efficyon write anything back to Xero?",
        a: "No. Every scope is read-only. We can't post bills, modify contacts, or change settings. Verify in Xero → Settings → Connected Apps → Efficyon → permissions.",
      },
      {
        q: "How does multi-currency work in practice?",
        a: "We read the source currency on each line, normalize to your Xero base currency for analysis, and preserve both on the findings detail page. So GBP-billed Microsoft 365 still shows as £X on the source, with the normalized value in your reporting currency.",
      },
      {
        q: "Can I connect multiple Xero organizations?",
        a: "Yes. Each org gets its own workspace. Growth plan and above support a consolidated view that rolls up findings across all connected orgs — useful for groups operating in multiple countries.",
      },
      {
        q: "What about tracking categories?",
        a: "We read them and respect them. Findings can be filtered by tracking category, and per-category reports use them as the grouping key. If your Xero is heavily structured around tracking categories, Efficyon adapts to it.",
      },
    ],
  },
]

export function getDoc(slug: string): IntegrationDoc | undefined {
  return INTEGRATION_DOCS.find((d) => d.slug === slug)
}
