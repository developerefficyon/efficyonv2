import type { UnifiedToolConfig } from "../types"
import { AwsView } from "@/components/tools/aws-view"
import { AwsConnectForm } from "@/components/tools/aws-connect-form"

export const awsConfig: UnifiedToolConfig = {
  provider: "AWS",
  id: "aws",
  label: "Amazon Web Services",
  category: "Cloud Infrastructure",
  description: "EC2, RDS, Lambda, EBS rightsizing and Savings Plan / RI opportunities",
  brandColor: "#FF9900",
  authType: "serviceAccount",
  authFields: [],
  connectComponent: AwsConnectForm,
  connectEndpoint: "/api/integrations",
  buildConnectRequest: (values) => ({
    integrations: [
      {
        tool_name: "AWS",
        connection_type: "serviceAccount",
        status: "pending",
        settings: {
          external_id: values.externalId,
          role_arn: values.roleArn,
        },
      },
    ],
  }),
  endpoints: [
    { key: "accounts", path: "/api/integrations/aws/accounts", pick: ["accounts"], fallback: [] },
    { key: "status",   path: "/api/integrations/aws/status" },
    { key: "regions",  path: "/api/integrations/aws/regions", pick: ["activeRegions"], fallback: [] },
  ],
  defaultTab: "accounts",
  viewComponent: AwsView,
  connectingToast: "Assuming IAM role…",
  tokenRevocation: {
    automated: false,
    manualStepsNote:
      "To fully revoke access, delete the IAM role 'efficyon-cost-analyzer' from your AWS management account (IAM → Roles), or delete the CloudFormation stack that created it.",
  },
  analysisType: "costLeaks",
  analysisEndpoint: "/api/integrations/aws/cost-leaks",
  analysisSupportsInactivity: false,
}
