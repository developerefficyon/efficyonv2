/**
 * Google Workspace Controller
 *
 * Mirrors microsoft365Controller.js: per-tenant OAuth (each customer brings
 * their own Google Cloud OAuth client_id/secret), token refresh with locking,
 * and Admin SDK Directory data fetch.
 *
 * Phase 1 endpoints:
 *   - OAuth start + callback + token refresh
 *   - GET /users   — Directory API users.list
 *   - GET /domain  — Directory API customers/my_customer
 *
 * Phase 2 (later): Reports API (Drive/Gmail/Meet usage), Groups, License
 * Manager, cost-leak analysis service.
 */

const { supabase } = require("../config/supabase")
const { encryptOAuthData, decryptOAuthData, decryptIntegrationSettings } = require("../utils/encryption")
const { analyzeGoogleWorkspaceCostLeaks } = require("../services/googleWorkspaceCostLeakAnalysis")

const PROVIDER = "GoogleWorkspace"

const log = (level, endpoint, message, data = null) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${endpoint} - ${message}`
  if (data) console[level](logMessage, data)
  else console[level](logMessage)
}

// ── Rate limit (Admin SDK quota: 2400 queries/min per customer) ──────────────
const googleRateLimit = new Map()
function checkRateLimit(accessToken) {
  const now = Date.now()
  const limit = googleRateLimit.get(accessToken)
  if (!limit || now > limit.resetTime) {
    for (const [t, e] of googleRateLimit) if (now > e.resetTime) googleRateLimit.delete(t)
    googleRateLimit.set(accessToken, { count: 1, resetTime: now + 60_000 })
    return { allowed: true }
  }
  if (limit.count >= 2000) {
    const wait = Math.ceil((limit.resetTime - now) / 1000)
    return { allowed: false, message: `Rate limit exceeded. Wait ${wait}s.` }
  }
  limit.count++
  return { allowed: true }
}

// ── Token refresh (Promise-based lock) ───────────────────────────────────────
const tokenRefreshLocks = new Map()

async function doTokenRefresh(integration, tokens) {
  const now = Math.floor(Date.now() / 1000)
  log("log", "Token refresh", "Performing Google Workspace token refresh")

  const settings = decryptIntegrationSettings(integration.settings || {})
  const clientId = settings.client_id || integration.client_id
  const clientSecret = settings.client_secret || integration.client_secret || ""
  if (!clientId) throw new Error("Client ID not found in integration settings")
  if (!tokens.refresh_token) throw new Error("No refresh token available — please reconnect")

  const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refresh_token,
    }).toString(),
  })

  if (!refreshResponse.ok) {
    const errorText = await refreshResponse.text()
    log("error", "Token refresh", `Failed: ${errorText}`)
    let errorData = {}
    try { errorData = JSON.parse(errorText) } catch {}
    if (errorData.error === "invalid_grant") {
      await supabase.from("company_integrations").update({ status: "expired" }).eq("id", integration.id)
      const error = new Error("Token expired. Please reconnect your Google Workspace integration.")
      error.code = "TOKEN_EXPIRED"
      error.requiresReconnect = true
      throw error
    }
    throw new Error("Token refresh failed. Please reconnect Google Workspace.")
  }

  const refreshData = await refreshResponse.json()
  const expiresIn = refreshData.expires_in || 3600
  const newExpiresAt = now + expiresIn

  const currentOauthData = decryptOAuthData(integration.settings?.oauth_data || {})
  const currentTokens = currentOauthData.tokens || {}
  const updatedOauthData = {
    ...currentOauthData,
    tokens: {
      ...currentTokens,
      access_token: refreshData.access_token,
      // Google does NOT rotate refresh tokens — keep the existing one
      refresh_token: currentTokens.refresh_token,
      expires_in: expiresIn,
      expires_at: newExpiresAt,
      scope: refreshData.scope || currentTokens.scope,
    },
  }

  const encryptedOauthData = encryptOAuthData(updatedOauthData)
  const updatedSettings = { ...(integration.settings || {}), oauth_data: encryptedOauthData }
  const { error: updateError } = await supabase
    .from("company_integrations")
    .update({ settings: updatedSettings })
    .eq("id", integration.id)
  if (updateError) log("error", "Token refresh", `Persist failed: ${updateError.message}`)

  log("log", "Token refresh", "Token refreshed successfully")
  return refreshData.access_token
}

async function refreshTokenIfNeeded(integration, tokens) {
  const id = integration.id
  if (integration.status === "expired") {
    const error = new Error("Token expired. Please reconnect your Google Workspace integration.")
    error.code = "TOKEN_EXPIRED"
    error.requiresReconnect = true
    throw error
  }

  if (tokenRefreshLocks.has(id)) {
    try { return await tokenRefreshLocks.get(id) } catch (err) {
      const { data: fresh } = await supabase.from("company_integrations").select("*").eq("id", id).maybeSingle()
      if (fresh) {
        const od = decryptOAuthData(fresh.settings?.oauth_data || {})
        if (od?.tokens?.access_token) return od.tokens.access_token
      }
      throw err
    }
  }

  let expiresAt = tokens.expires_at
  if (typeof expiresAt === "string") expiresAt = Math.floor(new Date(expiresAt).getTime() / 1000)
  const now = Math.floor(Date.now() / 1000)
  if (!expiresAt || now < expiresAt - 300) return tokens.access_token

  const refreshPromise = doTokenRefresh(integration, tokens)
  tokenRefreshLocks.set(id, refreshPromise)
  try { return await refreshPromise } finally { tokenRefreshLocks.delete(id) }
}

// ── Generic Google API fetch ─────────────────────────────────────────────────
async function fetchGoogleApi(url, accessToken, scopeName) {
  const rl = checkRateLimit(accessToken)
  if (!rl.allowed) throw new Error(`Rate limit exceeded: ${rl.message}`)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  })
  if (!res.ok) {
    const text = await res.text()
    let errorData = {}
    try { errorData = JSON.parse(text) } catch {}
    if (res.status === 403) {
      throw new Error(`Missing ${scopeName} permission: ${errorData.error?.message || text}`)
    }
    if (res.status === 401) {
      throw new Error("Access token expired or invalid. Please reconnect.")
    }
    throw new Error(`Google API error: ${res.status} ${errorData.error?.message || text}`)
  }
  return res.json()
}

// ── Integration loader ───────────────────────────────────────────────────────
async function getIntegrationForUser(user) {
  const { data: profile } = await supabase
    .from("profiles").select("company_id").eq("id", user.id).maybeSingle()
  if (!profile?.company_id) return { error: "No company associated with this user", status: 400 }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("provider", PROVIDER)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!integration) return { error: "Google Workspace integration not configured", status: 404 }
  return { integration, companyId: profile.company_id }
}

// Resolve a usable access token from a stored integration, refreshing if needed.
async function resolveAccessToken(integration) {
  const oauthData = decryptOAuthData(integration.settings?.oauth_data || integration.oauth_data || {})
  const tokens = oauthData?.tokens
  if (!tokens?.access_token) {
    const err = new Error("Google Workspace is connected but no access token is stored. Please reconnect.")
    err.code = "NO_TOKEN"
    throw err
  }
  return refreshTokenIfNeeded(integration, tokens)
}

// ── OAuth start ──────────────────────────────────────────────────────────────
async function startGoogleWorkspaceOAuth(req, res) {
  const endpoint = "GET /api/integrations/googleworkspace/oauth/start"
  log("log", endpoint, "Request received")

  if (!supabase) return res.status(500).json({ error: "Supabase not configured on backend" })
  const user = req.user
  if (!user) return res.status(401).json({ error: "Unauthorized" })

  const result = await getIntegrationForUser(user)
  if (result.error) return res.status(result.status).json({ error: result.error })

  const { integration, companyId } = result
  const settings = decryptIntegrationSettings(integration?.settings || {})
  const clientId = settings.client_id
  if (!clientId) {
    return res.status(400).json({
      error: "Google Workspace Client ID not configured",
      details: "Please save your Google Cloud OAuth Client ID and Secret first.",
    })
  }

  const redirectUri = process.env.GOOGLE_WORKSPACE_REDIRECT_URI
    || "http://localhost:4000/api/integrations/googleworkspace/callback"

  // All Google-specific read-only scopes — independent of any other integration's
  // OAuth setup. After granting, the access token can read:
  //   - Directory: users, customer info, groups
  //   - Reports: usage reports (Drive/Gmail/Meet) + audit (login activity)
  //   - License Manager: per-user product/SKU assignments
  const scope = [
    "https://www.googleapis.com/auth/admin.directory.user.readonly",
    "https://www.googleapis.com/auth/admin.directory.customer.readonly",
    "https://www.googleapis.com/auth/admin.directory.group.readonly",
    "https://www.googleapis.com/auth/admin.reports.audit.readonly",
    "https://www.googleapis.com/auth/admin.reports.usage.readonly",
    "https://www.googleapis.com/auth/apps.licensing",
  ].join(" ")

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", scope)
  authUrl.searchParams.set("access_type", "offline")     // required to get a refresh_token
  authUrl.searchParams.set("prompt", "consent")          // forces refresh_token issuance even on re-auth
  authUrl.searchParams.set("include_granted_scopes", "true")

  const state = Buffer.from(JSON.stringify({ company_id: companyId })).toString("base64url")
  authUrl.searchParams.set("state", state)

  const authUrlString = authUrl.toString()
  log("log", endpoint, "Redirecting to Google OAuth")

  if ((req.headers.accept || "").includes("application/json")) {
    return res.json({ url: authUrlString })
  }
  return res.redirect(authUrlString)
}

// ── OAuth callback ───────────────────────────────────────────────────────────
async function googleWorkspaceOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/googleworkspace/callback"
  log("log", endpoint, "Request received")

  if (!supabase) return res.status(500).send("Supabase not configured on backend")

  const { code, state, error, error_description } = req.query
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"

  const cleanupPending = async (companyId) => {
    try {
      const { data: pending } = await supabase
        .from("company_integrations")
        .select("id")
        .eq("company_id", companyId)
        .eq("provider", PROVIDER)
        .eq("status", "pending")
        .maybeSingle()
      if (pending) await supabase.from("company_integrations").delete().eq("id", pending.id)
    } catch (e) {
      log("error", endpoint, `Cleanup failed: ${e.message}`)
    }
  }

  if (error) {
    log("error", endpoint, `Error from Google: ${error} ${error_description || ""}`)
    if (state) {
      try {
        const s = JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
        if (s.company_id) await cleanupPending(s.company_id)
      } catch {}
    }
    return res.redirect(`${frontendUrl}/dashboard/tools?googleworkspace=error&error=${encodeURIComponent(String(error))}`)
  }

  if (!code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/tools?googleworkspace=error_missing_code`)
  }

  let decodedState
  try {
    decodedState = JSON.parse(Buffer.from(String(state), "base64url").toString("utf8"))
  } catch {
    return res.redirect(`${frontendUrl}/dashboard/tools?googleworkspace=error_invalid_state`)
  }
  const companyId = decodedState.company_id

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", PROVIDER)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!integration) {
    return res.redirect(`${frontendUrl}/dashboard/tools?googleworkspace=error_integration_not_found`)
  }

  const settings = decryptIntegrationSettings(integration?.settings || {})
  const clientId = settings.client_id
  const clientSecret = settings.client_secret || ""
  const redirectUri = process.env.GOOGLE_WORKSPACE_REDIRECT_URI
    || "http://localhost:4000/api/integrations/googleworkspace/callback"

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code: String(code),
        redirect_uri: redirectUri,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      log("error", endpoint, `Token exchange failed: ${errorText}`)
      if (integration.status === "pending") await cleanupPending(companyId)
      return res.redirect(`${frontendUrl}/dashboard/tools?googleworkspace=error_token`)
    }

    const tokenData = await tokenResponse.json()
    log("log", endpoint, `Tokens fetched, granted scope: ${tokenData.scope || "none"}`)

    const now = Date.now()
    const expiresIn = tokenData.expires_in || 3600
    const expiresAt = Math.floor((now + expiresIn * 1000) / 1000)

    const newOauthData = {
      ...(integration.settings?.oauth_data || {}),
      tokens: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: expiresIn,
        expires_at: expiresAt,
        scope: tokenData.scope,
        token_type: tokenData.token_type,
      },
    }

    const encryptedOauthData = encryptOAuthData(newOauthData)
    const updatedSettings = { ...(integration.settings || {}), oauth_data: encryptedOauthData }

    const { error: updateError } = await supabase
      .from("company_integrations")
      .update({ settings: updatedSettings, status: "connected" })
      .eq("id", integration.id)

    if (updateError) {
      log("error", endpoint, "Failed to save tokens:", updateError)
      return res.redirect(`${frontendUrl}/dashboard/tools?googleworkspace=error_saving_tokens`)
    }

    log("log", endpoint, "Tokens saved successfully")
    return res.redirect(`${frontendUrl}/dashboard/tools?googleworkspace=connected`)
  } catch (e) {
    log("error", endpoint, "Unexpected error:", e.message)
    return res.redirect(`${frontendUrl}/dashboard/tools?googleworkspace=error_unexpected`)
  }
}

