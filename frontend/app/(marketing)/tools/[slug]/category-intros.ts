// One hand-authored intro paragraph per category, reused across all tools in that category.
// Keeping intros at category-level (not per-tool) lets us write 12 unique intros instead of 50,
// while still giving each page a non-templated, voice-distinctive opening.

export const CATEGORY_INTROS: Record<string, string> = {
  Communication:
    "Communication tools are the canonical 'whole company gets a seat' purchase, which is correct. But they're also the place where deactivated employees keep paid accounts long after departure, where Pro features get bought for use cases that the free tier already covered, and where automated bot accounts quietly sit on per-active-user billing. The waste isn't usually in the tier choice — it's in the 30 to 90 days nobody reconciles seats against the identity provider.",
  CRM: "CRM seats are the most expensive licenses most companies buy per-user, and the most over-provisioned. Sales-tier seats are the default for everyone in the GTM org, but only AEs and SDRs touch them weekly; managers and ops users could sit on a Service tier or a custom tier that's a third of the cost. The waste sits in the gap between 'who's listed in the CRM' and 'who's actually editing records this quarter'.",
  "Project Management":
    "Project-management tools are the easiest place for SaaS spend to get away from a finance team. They're licensed per-seat, often by department, and the seat count almost never gets revisited when someone leaves or a project closes. The biggest waste pattern across this category is paying Premium for users who only consume — a viewer-only price tier exists in nearly every tool but rarely gets assigned correctly.",
  Productivity:
    "Productivity tools concentrate active value in a small number of users and waste in everyone else who got an automatic license at onboarding. The dominant pattern is bundle-tier purchasing: a company buys an enterprise tier for the AI feature or the storage allocation, then never tracks who actually uses what they paid extra for. Right-sizing the tier per-user often beats negotiating the bundle.",
  "Customer Support":
    "Support-platform pricing is structured around agent seats and ticket volume, but the waste is rarely in either of those. It hides in the integrations: chat, voice, knowledge-base, and survey add-ons that get enabled during a launch and never reconciled against actual usage. Most teams could drop one or two paid add-ons per platform with no measurable impact on response time or CSAT.",
  Analytics:
    "Analytics platforms charge for events, seats, and storage retention — three different waste vectors that finance teams almost never see itemized. The most common pattern is over-retention: keeping raw event data for 24 months when the org only ever queries the last 90 days. Second is unused seat: dashboard viewers who got Editor licenses because that was the default during rollout.",
  Finance:
    "Finance and accounting tools are licensed per-user but priced for headcount tiers (e.g., 1–5 users, 6–25, etc.). Companies cross a tier threshold and pay for the full bracket even when they're at the bottom of it. The signature waste pattern is silent tier-jumping: an automated billing pull moves you from a $X/mo plan to a $3X/mo plan because someone added a viewer-only user the system can't downgrade.",
  Design:
    "Design tools concentrate value in a small number of users — and waste in everyone else who happens to have a viewer or commenter seat that was bought as a paid one. The biggest single waste pattern across this category is 'editor seats for viewers': a non-designer needed to look at a file once, got an Editor license to do it, and never got downgraded.",
  Development:
    "Developer tooling is priced per-user with bracket pricing that traps companies above the threshold. The waste is usually in dormant accounts: contractors, alumni, and bots that still have a paid seat months after their contributions stopped. SAML- or SSO-tier upgrades amplify it — once a tool requires an enterprise tier for SSO, every seat costs 3–4× more, including the inactive ones.",
  Marketing:
    "Marketing platforms bundle features that overlap with three or four other tools the same team is also paying for. The signature waste pattern is duplication: marketing automation and email service provider both charge for contact lists; CRM and analytics both track web events; landing-page tools and CMS both publish pages. Most teams can drop one product per overlap pair with a brief feature audit.",
  "Cloud Infrastructure":
    "Cloud infrastructure is usage-based, not seat-based, so 'unused license' isn't the right frame. The waste is idle compute: instances, databases, and load balancers left running after development cycles end; volumes detached from terminated instances that still bill; cross-region redundancy configured for an environment that doesn't need it. Reserved capacity that doesn't match actual usage compounds the problem.",
  Security:
    "Security tools are priced per-endpoint, per-user, or per-event, and the seat count almost never lines up with the device count or active-user count after a year of churn. The biggest waste is shelfware: tools bought during an audit cycle, deployed partially, and then renewed annually because canceling looks bad to the board. A real usage audit before each renewal recovers 15–30% on average.",
}

export function categoryIntro(category: string): string {
  return CATEGORY_INTROS[category] ?? CATEGORY_INTROS["Productivity"]
}
