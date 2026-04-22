import type { UnifiedToolConfig } from "../types"
import { AzureView } from "@/components/tools/azure-view"
import { AzureConnectForm } from "@/components/tools/azure-connect-form"

export const azureConfig: UnifiedToolConfig = {
  provider: "Azure",
  id: "azure",
  label: "Microsoft Azure",
  category: "Cloud Infrastructure",
  description: "Azure Advisor Cost recommendations across all subscriptions in your tenant",
  brandColor: "#0078D4",
  authType: "serviceAccount",
  authFields: [],
  connectComponent: AzureConnectForm,
  connectEndpoint: "/api/integrations",
  buildConnectRequest: () => ({
    integrations: [{
      tool_name: "Azure",
      connection_type: "serviceAccount",
      status: "pending",
      settings: {},
    }],
  }),
  endpoints: [
    { key: "subscriptions", path: "/api/integrations/azure/subscriptions", pick: ["subscriptions"], fallback: [] },
    { key: "status",        path: "/api/integrations/azure/status" },
  ],
  defaultTab: "subscriptions",
  viewComponent: AzureView,
  connectingToast: "Opening Azure admin consent…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To fully revoke access, remove the 'Efficyon Cost Analyzer (Azure)' enterprise application from your Azure AD tenant (Entra ID → Enterprise applications).",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/azure/cost-leaks",
  analysisSupportsInactivity: false,
}