// ── Endpoints (Phase 1) ──────────────────────────────────────────────────────

async function getGoogleWorkspaceUsers(req, res) {
  const endpoint = "GET /api/integrations/googleworkspace/users"
  try {
    const user = req.user
    if (!user) return res.status(401).json({ error: "Unauthorized" })

    const result = await getIntegrationForUser(user)
    if (result.error) return res.status(result.status).json({ error: result.error })

    const accessToken = await resolveAccessToken(result.integration)

    // Page through up to 1500 users (most workspace tenants are smaller; adjust if needed)
    const allUsers = []
    let pageToken = null
    let pages = 0
    do {
      const url = new URL("https://admin.googleapis.com/admin/directory/v1/users")
      url.searchParams.set("customer", "my_customer")
      url.searchParams.set("maxResults", "500")
      url.searchParams.set("orderBy", "email")
      if (pageToken) url.searchParams.set("pageToken", pageToken)

      const data = await fetchGoogleApi(url.toString(), accessToken, "Directory user")
      if (Array.isArray(data.users)) allUsers.push(...data.users)
      pageToken = data.nextPageToken || null
      pages++
    } while (pageToken && pages < 3)

    return res.json({ users: allUsers })
  } catch (err) {
    log("error", endpoint, err.message)
    if (err.code === "TOKEN_EXPIRED" || err.requiresReconnect) {
      return res.status(400).json({ error: err.message, code: err.code, requiresReconnect: true, action: "reconnect" })
    }
    return res.status(500).json({ error: err.message })
  }
}

