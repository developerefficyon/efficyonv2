import type { UnifiedToolConfig } from "../types"
import { FortnoxView } from "@/components/tools/fortnox-view"

export const fortnoxConfig: UnifiedToolConfig = {
  provider: "Fortnox",
  id: "fortnox",
  label: "Fortnox",
  category: "Finance",
  description: "Invoices, suppliers & accounting data",
  brandColor: "#2DB250",
  authType: "oauth",
  authFields: [
    { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Enter your Fortnox Client ID" },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Enter your Fortnox Client Secret" },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/fortnox/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "Fortnox",
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
      "Log into developer.fortnox.se and create an app",
      "Set the redirect URI provided during onboarding",
      "Copy the Client ID and Client Secret here",
    ],
  },
  callouts: [
    {
      type: "success",
      title: "Read-Only Guarantee",
      body: "Effycion only reads data — we never write to Fortnox. For extra security, activate this integration with a user that has the Fortnox Läs (Read) license. Fortnox will then enforce read-only at the API level.",
      link: "/dashboard/tools/guide#fortnox",
    },
  ],
  endpoints: [
    { key: "company", path: "/api/integrations/fortnox/company", pick: ["CompanyInformation", "company"] },
    { key: "settings", path: "/api/integrations/fortnox/settings", pick: ["CompanySettings", "settings"] },
    { key: "invoices", path: "/api/integrations/fortnox/invoices", pick: ["Invoices", "invoices"], fallback: [] },
    { key: "supplierInvoices", path: "/api/integrations/fortnox/supplier-invoices", pick: ["SupplierInvoices", "supplier_invoices"], fallback: [] },
    { key: "expenses", path: "/api/integrations/fortnox/expenses", pick: ["Expenses", "expenses"], fallback: [] },
    { key: "vouchers", path: "/api/integrations/fortnox/vouchers", pick: ["Vouchers", "vouchers"], fallback: [] },
    { key: "accounts", path: "/api/integrations/fortnox/accounts", pick: ["Accounts", "accounts"], fallback: [] },
    { key: "articles", path: "/api/integrations/fortnox/articles", pick: ["Articles", "articles"], fallback: [] },
    { key: "customers", path: "/api/integrations/fortnox/customers", pick: ["Customers", "customers"], fallback: [] },
    { key: "suppliers", path: "/api/integrations/fortnox/suppliers", pick: ["Suppliers", "suppliers"], fallback: [] },
  ],
  defaultTab: "company",
  viewComponent: FortnoxView,
  connectingToast: "Redirecting to Fortnox to authorize…",
}
