/**
 * Visma eAccounting Controller (cost-leak analysis + data tabs).
 *
 * Auth = customer-managed Visma OAuth 2.0. Customer registers an OAuth
 * integration in Visma's developer self-service portal
 * (https://selfservice.developer.vismaonline.com/) and pastes Client ID +
 * Secret on the connect form. We do the standard authorization-code flow
 * against identity.vismaonline.com (HTTP Basic auth on token exchange, no
 * PKCE), persist encrypted access + refresh tokens, then expose data tabs
 * and cost-leak analysis paralleling the Fortnox integration.
 *
 * Endpoints:
 *   GET  /oauth/start            redirect to authorize
 *   GET  /callback               exchange code → tokens, persist
 *   POST /validate               whoami + capture company info
 *   GET  /status                 settings snapshot (status, granted scopes, currency)
 *   GET  /company                /v2/companysettings
 *   GET  /customers              /v2/customers
 *   GET  /suppliers              /v2/suppliers
 *   GET  /invoices               /v2/customerinvoices  (customer invoices)
 *   GET  /supplier-invoices      /v2/supplierinvoices
 *   GET  /articles               /v2/articles
 *   GET  /accounts               /v2/accounts
 *   GET  /vouchers               /v2/vouchers
 *   GET  /cost-leaks             pulls invoices + supplier invoices and runs analyzer
 *   DELETE /                     revoke + clear settings
 */

const { supabase } = require("../config/supabase")
const {
  analyzeVismaCostLeaks,
  convertAnalysisToUsd,
} = require("../services/vismaCostLeakAnalysis")
const {
  VISMA_AUTH_HOST,
  FULL_SCOPES,
  encryptOAuthCreds,
  decryptOAuthCreds,
  encryptTokens,
  decryptTokens,
  encodeState,
  decodeState,
  exchangeCodeForTokens,
  revokeToken,
  evictToken,
  vismaRequest,
  vismaPaginatedList,
  fetchCompanySettings,
} = require("../utils/vismaAuth")

const VISMA_PROVIDER = "Visma"

function log(level, endpoint, message, data = null) {
  const ts = new Date().toISOString()
  const line = `[${ts}] ${endpoint} - ${message}`
  if (data) console[level](line, data)
  else console[level](line)
}

async function getIntegrationForUser(user) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile?.company_id) return { error: "No company associated with this user", status: 400 }
  const { data: integration, error } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .ilike("provider", VISMA_PROVIDER)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!integration) return { error: "Visma integration not found", status: 404 }
  return { integration, companyId: profile.company_id }
}

function mapVismaError(e) {
  const code = e?.code || ""
  if (code === "CREDS_MISSING" || code === "CREDS_DECRYPT_FAILED") {
    return { status: 400, message: e.message, hint: "Reconnect Visma to provide fresh OAuth credentials." }
  }
  if (code === "REFRESH_TOKEN_MISSING") {
    return { status: 401, message: e.message, hint: "Reconnect Visma to obtain a refresh token." }
  }
  if (code === "TOKEN_EXPIRED" || e.requiresReconnect) {
    return { status: 400, code: "TOKEN_EXPIRED", message: e.message, hint: "Reconnect your Visma integration.", action: "reconnect", requiresReconnect: true }
  }
  if (code === "OAUTH_EXCHANGE_FAILED" && e.vismaError === "invalid_client") {
    return { status: 400, message: e.message, hint: "Client ID or Secret is incorrect — verify in the Visma Developer Portal." }
  }
  if (code === "RATE_LIMITED") {
    return { status: 429, message: e.message, hint: null }
  }
  if (e.httpStatus === 401) {
    return { status: 401, message: "Visma rejected the access token — please reconnect.", hint: null }
  }
  if (e.httpStatus === 403) {
    return { status: 403, message: e.message || "Missing scope on this Visma OAuth grant — reconnect with the required scopes.", hint: "Required scopes: ea:api offline_access ea:sales_readonly ea:accounting_readonly ea:purchase_readonly" }
  }
  if (e.httpStatus === 429) {
    return { status: 503, message: "Visma throttled the request — retry in a minute.", hint: null }
  }
  return { status: e.httpStatus || 500, message: e.message || "Unexpected Visma error", hint: null }
}

