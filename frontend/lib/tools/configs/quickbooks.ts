import type { ToolConfig } from "../types"

export const quickbooksConfig: ToolConfig = {
  provider: "QuickBooks",
  label: "QuickBooks",
  defaultTab: "company",
  endpoints: [
    { key: "company", path: "/api/integrations/quickbooks/company", pick: ["companyInfo"] },
    { key: "invoices", path: "/api/integrations/quickbooks/invoices", pick: ["invoices"], fallback: [] },
    { key: "bills", path: "/api/integrations/quickbooks/bills", pick: ["bills"], fallback: [] },
    { key: "vendors", path: "/api/integrations/quickbooks/vendors", pick: ["vendors"], fallback: [] },
    { key: "accounts", path: "/api/integrations/quickbooks/accounts", pick: ["accounts"], fallback: [] },
  ],
}
