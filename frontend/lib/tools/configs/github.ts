import type { UnifiedToolConfig } from "../types"
import { GitHubView } from "@/components/tools/github-view"

export const githubConfig: UnifiedToolConfig = {
  provider: "GitHub",
  id: "github",
  label: "GitHub",
  category: "Productivity",
  description: "Inactive Copilot seats, inactive paid members, and Copilot over-provisioning",
  brandColor: "#181717",
  authType: "apiKey",
  authFields: [
    {
      name: "appId",
      label: "App ID",
      type: "text",
      required: true,
      placeholder: "987654321",
      hint: "GitHub org Settings → Developer settings → GitHub Apps → your app → App ID",
    },
    {
      name: "privateKey",
      label: "Private Key (PEM)",
      type: "textarea",
      required: true,
      placeholder: "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----",
      hint: "Paste the entire .pem file contents including the BEGIN/END lines",
    },
    {
      name: "installationId",
      label: "Installation ID",
      type: "text",
      required: true,
      placeholder: "12345678",
      hint: "After installing the app, the install URL shows /installations/<id>",
    },
    {
      name: "planTier",
      label: "GitHub Plan",
      type: "select",
      required: true,
      options: [
        { value: "team", label: "Team ($4/user/mo)" },
        { value: "enterprise", label: "Enterprise ($21/user/mo)" },
      ],
    },
    {
      name: "copilotTier",
      label: "Copilot Tier",
      type: "select",
      required: true,
      options: [
        { value: "none", label: "None" },
        { value: "business", label: "Copilot Business ($19/user/mo)" },
        { value: "enterprise", label: "Copilot Enterprise ($39/user/mo)" },
      ],
    },
  ],
  connectEndpoint: "/api/integrations",
  buildConnectRequest: (values) => ({
    integrations: [{
      tool_name: "GitHub",
      connection_type: "apiKey",
      status: "pending",
      settings: {
        _pending_github_creds: {
          appId: values.appId,
          privateKey: values.privateKey,
          installationId: values.installationId,
        },
        plan_tier: values.planTier,
        copilot_tier: values.copilotTier,
        inactivity_days: 30,
      },
    }],
  }),
  quickSetup: {
    title: "How to get your GitHub App credentials",
    steps: [
      "In your GitHub org: Settings → Developer settings → GitHub Apps → New GitHub App",
      "Name it 'Efficyon Cost Analyzer'; disable the Webhook",
      "Grant read-only Organization permissions: Members, Administration, Copilot Business",
      "Create the app, then generate a private key (downloads a .pem file)",
      "Install the app on your org; copy the Installation ID from the URL (/installations/<id>)",
      "Paste App ID + full PEM + Installation ID here",
    ],
  },
  endpoints: [
    { key: "members", path: "/api/integrations/github/members", pick: ["members"], fallback: [] },
    { key: "org",     path: "/api/integrations/github/org" },
    { key: "status",  path: "/api/integrations/github/status" },
  ],
  defaultTab: "members",
  viewComponent: GitHubView,
  connectingToast: "Validating GitHub credentials…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To revoke access, uninstall the 'Efficyon Cost Analyzer' GitHub App from your org (Settings → Installed GitHub Apps) or delete the app entirely from Developer settings.",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/github/cost-leaks",
  analysisSupportsInactivity: true,
}
