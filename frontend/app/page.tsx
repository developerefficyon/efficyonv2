// frontend/app/page.tsx
import HomePageClient from "./page-client"
import { pageMetadata } from "@/lib/seo/metadata"
import {
  organizationLd,
  websiteLd,
  breadcrumbListLd,
  faqPageLd,
  jsonLdScript,
} from "@/lib/seo/jsonld"

export const metadata = pageMetadata({
  title: "Efficyon — SaaS Cost Intelligence Built in Gothenburg, Sweden",
  description:
    "Efficyon connects accounting + identity data to surface unused licenses, duplicate payments, and renewal risk before they hit the books.",
  path: "/",
  image: "/og-image.png",
})

const HOMEPAGE_FAQS = [
  {
    q: "What does Efficyon do?",
    a: "Efficyon ingests accounting (Fortnox, QuickBooks, Xero, Stripe) and identity (Microsoft 365, Google Workspace) data, then surfaces unused licenses, duplicate payments, and renewal risk. Read-only OAuth — we don't move money or change licenses.",
  },
  {
    q: "Where is Efficyon hosted?",
    a: "EU-hosted. The company is built in Gothenburg, Sweden.",
  },
  {
    q: "Which integrations are live?",
    a: "Fortnox, QuickBooks, Stripe, and Xero have full landing pages and setup docs today. Microsoft 365, Google Workspace, HubSpot, Shopify, Asana, Airtable, Visma, and AI providers (OpenAI / Anthropic / Gemini) are in active rollout.",
  },
]

export default function HomePage() {
  const ld = [
    organizationLd(),
    websiteLd(),
    breadcrumbListLd([{ name: "Home", path: "/" }]),
    faqPageLd(HOMEPAGE_FAQS),
  ]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      <HomePageClient />
    </>
  )
}
