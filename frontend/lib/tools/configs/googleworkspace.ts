import type { UnifiedToolConfig } from "../types"
import { GoogleWorkspaceView } from "@/components/tools/google-workspace-view"

export const googleWorkspaceConfig: UnifiedToolConfig = {
  provider: "GoogleWorkspace",
  id: "googleworkspace",
  label: "Google Workspace",
  category: "Productivity",
  description: "Users, licenses & directory data",
  brandColor: "#4285F4",
  authType: "oauth",
  authFields: [
    { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "123456789-xxxxxxx.apps.googleusercontent.com" },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "GOCSPX-..." },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/googleworkspace/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "GoogleWorkspace",
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
      "In Google Cloud Console, create an OAuth 2.0 Client ID (type: Web application)",
      "Add the Effycion callback URL as an authorized redirect URI",
      "Enable Admin SDK API in the same project; sign in as a Workspace admin when prompted",
      "Paste Client ID and Client Secret here",
    ],
    note: "Required scopes: admin.directory.user.readonly, admin.directory.customer.readonly",
  },
  endpoints: [
    { key: "users", path: "/api/integrations/googleworkspace/users", pick: ["users"], fallback: [] },
    { key: "domain", path: "/api/integrations/googleworkspace/domain", pick: ["domain"] },
    { key: "groups", path: "/api/integrations/googleworkspace/groups", pick: ["groups"], fallback: [] },
    { key: "licenses", path: "/api/integrations/googleworkspace/licenses", pick: ["licenses"], fallback: [] },
  ],
  defaultTab: "users",
  viewComponent: GoogleWorkspaceView,
  connectingToast: "Redirecting to Google to authorize…",
  tokenRevocation: { automated: true },
}
