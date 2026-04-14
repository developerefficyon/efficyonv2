import type { UnifiedToolConfig } from "../types"
import { Microsoft365View } from "@/components/tools/microsoft365-view"

export const microsoft365Config: UnifiedToolConfig = {
  provider: "Microsoft365",
  id: "microsoft365",
  label: "Microsoft 365",
  category: "Productivity",
  description: "Users, licenses & productivity tools",
  brandColor: "#0078D4",
  authType: "oauth",
  authFields: [
    { name: "tenantId", label: "Tenant ID", type: "text", required: true, placeholder: "Your Azure AD Tenant ID or domain" },
    { name: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Azure AD Application (client) ID" },
    { name: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Azure AD Client Secret" },
  ],
  connectEndpoint: "/api/integrations",
  oauthStartEndpoint: "/api/integrations/microsoft365/oauth/start",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "Microsoft365",
        connection_type: "oauth",
        status: "pending",
        tenant_id: values.tenantId,
        client_id: values.clientId,
        client_secret: values.clientSecret,
      },
    ],
  }),
  quickSetup: {
    title: "Quick Setup",
    steps: [
      "Go to Azure Portal > App registrations, create a new app",
      "Add API permissions: User.Read.All, Directory.Read.All, AuditLog.Read.All",
      "Grant admin consent, then create a Client Secret",
    ],
    note: "Requires admin consent",
  },
  endpoints: [
    { key: "licenses", path: "/api/integrations/microsoft365/licenses", pick: ["licenses"], fallback: [] },
    { key: "users", path: "/api/integrations/microsoft365/users", pick: ["users"], fallback: [] },
    { key: "usageReports", path: "/api/integrations/microsoft365/usage", pick: ["usageReports", "usage"], fallback: null },
  ],
  defaultTab: "licenses",
  viewComponent: Microsoft365View,
  connectingToast: "Redirecting to Microsoft to authorize…",
}