async function getGoogleWorkspaceDomain(req, res) {
  const endpoint = "GET /api/integrations/googleworkspace/domain"
  try {
    const user = req.user
    if (!user) return res.status(401).json({ error: "Unauthorized" })

    const result = await getIntegrationForUser(user)
    if (result.error) return res.status(result.status).json({ error: result.error })

    const accessToken = await resolveAccessToken(result.integration)
    const data = await fetchGoogleApi(
      "https://admin.googleapis.com/admin/directory/v1/customers/my_customer",
      accessToken,
      "Directory customer",
    )
    return res.json({ domain: data })
  } catch (err) {
    log("error", endpoint, err.message)
    if (err.code === "TOKEN_EXPIRED" || err.requiresReconnect) {
      return res.status(400).json({ error: err.message, code: err.code, requiresReconnect: true, action: "reconnect" })
    }
    return res.status(500).json({ error: err.message })
  }
}

// ── Phase 2 endpoints ────────────────────────────────────────────────────────

/**
 * GET /api/integrations/googleworkspace/groups
 * Returns the directory's groups (id, name, email, member count, description).
 */
async function getGoogleWorkspaceGroups(req, res) {
  const endpoint = "GET /api/integrations/googleworkspace/groups"
  try {
    const user = req.user
    if (!user) return res.status(401).json({ error: "Unauthorized" })

    const result = await getIntegrationForUser(user)
    if (result.error) return res.status(result.status).json({ error: result.error })

    const accessToken = await resolveAccessToken(result.integration)

    const allGroups = []
    let pageToken = null
    let pages = 0
    do {
      const url = new URL("https://admin.googleapis.com/admin/directory/v1/groups")
      url.searchParams.set("customer", "my_customer")
      url.searchParams.set("maxResults", "200")
      if (pageToken) url.searchParams.set("pageToken", pageToken)

      const data = await fetchGoogleApi(url.toString(), accessToken, "Directory group")
      if (Array.isArray(data.groups)) allGroups.push(...data.groups)
      pageToken = data.nextPageToken || null
      pages++
    } while (pageToken && pages < 5)

    return res.json({ groups: allGroups })
  } catch (err) {
    log("error", endpoint, err.message)
    if (err.code === "TOKEN_EXPIRED" || err.requiresReconnect) {
      return res.status(400).json({ error: err.message, code: err.code, requiresReconnect: true, action: "reconnect" })
    }
    return res.status(500).json({ error: err.message })
  }
}

