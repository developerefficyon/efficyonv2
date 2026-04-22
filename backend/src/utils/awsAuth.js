/**
 * AWS Auth Utility
 *
 * Calls STS AssumeRole with ExternalId against the customer's management-account
 * role, caches the returned temporary credentials in-process (TTL 55min; AWS
 * returns 1h, we refresh early).
 *
 * The caller (Efficyon backend) must run with AWS_ACCESS_KEY_ID +
 * AWS_SECRET_ACCESS_KEY env vars set to an IAM user in the Efficyon ops AWS
 * account whose account ID matches AWS_EFFICYON_ACCOUNT_ID. That user needs
 * only one permission: sts:AssumeRole on Resource: "*".
 */

const { STSClient, AssumeRoleCommand } = require("@aws-sdk/client-sts")

const REGION = "us-east-1"

const stsClient = new STSClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

// In-process cache: Map<integrationId, { credentials, expiresAt }>
const credentialCache = new Map()

const REFRESH_BUFFER_MS = 5 * 60 * 1000 // refresh 5 min before expiry

/**
 * Parse an AWS role ARN into { accountId, roleName }.
 * Throws a typed error if malformed.
 */
function parseRoleArn(roleArn) {
  if (typeof roleArn !== "string" || !roleArn) {
    const err = new Error("Role ARN is missing")
    err.code = "ROLE_ARN_MISSING"
    throw err
  }
  const match = /^arn:aws:iam::(\d{12}):role\/([\w+=,.@-]+)$/.exec(roleArn)
  if (!match) {
    const err = new Error(`Role ARN format invalid: ${roleArn}`)
    err.code = "ROLE_ARN_INVALID"
    throw err
  }
  return { accountId: match[1], roleName: match[2] }
}

/**
 * Assume the integration's role and return temporary credentials.
 * Uses cache when valid; otherwise issues a fresh AssumeRole call.
 *
 * Accepts an integration row (must have settings.role_arn, settings.external_id,
 * and an id). Keeps the function pure — the caller fetches the row.
 *
 * @returns {Promise<{ accessKeyId, secretAccessKey, sessionToken, expiration }>}
 */
async function getAwsCredentials(integration) {
  if (!integration?.id) {
    const err = new Error("integration.id is required")
    err.code = "INTEGRATION_MISSING"
    throw err
  }
  const settings = integration.settings || {}
  if (!settings.role_arn || !settings.external_id) {
    const err = new Error("integration.settings.role_arn and external_id required")
    err.code = "SETTINGS_MISSING"
    throw err
  }

  const cached = credentialCache.get(integration.id)
  if (cached && cached.expiresAt > Date.now() + REFRESH_BUFFER_MS) {
    return cached.credentials
  }

  let resp
  try {
    resp = await stsClient.send(
      new AssumeRoleCommand({
        RoleArn: settings.role_arn,
        ExternalId: settings.external_id,
        RoleSessionName: `efficyon-${integration.id}-${Date.now()}`.slice(0, 64),
        DurationSeconds: 3600,
      })
    )
  } catch (e) {
    const err = new Error(`AssumeRole failed: ${e.message}`)
    err.code = "ASSUME_ROLE_FAILED"
    err.awsCode = e.name || e.Code
    err.cause = e
    throw err
  }

  if (!resp.Credentials) {
    const err = new Error("AssumeRole returned no credentials")
    err.code = "ASSUME_ROLE_EMPTY"
    throw err
  }

  const credentials = {
    accessKeyId: resp.Credentials.AccessKeyId,
    secretAccessKey: resp.Credentials.SecretAccessKey,
    sessionToken: resp.Credentials.SessionToken,
    expiration: resp.Credentials.Expiration,
  }
  credentialCache.set(integration.id, {
    credentials,
    expiresAt: new Date(resp.Credentials.Expiration).getTime(),
  })
  return credentials
}

/** Manually evict an integration's cached credentials (e.g., on disconnect). */
function evictCredentials(integrationId) {
  credentialCache.delete(integrationId)
}

module.exports = {
  parseRoleArn,
  getAwsCredentials,
  evictCredentials,
}
