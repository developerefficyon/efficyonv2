import type { UnifiedToolConfig } from "../types"
import { StripeView } from "@/components/tools/stripe-view"

export const stripeConfig: UnifiedToolConfig = {
  provider: "Stripe",
  id: "stripe",
  label: "Stripe",
  category: "Finance",
  description: "Failed payment recovery, card-expiry churn, past-due subscriptions, and disputes",
  brandColor: "#635BFF",
  authType: "apiKey",
  authFields: [
    {
      name: "restrictedKey",
      label: "Stripe Restricted API Key",
      type: "password",
      required: true,
      placeholder: "rk_live_...",
      hint: "Stripe Dashboard → Developers → API keys → Restricted keys",
      validate: (v) =>
        v && (v.startsWith("rk_live_") || v.startsWith("rk_test_"))
          ? null
          : "Must be a Stripe restricted key (starts with rk_live_ or rk_test_)",
    },
  ],
  connectEndpoint: "/api/integrations",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "Stripe",
        connection_type: "apiKey",
        status: "pending",
        settings: {
          _pending_stripe_key: values.restrictedKey,
        },
      },
    ],
  }),
  quickSetup: {
    title: "How to get your Stripe restricted key",
    steps: [
      "Open Stripe Dashboard → Developers → API keys",
      "Click 'Create restricted key'",
      "Name it 'Efficyon Cost Analyzer'",
      "Grant Read access to: Charges, Customers, Disputes, Invoices, Payment Intents, Subscriptions",
      "Click 'Create key', then reveal and copy the rk_live_... key",
      "Paste it into Efficyon",
    ],
  },
  endpoints: [
    { key: "status", path: "/api/integrations/stripe/status" },
    { key: "subscriptions", path: "/api/integrations/stripe/subscriptions", pick: ["subscriptions"], fallback: [] },
    { key: "invoices", path: "/api/integrations/stripe/invoices", pick: ["invoices"], fallback: [] },
    { key: "disputes", path: "/api/integrations/stripe/disputes", pick: ["disputes"], fallback: [] },
  ],
  defaultTab: "subscriptions",
  viewComponent: StripeView,
  connectingToast: "Validating Stripe credentials…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To revoke access, go to Stripe Dashboard → Developers → API keys → find 'Efficyon Cost Analyzer' → Roll or Delete.",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/stripe/cost-leaks",
  analysisSupportsDateRange: true,
}