/**
 * GET /api/integrations/googleworkspace/licenses
 * Returns license assignments per Google Workspace SKU.
 *
 * License Manager API requires querying per (productId, skuId), so we iterate
 * the well-known Workspace SKUs. Unknown SKUs simply return zero — they won't
 * appear in the response.
 */
const WORKSPACE_SKUS = [
  // productId, skuId, label
  ["Google-Apps", "1010020027", "Google Workspace Business Starter"],
  ["Google-Apps", "1010020028", "Google Workspace Business Standard"],
  ["Google-Apps", "1010020025", "Google Workspace Business Plus"],
  ["Google-Apps", "1010020026", "Google Workspace Enterprise Standard"],
  ["Google-Apps", "1010020020", "Google Workspace Enterprise Plus"],
  ["Google-Apps", "Google-Apps-For-Business", "G Suite Basic (legacy)"],
  ["Google-Apps", "Google-Apps-Unlimited", "G Suite Business (legacy)"],
  ["Google-Apps", "1010060003", "Google Workspace Frontline"],
]

async function getGoogleWorkspaceLicenses(req, res) {
  const endpoint = "GET /api/integrations/googleworkspace/licenses"
  try {
    const user = req.user
    if (!user) return res.status(401).json({ error: "Unauthorized" })

    const result = await getIntegrationForUser(user)
    if (result.error) return res.status(result.status).json({ error: result.error })

    const accessToken = await resolveAccessToken(result.integration)

    // Pull assignments per SKU. License Manager paginates with maxResults=100.
    const assignments = []
    for (const [productId, skuId, label] of WORKSPACE_SKUS) {
      let pageToken = null
      let pages = 0
      let skuAssignmentCount = 0
      try {
        do {
          const url = new URL(
            `https://licensing.googleapis.com/apps/licensing/v1/product/${productId}/sku/${skuId}/users`,
          )
          url.searchParams.set("customerId", "my_customer")
          url.searchParams.set("maxResults", "100")
          if (pageToken) url.searchParams.set("pageToken", pageToken)

          const data = await fetchGoogleApi(url.toString(), accessToken, "License Manager")
          const items = Array.isArray(data.items) ? data.items : []
          for (const item of items) {
            assignments.push({
              productId,
              skuId,
              skuName: label,
              userId: item.userId,
              selfLink: item.selfLink,
            })
          }
          skuAssignmentCount += items.length
          pageToken = data.nextPageToken || null
          pages++
        } while (pageToken && pages < 20)
      } catch (skuErr) {
        // A specific SKU may return 404 if the customer doesn't have it — that's fine.
        log("log", endpoint, `SKU ${skuId} (${label}) returned no data: ${skuErr.message}`)
      }
    }

    // Aggregate per-SKU summary so the frontend can render a quick overview
    // alongside the per-user assignments.
    const skuSummary = {}
    for (const a of assignments) {
      const key = a.skuId
      if (!skuSummary[key]) {
        skuSummary[key] = { skuId: a.skuId, skuName: a.skuName, productId: a.productId, assigned: 0 }
      }
      skuSummary[key].assigned++
    }

    return res.json({
      assignments,
      skuSummary: Object.values(skuSummary),
    })
  } catch (err) {
    log("error", endpoint, err.message)
    if (err.code === "TOKEN_EXPIRED" || err.requiresReconnect) {
      return res.status(400).json({ error: err.message, code: err.code, requiresReconnect: true, action: "reconnect" })
    }
    return res.status(500).json({ error: err.message })
  }
}