// --------------------------------------------------------------------------
// OAuth start
// --------------------------------------------------------------------------
async function startVismaOAuth(req, res) {
  const endpoint = "GET /api/integrations/visma/oauth/start"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration, companyId } = lookup

  // Upgrade _pending_visma_creds → encrypted on first OAuth start
  if (integration.settings?._pending_visma_creds) {
    try {
      const pending = integration.settings._pending_visma_creds
      const encrypted = encryptOAuthCreds({ clientId: pending.clientId, clientSecret: pending.clientSecret })
      const { _pending_visma_creds, ...rest } = integration.settings
      const newSettings = { ...rest, ...encrypted }
      const { error } = await supabase
        .from("company_integrations")
        .update({ settings: newSettings })
        .eq("id", integration.id)
      if (error) {
        log("error", endpoint, "failed to persist encrypted credentials", { message: error.message })
        return res.status(500).json({ error: "Failed to save Visma credentials — please try again." })
      }
      integration.settings = newSettings
    } catch (e) {
      const mapped = mapVismaError(e)
      log("error", endpoint, "credential encryption failed", { code: e.code, message: e.message })
      return res.status(mapped.status).json({ error: mapped.message, hint: mapped.hint })
    }
  }

  let clientId
  try {
    ;({ clientId } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.status(400).json({ error: "Visma Client ID not configured. Reconnect first." })
  }

  const redirectUri =
    process.env.VISMA_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/visma/callback"

  const state = encodeState({ company_id: companyId, integration_id: integration.id })

  const authUrl = new URL(`${VISMA_AUTH_HOST}/connect/authorize`)
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", FULL_SCOPES.join(" "))
  authUrl.searchParams.set("state", state)

  const accept = req.headers.accept || ""
  if (accept.includes("application/json")) return res.json({ url: authUrl.toString() })
  return res.redirect(authUrl.toString())
}

// --------------------------------------------------------------------------
// OAuth callback (no requireAuth — Visma's redirect can't carry our session)
// --------------------------------------------------------------------------
async function vismaOAuthCallback(req, res) {
  const endpoint = "GET /api/integrations/visma/callback"
  const frontendUrl = process.env.FRONTEND_APP_URL || "http://localhost:3000"
  const { code, state, error, error_description } = req.query

  if (error) {
    log("warn", endpoint, "consent denied or error", { error, error_description })
    return res.redirect(`${frontendUrl}/dashboard/tools?visma_consent=denied&msg=${encodeURIComponent(error_description || error)}`)
  }
  if (!code || !state) {
    return res.redirect(`${frontendUrl}/dashboard/tools?visma_consent=error&msg=${encodeURIComponent("Missing code or state")}`)
  }

  let decodedState
  try {
    decodedState = decodeState(state)
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?visma_consent=error&msg=${encodeURIComponent("Invalid state")}`)
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("id", decodedState.integration_id)
    .eq("company_id", decodedState.company_id)
    .maybeSingle()
  if (!integration) {
    return res.redirect(`${frontendUrl}/dashboard/tools?visma_consent=error&msg=${encodeURIComponent("Integration not found")}`)
  }

  let clientId, clientSecret
  try {
    ;({ clientId, clientSecret } = decryptOAuthCreds(integration.settings || {}))
  } catch (e) {
    return res.redirect(`${frontendUrl}/dashboard/tools?visma_consent=error&msg=${encodeURIComponent("Credentials missing")}`)
  }

  const redirectUri =
    process.env.VISMA_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/visma/callback"

  let tokens
  try {
    tokens = await exchangeCodeForTokens({ clientId, clientSecret, code, redirectUri })
  } catch (e) {
    log("error", endpoint, "token exchange failed", { code: e.code, message: e.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?visma_consent=error&msg=${encodeURIComponent(e.message || "Token exchange failed")}`)
  }

  const expiresAtSec = Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600)
  const encryptedTokens = encryptTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })
  const nowIso = new Date().toISOString()
  const { error: persistError } = await supabase
    .from("company_integrations")
    .update({
      settings: {
        ...(integration.settings || {}),
        ...encryptedTokens,
        access_token_expires_at: expiresAtSec,
        granted_scopes: tokens.scope || null,
        last_validated_at: nowIso,
      },
      status: "connected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  if (persistError) {
    log("error", endpoint, "failed to persist tokens", { message: persistError.message })
    return res.redirect(`${frontendUrl}/dashboard/tools?visma_consent=error&msg=${encodeURIComponent("Failed to save connection — please try again.")}`)
  }

  // Best-effort: capture company name + currency
  try {
    const { data: refreshed } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("id", integration.id)
      .maybeSingle()
    if (refreshed) {
      const company = await fetchCompanySettings({ supabase, integration: refreshed })
      const company_name = company?.Name || company?.CompanyName || null
      const currency = (company?.Currency || company?.CurrencyCode || "SEK").toUpperCase()
      const country = company?.CountryCode || null
      await supabase
        .from("company_integrations")
        .update({
          settings: {
            ...(refreshed.settings || {}),
            company_name,
            home_currency: currency,
            country_code: country,
          },
        })
        .eq("id", integration.id)
    }
  } catch (e) {
    log("warn", endpoint, "company enrichment failed (non-fatal)", { code: e.code, message: e.message })
  }

  return res.redirect(`${frontendUrl}/dashboard/tools/${integration.id}?visma_consent=success`)
}

