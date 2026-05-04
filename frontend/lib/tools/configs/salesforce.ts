import type { UnifiedToolConfig } from "../types"
import { SalesforceView } from "@/components/tools/salesforce-view"

export const salesforceConfig: UnifiedToolConfig = {
  provider: "Salesforce",
  id: "salesforce",
  label: "Salesforce",
  category: "CRM/Marketing",
  description: "Inactive licensed users, frozen-but-billed users, and unused Permission Set Licenses",
  brandColor: "#00A1E0",
  authType: "oauth",
  authFields: [
    {
      name: "consumerKey",
      label: "Consumer Key",
      type: "text",
      required: true,
      placeholder: "3MVG9...",
      hint: "Setup → App Manager → your Connected App → Manage Consumer Details",
    },
    {
      name: "consumerSecret",
      label: "Consumer Secret",
      type: "password",
      required: true,
      hint: "Same Manage Consumer Details page as the Consumer Key",
    },
    {
      name: "orgType",
      label: "Org Type",
      type: "select",
      required: true,
      options: [
        { value: "production", label: "Production / Developer Edition" },
        { value: "sandbox", label: "Sandbox" },
      ],
    },
    {
      name: "myDomain",
      label: "My Domain URL (optional)",
      type: "text",
      required: false,
      placeholder: "https://acme.my.salesforce.com",
      hint: "Use only if your org has My Domain enforced. Leave blank otherwise.",
    },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/salesforce/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "Salesforce",
        connection_type: "oauth",
        status: "pending",
        settings: {
          _pending_salesforce_creds: {
            clientId: values.consumerKey,
            clientSecret: values.consumerSecret,
            orgType: values.orgType,
            myDomain: values.myDomain || null,
          },
        },
      },
    ],
  }),
  quickSetup: {
    title: "How to create a Salesforce Connected App",
    steps: [
      "In Salesforce: Setup → App Manager → New Connected App",
      "Name it 'Efficyon Cost Analyzer', enter any contact email",
      "Check 'Enable OAuth Settings'",
      "Callback URL: https://efficyonv2.onrender.com/api/integrations/salesforce/callback",
      "Selected OAuth Scopes: 'Manage user data via APIs (api)', 'Perform requests on your behalf at any time (refresh_token, offline_access)', 'Access the identity URL service (id, profile, email)'",
      "Save. Wait ~10 minutes for the App to propagate, then copy the Consumer Key + Secret",
    ],
    note: "Salesforce takes up to 10 minutes for newly-created Connected Apps to propagate. First OAuth attempts before propagation often fail with confusing errors — wait, then retry.",
  },
  endpoints: [
    { key: "status",    path: "/api/integrations/salesforce/status" },
    { key: "users",     path: "/api/integrations/salesforce/users", pick: ["users"], fallback: [] },
    { key: "licenses",  path: "/api/integrations/salesforce/licenses", pick: ["licenses"], fallback: [] },
    { key: "psls",      path: "/api/integrations/salesforce/psls", pick: ["psls"], fallback: [] },
  ],
  defaultTab: "users",
  viewComponent: SalesforceView,
  connectingToast: "Redirecting to Salesforce to authorize…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To revoke access, go to your Salesforce org → Setup → Connected Apps OAuth Usage → find 'Efficyon Cost Analyzer' → Revoke. Or delete the Connected App entirely from App Manager.",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/salesforce/cost-leaks",
  analysisSupportsInactivity: true,
}