/**
 * GET /api/integrations/googleworkspace/reports?type=drive|gmail|meet|login
 * Pulls customer-level usage from the Reports API for the most recent
 * available date (Reports data lags ~2-3 days, so we fetch the date 3 days ago).
 *
 * type=login uses the Audit endpoint instead — gives per-user login activity
 * which feeds the cost-leak analysis ("inactive users still licensed").
 */
async function getGoogleWorkspaceReports(req, res) {
  const endpoint = "GET /api/integrations/googleworkspace/reports"
  try {
    const user = req.user
    if (!user) return res.status(401).json({ error: "Unauthorized" })

    const result = await getIntegrationForUser(user)
    if (result.error) return res.status(result.status).json({ error: result.error })

    const accessToken = await resolveAccessToken(result.integration)

    const type = String(req.query.type || "drive").toLowerCase()
    const validTypes = ["drive", "gmail", "meet", "login"]
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(", ")}` })
    }

    if (type === "login") {
      // Audit activities — gives per-actor login events for the last 30 days.
      // Used by cost-leak analysis to flag users who haven't actually logged in
      // even though Directory says they're active.
      const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const url = new URL(
        "https://admin.googleapis.com/admin/reports/v1/activity/users/all/applications/login",
      )
      url.searchParams.set("startTime", startTime)
      url.searchParams.set("maxResults", "1000")

      const allItems = []
      let pageToken = null
      let pages = 0
      do {
        if (pageToken) url.searchParams.set("pageToken", pageToken)
        const data = await fetchGoogleApi(url.toString(), accessToken, "Reports audit")
        if (Array.isArray(data.items)) allItems.push(...data.items)
        pageToken = data.nextPageToken || null
        pages++
      } while (pageToken && pages < 5)

      // Reduce to per-user last login timestamp for cost-leak analysis
      const lastLoginByUser = {}
      for (const evt of allItems) {
        const email = evt.actor?.email
        const time = evt.id?.time
        if (!email || !time) continue
        if (!lastLoginByUser[email] || time > lastLoginByUser[email]) {
          lastLoginByUser[email] = time
        }
      }

      return res.json({
        type: "login",
        items: allItems.length,
        lastLoginByUser,
      })
    }

    // Customer-level usage report. Reports data lags by ~2 days; the API will
    // 400 if we ask for "today", so we go back 3 days to be safe.
    const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const parameters =
      type === "drive"
        ? "drive:num_items_created,drive:num_owned_items,accounts:total_quota_in_mb,accounts:used_quota_in_mb"
        : type === "gmail"
        ? "gmail:num_emails_received,gmail:num_emails_sent,accounts:used_quota_in_mb"
        : "meet:total_call_minutes,meet:num_calls"

    const url = new URL(
      `https://admin.googleapis.com/admin/reports/v1/usage/dates/${date}`,
    )
    url.searchParams.set("parameters", parameters)

    const data = await fetchGoogleApi(url.toString(), accessToken, "Reports usage")
    return res.json({ type, date, report: data })
  } catch (err) {
    log("error", endpoint, err.message)
    if (err.code === "TOKEN_EXPIRED" || err.requiresReconnect) {
      return res.status(400).json({ error: err.message, code: err.code, requiresReconnect: true, action: "reconnect" })
    }
    return res.status(500).json({ error: err.message })
  }
}

