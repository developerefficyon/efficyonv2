import type { ToolConfig } from "../types"

export const shopifyConfig: ToolConfig = {
  provider: "Shopify",
  label: "Shopify",
  defaultTab: "shop",
  endpoints: [
    { key: "shop", path: "/api/integrations/shopify/shop", pick: ["shop"] },
    { key: "orders", path: "/api/integrations/shopify/orders", pick: ["orders"], fallback: [] },
    { key: "products", path: "/api/integrations/shopify/products", pick: ["products"], fallback: [] },
    {
      key: "appCharges",
      path: "/api/integrations/shopify/app-charges",
      pick: ["recurring_application_charges", "appCharges"],
      fallback: [],
    },
  ],
}