// --------------------------------------------------------------------------
// Validate / Status
// --------------------------------------------------------------------------
async function validateVisma(req, res) {
  const endpoint = "POST /api/integrations/visma/validate"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup

  try {
    const company = await fetchCompanySettings({ supabase, integration })
    const company_name = company?.Name || company?.CompanyName || null
    const currency = (company?.Currency || company?.CurrencyCode || "SEK").toUpperCase()
    const country = company?.CountryCode || null
    const nowIso = new Date().toISOString()
    await supabase
      .from("company_integrations")
      .update({
        settings: {
          ...(integration.settings || {}),
          company_name,
          home_currency: currency,
          country_code: country,
          last_validated_at: nowIso,
        },
        status: "connected",
        updated_at: nowIso,
      })
      .eq("id", integration.id)
    return res.json({
      status: "connected",
      lastValidatedAt: nowIso,
      companyName: company_name,
      homeCurrency: currency,
      countryCode: country,
    })
  } catch (e) {
    const mapped = mapVismaError(e)
    log("error", endpoint, "validate failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint, requiresReconnect: mapped.requiresReconnect })
  }
}

async function getVismaStatus(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const s = integration.settings || {}
  return res.json({
    status: integration.status,
    companyName: s.company_name || null,
    homeCurrency: s.home_currency || null,
    countryCode: s.country_code || null,
    grantedScopes: s.granted_scopes || null,
    lastValidatedAt: s.last_validated_at || null,
  })
}

// --------------------------------------------------------------------------
// Disconnect
// --------------------------------------------------------------------------
async function disconnectVisma(req, res) {
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  const nowIso = new Date().toISOString()
  const priorCompanyName = integration.settings?.company_name || null

  try {
    const { clientId, clientSecret } = decryptOAuthCreds(integration.settings || {})
    const { refresh_token, access_token } = decryptTokens(integration.settings || {})
    if (refresh_token) await revokeToken({ clientId, clientSecret, token: refresh_token, tokenTypeHint: "refresh_token" })
    if (access_token) await revokeToken({ clientId, clientSecret, token: access_token, tokenTypeHint: "access_token" })
  } catch (_) {
    // ignore — credentials may already be unusable
  }

  const { error: disconnectError } = await supabase
    .from("company_integrations")
    .update({
      settings: { disconnected_at: nowIso, prior_company_name: priorCompanyName },
      status: "disconnected",
      updated_at: nowIso,
    })
    .eq("id", integration.id)
  evictToken(integration.id)
  if (disconnectError) {
    log("error", "DELETE /api/integrations/visma", "supabase update on disconnect failed", { message: disconnectError.message })
    return res.status(500).json({ error: "Failed to disconnect — please try again.", hint: null })
  }
  return res.json({ ok: true, disconnectedAt: nowIso })
}

// --------------------------------------------------------------------------
// Generic data-endpoint factory.
// Visma eAccounting v2 endpoints return { Data: [...], Meta: {...} } envelopes
// for paginated resources, or a flat object for single-resource endpoints.
// --------------------------------------------------------------------------
function createVismaListHandler({ path, dataKey, paginate = true, query = {} }) {
  return async (req, res) => {
    const endpoint = `GET /api/integrations/visma${path}`
    const lookup = await getIntegrationForUser(req.user)
    if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
    const { integration } = lookup
    if (integration.status !== "connected") {
      return res.status(409).json({ error: "Visma integration is not connected", status: integration.status })
    }
    try {
      let items
      if (paginate) {
        items = await vismaPaginatedList({ supabase, integration, basePath: path, query, top: 200, cap: 5000 })
      } else {
        const body = await vismaRequest({ supabase, integration, path })
        items = Array.isArray(body) ? body : Array.isArray(body?.Data) ? body.Data : [body]
      }
      return res.json({ [dataKey]: items })
    } catch (e) {
      const mapped = mapVismaError(e)
      log("error", endpoint, "list failed", { code: e.code, message: e.message, status: mapped.status })
      return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint, requiresReconnect: mapped.requiresReconnect })
    }
  }
}