/**
 * POST /api/integrations/googleworkspace/cost-leaks
 * Pulls users + licenses + login activity in parallel and runs the
 * Google-specific cost-leak analyzer. Body: { inactivityDays?: number }
 */
async function analyzeGoogleWorkspaceCostLeaksEndpoint(req, res) {
  const endpoint = "POST /api/integrations/googleworkspace/cost-leaks"
  try {
    const user = req.user
    if (!user) return res.status(401).json({ error: "Unauthorized" })

    const result = await getIntegrationForUser(user)
    if (result.error) return res.status(result.status).json({ error: result.error })

    const accessToken = await resolveAccessToken(result.integration)
    const inactivityDays = Math.min(Math.max(Number(req.body?.inactivityDays) || 30, 1), 365)

    // Pull all three datasets in parallel
    const [usersResp, licensesResp, loginResp] = await Promise.allSettled([
      (async () => {
        const allUsers = []
        let pageToken = null
        let pages = 0
        do {
          const url = new URL("https://admin.googleapis.com/admin/directory/v1/users")
          url.searchParams.set("customer", "my_customer")
          url.searchParams.set("maxResults", "500")
          if (pageToken) url.searchParams.set("pageToken", pageToken)
          const d = await fetchGoogleApi(url.toString(), accessToken, "Directory user")
          if (Array.isArray(d.users)) allUsers.push(...d.users)
          pageToken = d.nextPageToken || null
          pages++
        } while (pageToken && pages < 3)
        return allUsers
      })(),
      (async () => {
        const assignments = []
        for (const [productId, skuId, label] of WORKSPACE_SKUS) {
          let pageToken = null
          let pages = 0
          try {
            do {
              const url = new URL(
                `https://licensing.googleapis.com/apps/licensing/v1/product/${productId}/sku/${skuId}/users`,
              )
              url.searchParams.set("customerId", "my_customer")
              url.searchParams.set("maxResults", "100")
              if (pageToken) url.searchParams.set("pageToken", pageToken)
              const d = await fetchGoogleApi(url.toString(), accessToken, "License Manager")
              const items = Array.isArray(d.items) ? d.items : []
              for (const item of items) {
                assignments.push({ productId, skuId, skuName: label, userId: item.userId })
              }
              pageToken = d.nextPageToken || null
              pages++
            } while (pageToken && pages < 20)
          } catch {
            /* SKU absent for this customer */
          }
        }
        return assignments
      })(),
      (async () => {
        const url = new URL(
          "https://admin.googleapis.com/admin/reports/v1/activity/users/all/applications/login",
        )
        url.searchParams.set(
          "startTime",
          new Date(Date.now() - inactivityDays * 2 * 24 * 60 * 60 * 1000).toISOString(),
        )
        url.searchParams.set("maxResults", "1000")
        const allItems = []
        let pageToken = null
        let pages = 0
        do {
          if (pageToken) url.searchParams.set("pageToken", pageToken)
          const d = await fetchGoogleApi(url.toString(), accessToken, "Reports audit")
          if (Array.isArray(d.items)) allItems.push(...d.items)
          pageToken = d.nextPageToken || null
          pages++
        } while (pageToken && pages < 5)
        const lastLoginByUser = {}
        for (const evt of allItems) {
          const email = evt.actor?.email
          const time = evt.id?.time
          if (!email || !time) continue
          if (!lastLoginByUser[email] || time > lastLoginByUser[email]) {
            lastLoginByUser[email] = time
          }
        }
        return lastLoginByUser
      })(),
    ])

    const users = usersResp.status === "fulfilled" ? usersResp.value : []
    const assignments = licensesResp.status === "fulfilled" ? licensesResp.value : []
    const lastLoginByUser = loginResp.status === "fulfilled" ? loginResp.value : {}

    if (usersResp.status === "rejected") {
      log("error", endpoint, `Users fetch failed: ${usersResp.reason?.message}`)
    }
    if (licensesResp.status === "rejected") {
      log("error", endpoint, `License fetch failed: ${licensesResp.reason?.message}`)
    }

    const analysis = analyzeGoogleWorkspaceCostLeaks(
      { users, assignments, lastLoginByUser },
      { inactivityDays },
    )

    // Enhance with AI summary
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
    if (OPENROUTER_KEY) {
      try {
        const openaiService = require("../services/openaiService")

        const aiSummary = await openaiService.generateAnalysisSummary({
          summary: {
            totalUsers: users.length,
            totalAssignments: assignments.length,
            issuesFound: analysis.summary?.issuesFound || 0,
            potentialMonthlySavings: analysis.summary?.potentialMonthlySavings || 0,
            healthScore: analysis.summary?.healthScore || 0,
          },
          findings: analysis.findings || [],
        })

        if (aiSummary) {
          analysis.aiSummary = aiSummary
        }
      } catch (e) {
        log("warn", endpoint, `AI summary generation failed: ${e.message}`)
      }
    }

    return res.json(analysis)
  } catch (err) {
    log("error", endpoint, err.message)
    if (err.code === "TOKEN_EXPIRED" || err.requiresReconnect) {
      return res.status(400).json({ error: err.message, code: err.code, requiresReconnect: true, action: "reconnect" })
    }
    return res.status(500).json({ error: err.message })
  }
}

