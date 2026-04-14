import type { UnifiedToolConfig } from "../types"
import { ShopifyView } from "@/components/tools/shopify-view"

export const shopifyConfig: UnifiedToolConfig = {
  provider: "Shopify",
  id: "shopify",
  label: "Shopify",
  category: "E-Commerce",
  description: "Products, orders & customer data",
  brandColor: "#95BF47",
  authType: "oauth",
  authFields: [
    {
      name: "shopDomain",
      label: "Shop Domain",
      type: "text",
      required: true,
      placeholder: "your-store.myshopify.com",
      hint: "e.g., my-store or my-store.myshopify.com",
    },
    { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Your Shopify App API Key" },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Your Shopify App API Secret Key" },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/shopify/oauth/start",
  buildConnectRequest: (values) => {
    let shopDomain = values.shopDomain.trim()
    if (!shopDomain.includes(".myshopify.com")) {
      shopDomain = `${shopDomain}.myshopify.com`
    }
    return {
      integrations: [
        {
          tool_name: "Shopify",
          connection_type: "oauth",
          status: "pending",
          client_id: values.clientId,
          client_secret: values.clientSecret,
          shop_domain: shopDomain,
        },
      ],
    }
  },
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "Go to partners.shopify.com and create an app",
      "Set redirect URL to your backend callback URL",
      "Copy the API Key and API Secret Key",
    ],
  },
  endpoints: [
    { key: "shop", path: "/api/integrations/shopify/shop", pick: ["shop"] },
    { key: "orders", path: "/api/integrations/shopify/orders", pick: ["orders"], fallback: [] },
    { key: "products", path: "/api/integrations/shopify/products", pick: ["products"], fallback: [] },
    { key: "appCharges", path: "/api/integrations/shopify/app-charges", pick: ["appCharges", "app_charges"], fallback: [] },
  ],
  defaultTab: "shop",
  viewComponent: ShopifyView,
  connectingToast: "Redirecting to Shopify to authorize…",
}
