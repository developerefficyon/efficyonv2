/**
 * AWS Controller
 *
 * Handles validate / status / accounts / regions / analyze / disconnect
 * for the AWS cost-leak integration. Auth is cross-account IAM role
 * (AssumeRole + external ID) — no OAuth.
 */

const { supabase } = require("../config/supabase")
const { getAwsCredentials, evictCredentials, parseRoleArn } = require("../utils/awsAuth")
const { analyzeAwsCostLeaks } = require("../services/awsCostLeakAnalysis")
const { saveAnalysis } = require("./analysisHistoryController")

const {
  OrganizationsClient,
  DescribeOrganizationCommand,
  ListAccountsCommand,
} = require("@aws-sdk/client-organizations")
const { AccountClient, ListRegionsCommand } = require("@aws-sdk/client-account")

const AWS_PROVIDER = "AWS"

function log(level, endpoint, message, data = null) {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${endpoint} - ${message}`
  if (data) console[level](line, data)
  else console[level](line)
}

async function getIntegrationForUser(user) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()
  if (profileError || !profile?.company_id) {
    return { error: "No company associated with this user", status: 400 }
  }
  const { data: integration, error } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .ilike("provider", AWS_PROVIDER)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "AWS integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function buildAwsClient(ClientCtor, credentials, region = "us-east-1") {
  return new ClientCtor({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  })
}

// Map an AWS SDK error to an HTTP status + user-facing hint.
function mapAwsError(e) {
  const name = e?.awsCode || e?.name || e?.Code || ""
  if (name === "AccessDenied" || name === "AccessDeniedException") {
    return { status: 403, message: e.message, hint: "Re-launch the CloudFormation template — the role is missing permissions, or the external ID on the trust policy doesn't match." }
  }
  if (name === "OptInRequiredException") {
    return { status: 409, message: "AWS Compute Optimizer isn't opted in for this account.", hint: "Open the Compute Optimizer console in the management account and click Get started." }
  }
  if (name === "AWSOrganizationsNotInUseException") {
    return { status: 400, message: "This AWS account isn't part of an Organization.", hint: "Efficyon currently requires a management-account role in an AWS Organization." }
  }
  if (name === "ThrottlingException" || name === "Throttling") {
    return { status: 503, message: "AWS throttled the request.", hint: "Please retry in a minute." }
  }
  return { status: 500, message: e.message || "Unexpected AWS error", hint: null }
}

// Handler stubs — filled in by subsequent tasks.
async function validateAws(req, res) {
  const endpoint = "POST /api/integrations/aws/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  // 1) AssumeRole
  let credentials
  try {
    credentials = await getAwsCredentials(integration)
  } catch (e) {
    const mapped = mapAwsError(e)
    log("error", endpoint, "AssumeRole failed", { code: e.code, awsCode: e.awsCode, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }

  // 2) DescribeOrganization — must succeed for management-account scope
  let org
  try {
    const orgClient = buildAwsClient(OrganizationsClient, credentials)
    const resp = await orgClient.send(new DescribeOrganizationCommand({}))
    org = resp.Organization
  } catch (e) {
    const mapped = mapAwsError(e)
    log("error", endpoint, "DescribeOrganization failed", { awsCode: e.name, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
  }

  const masterAccountId = org?.MasterAccountId
  const organizationId = org?.Id
  const { accountId } = parseRoleArn(integration.settings.role_arn)
  if (!masterAccountId || accountId !== masterAccountId) {
    return res.status(400).json({
      error: "The connected account isn't the Organization management account.",
      hint: `Connect the payer account (${masterAccountId || "unknown"}) instead.`,
    })
  }

  // 3) Fetch active regions
  let activeRegions = []
  try {
    const accountClient = buildAwsClient(AccountClient, credentials)
    let next = undefined
    for (let i = 0; i < 5; i++) {
      const resp = await accountClient.send(new ListRegionsCommand({
        MaxResults: 50,
        RegionOptStatusContains: ["ENABLED", "ENABLED_BY_DEFAULT"],
        NextToken: next,
      }))
      for (const r of resp.Regions || []) if (r.RegionName) activeRegions.push(r.RegionName)
      next = resp.NextToken
      if (!next) break
    }
  } catch (e) {
    // account:ListRegions occasionally errors in older orgs; fall back to a static list.
    log("warn", endpoint, "ListRegions failed, using fallback", { awsCode: e.name, message: e.message })
    activeRegions = ["us-east-1", "us-east-2", "us-west-1", "us-west-2", "eu-west-1"]
  }

  const nowIso = new Date().toISOString()
  const newSettings = {
    ...integration.settings,
    aws_account_id: accountId,
    organization_id: organizationId,
    master_account_id: masterAccountId,
    active_regions: activeRegions,
    regions_refreshed_at: nowIso,
    last_validated_at: nowIso,
  }

  const { error: updateErr } = await supabase
    .from("company_integrations")
    .update({ settings: newSettings, status: "connected", updated_at: nowIso })
    .eq("id", integration.id)
  if (updateErr) {
    log("error", endpoint, "update integration failed", updateErr)
    return res.status(500).json({ error: "Failed to persist validated state" })
  }

  log("log", endpoint, `validated integration ${integration.id}`, {
    organizationId, accountCount: null, activeRegions: activeRegions.length,
  })
  return res.json({
    status: "connected",
    organizationId,
    masterAccountId,
    activeRegions,
    lastValidatedAt: nowIso,
  })
}
async function getAwsStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    awsAccountId: s.aws_account_id || null,
    organizationId: s.organization_id || null,
    masterAccountId: s.master_account_id || null,
    activeRegions: s.active_regions || [],
    regionsRefreshedAt: s.regions_refreshed_at || null,
    lastValidatedAt: s.last_validated_at || null,
  })
}
async function getAwsAccounts(req, res) { res.status(501).json({ error: "getAwsAccounts not implemented" }) }
async function getAwsRegions(req, res)  { res.status(501).json({ error: "getAwsRegions not implemented" }) }
async function refreshAwsRegions(req, res) { res.status(501).json({ error: "refreshAwsRegions not implemented" }) }
async function analyzeAwsCostLeaksHandler(req, res) { res.status(501).json({ error: "analyze not implemented" }) }
async function disconnectAws(req, res)  { res.status(501).json({ error: "disconnectAws not implemented" }) }
async function serveCloudFormationTemplate(req, res) { res.status(501).json({ error: "serveCloudFormationTemplate not implemented" }) }

module.exports = {
  validateAws,
  getAwsStatus,
  getAwsAccounts,
  getAwsRegions,
  refreshAwsRegions,
  analyzeAwsCostLeaks: analyzeAwsCostLeaksHandler,
  disconnectAws,
  serveCloudFormationTemplate,
  // exported for Tasks 9-12 (they replace these with real implementations):
  getIntegrationForUser,
  buildAwsClient,
  mapAwsError,
  log,
}