const getVismaCustomers = createVismaListHandler({ path: "/customers", dataKey: "customers" })
const getVismaSuppliers = createVismaListHandler({ path: "/suppliers", dataKey: "suppliers" })
const getVismaCustomerInvoices = createVismaListHandler({ path: "/customerinvoices", dataKey: "invoices" })
const getVismaSupplierInvoices = createVismaListHandler({ path: "/supplierinvoices", dataKey: "supplierInvoices" })
const getVismaArticles = createVismaListHandler({ path: "/articles", dataKey: "articles" })
const getVismaAccounts = createVismaListHandler({ path: "/accounts", dataKey: "accounts" })
const getVismaVouchers = createVismaListHandler({ path: "/vouchers", dataKey: "vouchers" })

async function getVismaCompany(req, res) {
  const endpoint = "GET /api/integrations/visma/company"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Visma integration is not connected", status: integration.status })
  }
  try {
    const company = await fetchCompanySettings({ supabase, integration })
    return res.json({ company })
  } catch (e) {
    const mapped = mapVismaError(e)
    log("error", endpoint, "company fetch failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint, requiresReconnect: mapped.requiresReconnect })
  }
}

// --------------------------------------------------------------------------
// Cost-leak analysis
// --------------------------------------------------------------------------
async function analyzeVismaCostLeaksEndpoint(req, res) {
  const endpoint = "GET /api/integrations/visma/cost-leaks"
  const lookup = await getIntegrationForUser(req.user)
  if (lookup.error) return res.status(lookup.status).json({ error: lookup.error })
  const { integration } = lookup
  if (integration.status !== "connected") {
    return res.status(409).json({ error: "Visma integration is not connected", status: integration.status })
  }

  // Optional date range — Visma supports OData $filter for InvoiceDate.
  const { startDate, endDate } = req.query
  const dateFilters = []
  if (startDate) dateFilters.push(`InvoiceDate ge ${startDate}`)
  if (endDate) dateFilters.push(`InvoiceDate le ${endDate}`)
  const filter = dateFilters.join(" and ")
  const filterQuery = filter ? { $filter: filter } : {}

  try {
    const homeCurrency = (integration.settings?.home_currency || "SEK").toUpperCase()
    const [supplierInvoicesRes, customerInvoicesRes] = await Promise.allSettled([
      vismaPaginatedList({ supabase, integration, basePath: "/supplierinvoices", query: filterQuery, top: 200, cap: 5000 }),
      vismaPaginatedList({ supabase, integration, basePath: "/customerinvoices", query: filterQuery, top: 200, cap: 5000 }),
    ])

    const supplierInvoices = supplierInvoicesRes.status === "fulfilled" ? supplierInvoicesRes.value : []
    const invoices = customerInvoicesRes.status === "fulfilled" ? customerInvoicesRes.value : []
    const fetchWarnings = []
    if (supplierInvoicesRes.status === "rejected") {
      fetchWarnings.push({ resource: "supplierInvoices", error: supplierInvoicesRes.reason?.message || String(supplierInvoicesRes.reason) })
    }
    if (customerInvoicesRes.status === "rejected") {
      fetchWarnings.push({ resource: "customerInvoices", error: customerInvoicesRes.reason?.message || String(customerInvoicesRes.reason) })
    }

    log("log", endpoint, `Fetched ${invoices.length} customer invoices, ${supplierInvoices.length} supplier invoices (currency: ${homeCurrency})`)

    let analysis = await analyzeVismaCostLeaks(
      { invoices, supplierInvoices, homeCurrency },
      { homeCurrency },
    )
    analysis = convertAnalysisToUsd(analysis)

    analysis.dateRange = {
      startDate: startDate || null,
      endDate: endDate || null,
      filtered: !!(startDate || endDate),
    }
    if (fetchWarnings.length) analysis.fetchWarnings = fetchWarnings

    // Optional AI enhancement (mirrors the Fortnox path)
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
    if (OPENROUTER_KEY) {
      try {
        const openaiService = require("../services/openaiService")
        const aiSummary = await openaiService.generateAnalysisSummary({
          summary: {
            totalInvoices: analysis.supplierInvoiceAnalysis?.summary?.totalInvoices || 0,
            totalAmount: analysis.supplierInvoiceAnalysis?.summary?.totalAmount || 0,
            duplicatePayments: analysis.supplierInvoiceAnalysis?.summary?.duplicatePayments || [],
            unusualAmounts: analysis.supplierInvoiceAnalysis?.summary?.unusualAmounts || [],
            recurringSubscriptions: analysis.supplierInvoiceAnalysis?.summary?.recurringSubscriptions || [],
            overdueInvoices: analysis.supplierInvoiceAnalysis?.summary?.overdueInvoices || [],
            priceIncreases: analysis.supplierInvoiceAnalysis?.summary?.priceIncreases || [],
          },
          findings: analysis.supplierInvoiceAnalysis?.findings || [],
        })
        if (aiSummary) analysis.aiSummary = aiSummary
        const supplierFindings = analysis.supplierInvoiceAnalysis?.findings || []
        if (supplierFindings.length > 0) {
          const enhanced = await openaiService.enhanceFindingsWithAI(supplierFindings)
          if (enhanced && Array.isArray(enhanced) && enhanced.length > 0 && analysis.supplierInvoiceAnalysis?.findings) {
            analysis.supplierInvoiceAnalysis.findings = enhanced
          }
        }
        analysis.aiEnhanced = true
        analysis.enhancedAt = new Date().toISOString()
      } catch (aiError) {
        log("warn", endpoint, "AI enhancement failed (non-fatal)", aiError.message)
        analysis.aiError = aiError.message
      }
    }

    return res.json(analysis)
  } catch (e) {
    const mapped = mapVismaError(e)
    log("error", endpoint, "analysis failed", { code: e.code, message: e.message })
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, hint: mapped.hint, requiresReconnect: mapped.requiresReconnect })
  }
}

module.exports = {
  startVismaOAuth,
  vismaOAuthCallback,
  validateVisma,
  getVismaStatus,
  disconnectVisma,
  getVismaCompany,
  getVismaCustomers,
  getVismaSuppliers,
  getVismaCustomerInvoices,
  getVismaSupplierInvoices,
  getVismaArticles,
  getVismaAccounts,
  getVismaVouchers,
  analyzeVismaCostLeaksEndpoint,
  getIntegrationForUser,
  mapVismaError,
  log,
  VISMA_PROVIDER,
}
