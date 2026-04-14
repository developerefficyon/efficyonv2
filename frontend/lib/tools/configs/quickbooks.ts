import type { UnifiedToolConfig } from "../types"
import { QuickBooksView } from "@/components/tools/quickbooks-view"

export const quickbooksConfig: UnifiedToolConfig = {
  provider: "QuickBooks",
  id: "quickbooks",
  label: "QuickBooks",
  category: "Finance",
  description: "Bills, expenses & financial reports",
  brandColor: "#2CA01C",
  authType: "oauth",
  authFields: [
    { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Your QuickBooks App Client ID" },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Your QuickBooks App Client Secret" },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/quickbooks/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "QuickBooks",
        connection_type: "oauth",
        status: "pending",
        client_id: values.clientId,
        client_secret: values.clientSecret,
      },
    ],
  }),
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "Go to developer.intuit.com and create an app",
      'Select "Accounting" scope',
      "Add redirect URI: your backend callback URL",
      "Copy Client ID and Client Secret here",
    ],
  },
  endpoints: [
    { key: "company", path: "/api/integrations/quickbooks/company", pick: ["company"] },
    { key: "invoices", path: "/api/integrations/quickbooks/invoices", pick: ["invoices"], fallback: [] },
    { key: "bills", path: "/api/integrations/quickbooks/bills", pick: ["bills"], fallback: [] },
    { key: "vendors", path: "/api/integrations/quickbooks/vendors", pick: ["vendors"], fallback: [] },
    { key: "accounts", path: "/api/integrations/quickbooks/accounts", pick: ["accounts"], fallback: [] },
  ],
  defaultTab: "company",
  viewComponent: QuickBooksView,
  connectingToast: "Redirecting to QuickBooks to authorize…",
  tokenRevocation: { automated: true },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/quickbooks/cost-leaks",
}