async function revokeGoogleWorkspaceToken(refreshToken) {
  const endpoint = "revokeGoogleWorkspaceToken"

  if (!refreshToken) {
    log("warn", endpoint, "No refresh token provided for revocation")
    return { success: false, error: "No refresh token" }
  }

  try {
    log("log", endpoint, "Revoking Google Workspace refresh token...")

    const url = `https://accounts.google.com/o/oauth2/revoke?token=${encodeURIComponent(refreshToken)}`
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })

    if (response.ok || response.status === 204) {
      log("log", endpoint, "Google Workspace token revoked successfully")
      return { success: true }
    } else {
      const errorText = await response.text()
      log("warn", endpoint, `Token revocation returned ${response.status}: ${errorText}`)
      return { success: false, error: errorText }
    }
  } catch (error) {
    log("error", endpoint, `Token revocation error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

module.exports = {
  startGoogleWorkspaceOAuth,
  googleWorkspaceOAuthCallback,
  getGoogleWorkspaceUsers,
  getGoogleWorkspaceDomain,
  getGoogleWorkspaceGroups,
  getGoogleWorkspaceLicenses,
  getGoogleWorkspaceReports,
  analyzeGoogleWorkspaceCostLeaksEndpoint,
  revokeGoogleWorkspaceToken,
}
