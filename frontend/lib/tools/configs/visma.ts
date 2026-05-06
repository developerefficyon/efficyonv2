import type { UnifiedToolConfig } from "../types"
import { VismaView } from "@/components/tools/visma-view"

export const vismaConfig: UnifiedToolConfig = {
  // IDENTITY
  provider: "Visma",
  id: "visma",
  label: "Visma eAccounting",

  // UI METADATA
  category: "Finance",
  description:
    "Detect duplicate supplier payments, unusual amounts, recurring subscriptions, overdue invoices and price increases across customer & supplier invoices in Visma eAccounting (Sweden / Norway / Denmark / Finland / Netherlands).",
  brandColor: "#E60028",

  // AUTH & CONNECT
  authType: "oauth",
  authFields: [
    {
      name: "clientId",
      label: "Visma OAuth Client ID",
      type: "text",
      required: true,
      placeholder: "<client-id>",
      hint: "From Visma Developer self-service portal → your integration → Client details",
    },
    {
      name: "clientSecret",
      label: "Visma OAuth Client Secret",
      type: "password",
      required: true,
      placeholder: "<client-secret>",
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/visma/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "Visma",
        connection_type: "oauth",
        status: "pending",
        settings: {
          _pending_visma_creds: {
            clientId: values.clientId,
            clientSecret: values.clientSecret,
          },
        },
      },
    ],
  }),

  // UI HINTS
  callouts: [
    {
      type: "success",
      title: "Read-Only Guarantee",
      body: "Effycion only reads data — we never write to Visma. We request the read-only OAuth scopes (ea:sales_readonly, ea:accounting_readonly, ea:purchase_readonly) so Visma enforces read-only at the API level.",
      link: "/dashboard/tools/guide#visma",
    },
    {
      type: "info",
      title: "Multi-currency aware",
      body: "Findings are computed in your company's home currency (SEK / NOK / DKK / EUR detected automatically) and converted to USD on display using daily ECB rates.",
    },
  ],
  quickSetup: {
    title: "How to register a Visma OAuth integration",
    steps: [
      "Open the Visma Developer self-service portal: selfservice.developer.vismaonline.com",
      "Register a new application — name it 'Effycion Cost Analyzer'",
      "Add Redirect URL: http://localhost:4000/api/integrations/visma/callback (use your production host when deployed)",
      "Add scopes: ea:api offline_access ea:sales_readonly ea:accounting_readonly ea:purchase_readonly",
      "Copy the Client ID and Client Secret",
      "Paste them above and click Connect",
      "Approve consent in Visma as a user with access to the company you want to analyze",
    ],
  },

  // DATA FETCHING
  endpoints: [
    { key: "company", path: "/api/integrations/visma/company", pick: ["company"], fallback: null },
    { key: "customers", path: "/api/integrations/visma/customers", pick: ["customers"], fallback: [] },
    { key: "suppliers", path: "/api/integrations/visma/suppliers", pick: ["suppliers"], fallback: [] },
    { key: "invoices", path: "/api/integrations/visma/invoices", pick: ["invoices"], fallback: [] },
    { key: "supplierInvoices", path: "/api/integrations/visma/supplier-invoices", pick: ["supplierInvoices"], fallback: [] },
    { key: "articles", path: "/api/integrations/visma/articles", pick: ["articles"], fallback: [] },
    { key: "accounts", path: "/api/integrations/visma/accounts", pick: ["accounts"], fallback: [] },
    { key: "vouchers", path: "/api/integrations/visma/vouchers", pick: ["vouchers"], fallback: [] },
  ],
  defaultTab: "company",

  // DETAIL PAGE
  viewComponent: VismaView,

  // TOASTS
  connectingToast: "Redirecting to Visma to authorize…",

  // DELETE FLOW
  tokenRevocation: {
    automated: true,
    manualStepsNote:
      "Effycion revokes the access + refresh tokens automatically on disconnect. To revoke the integration entirely: Visma Developer self-service portal → your integration → Revoke or delete.",
  },

  // ANALYSIS
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/visma/cost-leaks",
  analysisSupportsDateRange: true,
}
