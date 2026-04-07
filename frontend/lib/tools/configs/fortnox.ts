import type { ToolConfig } from "../types"

export const fortnoxConfig: ToolConfig = {
  provider: "Fortnox",
  label: "Fortnox",
  defaultTab: "company",
  endpoints: [
    { key: "company", path: "/api/integrations/fortnox/company", pick: ["companyInformation"] },
    { key: "settings", path: "/api/integrations/fortnox/settings", pick: ["settings"] },
    { key: "invoices", path: "/api/integrations/fortnox/invoices", pick: ["Invoices", "invoices"], fallback: [] },
    { key: "supplierInvoices", path: "/api/integrations/fortnox/supplier-invoices", pick: ["SupplierInvoices", "supplierInvoices"], fallback: [] },
    { key: "expenses", path: "/api/integrations/fortnox/expenses", pick: ["SalaryExpenses", "Expenses", "expenses"], fallback: [] },
    { key: "vouchers", path: "/api/integrations/fortnox/vouchers", pick: ["Vouchers", "vouchers"], fallback: [] },
    { key: "accounts", path: "/api/integrations/fortnox/accounts", pick: ["Accounts", "accounts"], fallback: [] },
    { key: "articles", path: "/api/integrations/fortnox/articles", pick: ["Articles", "articles"], fallback: [] },
    { key: "customers", path: "/api/integrations/fortnox/customers", pick: ["customers", "Customers"], fallback: [] },
    { key: "suppliers", path: "/api/integrations/fortnox/suppliers", pick: ["Suppliers", "suppliers"], fallback: [] },
  ],
}
