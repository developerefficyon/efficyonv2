const express = require("express")
const { getHealth } = require("../controllers/healthController")
const {
  analyzeWithAI,
  chatAboutAnalysis,
  getRecommendations: getAIRecommendations,
  estimateSavings,
  getAnalysisSummary,
} = require("../controllers/aiController")

// Profile Controller - user profile operations
const {
  getProfile,
  createProfile,
  createProfilePublic,
  updateProfilePublic,
  updateEmailVerified,
  updateEmailVerifiedPublic,
  completeOnboarding,
} = require("../controllers/profileController")

// Company Controller - company, plans, and alerts
const {
  getRoot,
  upsertCompany,
  getCompany,
  upsertPlans,
  getPlans,
  upsertAlerts,
  getAlerts,
} = require("../controllers/companyController")

// Admin Controller - admin-only operations
const {
  getEmployees,
  getCustomers,
  getAllSubscriptions,
  approveProfile,
  getCustomerDetailsAdmin,
  getAdminDashboardSummary,
  getAdminAnalytics,
  getAdminReports,
} = require("../controllers/adminController")

// Integration Controller - generic integration CRUD
const {
  upsertIntegrations,
  getIntegrations,
  deleteIntegration,
  getTools,
} = require("../controllers/integrationController")

// OpenAI cost analysis tool integration
const {
  connect: openaiConnect,
  disconnect: openaiDisconnect,
  sync: openaiSync,
  getUsage: openaiGetUsage,
  getStatus: openaiGetStatus,
} = require("../controllers/openaiUsageController")

// Anthropic cost analysis tool integration
const {
  connect: anthropicConnect,
  disconnect: anthropicDisconnect,
  sync: anthropicSync,
  getUsage: anthropicGetUsage,
  getStatus: anthropicGetStatus,
} = require("../controllers/anthropicUsageController")

// Gemini cost analysis tool integration (service account auth)
const {
  connect: geminiConnect,
  disconnect: geminiDisconnect,
  sync: geminiSync,
  getUsage: geminiGetUsage,
  getStatus: geminiGetStatus,
} = require("../controllers/geminiUsageController")

// Usage Summary Controller - AI-generated narrative summaries for OpenAI/Anthropic/Gemini
const {
  generateAndSaveUsageSummary,
  listUsageSummaries,
} = require("../controllers/usageSummaryController")

// Google Workspace OAuth + Admin SDK integration
const {
  startGoogleWorkspaceOAuth,
  googleWorkspaceOAuthCallback,
  getGoogleWorkspaceUsers,
  getGoogleWorkspaceDomain,
  getGoogleWorkspaceGroups,
  getGoogleWorkspaceLicenses,
  getGoogleWorkspaceReports,
  analyzeGoogleWorkspaceCostLeaksEndpoint,
} = require("../controllers/googleWorkspaceController")

// Fortnox Controller - Fortnox OAuth and data operations
const {
  startFortnoxOAuth,
  fortnoxOAuthCallback,
  syncFortnoxCustomers,
  getFortnoxCustomers,
  getFortnoxCompanyInfo,
  getFortnoxSettings,
  getFortnoxProfile,
  getFortnoxInvoices,
  getFortnoxSupplierInvoices,
  getFortnoxExpenses,
  getFortnoxVouchers,
  getFortnoxAccounts,
  getFortnoxArticles,
  getFortnoxSuppliers,
  analyzeFortnoxCostLeaks,
} = require("../controllers/fortnoxController")

// Microsoft 365 Controller - Microsoft 365 OAuth and data operations
const {
  startMicrosoft365OAuth,
  microsoft365OAuthCallback,
  getMicrosoft365Licenses,
  getMicrosoft365Users,
  getMicrosoft365UsageReports,
  analyzeMicrosoft365CostLeaks,
} = require("../controllers/microsoft365Controller")

// HubSpot Controller - HubSpot OAuth and data operations
const {
  startHubSpotOAuth,
  hubspotOAuthCallback,
  getHubSpotUsers,
  getHubSpotAccountInfo,
  analyzeHubSpotCostLeaks,
  disconnectHubSpot,
} = require("../controllers/hubspotController")

// Slack Controller - Slack OAuth and data operations
const {
  startSlackOAuth,
  slackOAuthCallback,
  getSlackUsers,
  getSlackTeam,
  analyzeSlackCostLeaks,
  disconnectSlack,
} = require("../controllers/slackController")

// GCP Controller - Google Cloud Recommender-based cost analysis
const {
  validateGcp,
  getGcpStatus,
  getGcpProjects,
  analyzeGcpCostLeaks,
  disconnectGcp,
} = require("../controllers/gcpController")

// AWS Controller - Cost Explorer + Compute Optimizer cost analysis
const {
  validateAws,
  getAwsStatus,
  getAwsAccounts,
  getAwsRegions,
  refreshAwsRegions,
  analyzeAwsCostLeaks,
  disconnectAws,
  serveCloudFormationTemplate,
} = require("../controllers/awsController")

// Azure Controller - Azure Advisor cost analysis
const {
  initiateAzureConsent,
  handleAzureConsentCallback,
  validateAzure,
  getAzureStatus,
  getAzureSubscriptions,
  refreshAzureSubscriptions,
  analyzeAzureCostLeaks,
  disconnectAzure,
} = require("../controllers/azureController")

// Zoom Controller - Zoom S2S OAuth + usage analysis
const {
  validateZoom,
  getZoomStatus,
  getZoomUsers,
  getZoomAccount,
  analyzeZoomCostLeaks,
  disconnectZoom,
} = require("../controllers/zoomController")

// GitHub Controller - per-customer GitHub App cost analysis
const {
  validateGitHub,
  getGitHubStatus,
  getGitHubMembers,
  getGitHubOrg,
  analyzeGitHubCostLeaks,
  disconnectGitHub,
} = require("../controllers/githubController")

// Stripe Integration Controller - per-customer restricted API key cost analysis
// (Distinct from stripeController.js which handles Efficyon's own billing.)
const {
  validateStripe,
  getStripeStatus,
  disconnectStripe,
  getStripeAccount,
  getStripeSubscriptions,
  getStripeInvoices,
  getStripeDisputes,
  analyzeStripeCostLeaks,
} = require("../controllers/stripeIntegrationController")

// Salesforce Integration Controller - per-customer Connected App + OAuth web-server flow
const {
  startSalesforceOAuth,
  salesforceOAuthCallback,
  validateSalesforce,
  getSalesforceStatus,
  disconnectSalesforce,
  getSalesforceUsers,
  getSalesforceLicenses,
  getSalesforcePSLs,
} = require("../controllers/salesforceController")

// QuickBooks Controller - QuickBooks OAuth and data operations
const {
  startQuickBooksOAuth,
  quickbooksOAuthCallback,
  getQuickBooksCompanyInfo,
  getQuickBooksInvoices,
  getQuickBooksBills,
  getQuickBooksExpenses,
  getQuickBooksVendors,
  getQuickBooksAccounts,
  analyzeQuickBooksCostLeaks,
  disconnectQuickBooks,
} = require("../controllers/quickbooksController")

// Recommendation Controller - shared across all providers
const {
  getRecommendations,
  applyRecommendation,
  updateRecommendationSteps,
  deleteRecommendation,
} = require("../controllers/recommendationController")

// Shopify Controller - Shopify OAuth and data operations
const {
  startShopifyOAuth,
  shopifyOAuthCallback,
  getShopifyShopInfo,
  getShopifyOrders,
  getShopifyProducts,
  getShopifyAppCharges,
  getShopifyInventoryLevels,
  analyzeShopifyCostLeaks,
  disconnectShopify,
} = require("../controllers/shopifyController")
const { requireAuth } = require("../middleware/auth")
const { requireRole } = require("../middleware/requireRole")
const {
  createPaymentIntent,
  createTrialSetupSession,
  confirmPaymentIntent,
  getUserSubscription,
  getPlansDetails,
  handleStripeWebhook,
  useTokens,
  getTokenHistory,
  getTokenBalance,
  adminGetTokenUsage,
  adminAdjustTokens,
  adminChangePlan,
  getTokenPackages,
  purchaseTokens,
} = require("../controllers/stripeController")

// Auth Controller - login
const { loginHandler } = require("../controllers/authController")

// Email Controller - Resend email sending
const {
  registerUserHandler,
  sendVerificationEmailHandler,
  sendPasswordResetEmailHandler,
} = require("../controllers/emailController")

// Chat Controller - chat conversations and history
const {
  getConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  addMessage,
  chatWithTool,
  chatWithFileUpload,
} = require("../controllers/chatController")

// Comparison Controller - cross-platform analysis
const {
  chatComparison,
  checkComparisonAvailability,
} = require("../controllers/comparisonController")

// Settings Controller - user/company settings
const { getAiModel, setAiModel } = require("../controllers/settingsController")

// Team Controller - team member management and invitations
const {
  getTeamMembers,
  inviteTeamMember,
  acceptInvitation,
  updateMemberRole,
  removeMember,
  revokeInvitation,
  resendInvitation,
} = require("../controllers/teamController")

// Analysis History Controller - store and retrieve past analyses
const {
  saveAnalysis,
  getAnalysisHistory,
  getAnalysisById,
  deleteAnalysis,
  getDashboardSummary,
} = require("../controllers/analysisHistoryController")

// Savings Controller - cumulative savings summary
const { getSavingsSummary } = require("../controllers/savingsController")

// Renewal Controller - renewal alert detection and management
const {
  getRenewalAlerts,
  dismissRenewal,
  refreshRenewals,
} = require("../controllers/renewalController")

// Monthly Report Controller - monthly report generation and viewing
const {
  getMonthlyReports,
  getMonthlyReportByMonth,
  triggerMonthlyReport,
} = require("../controllers/monthlyReportController")

const router = express.Router()

// Health
router.get("/health", getHealth)

// Public API route
router.get("/api", getRoot)
router.post("/api/profiles/create-public", createProfilePublic)
router.post("/api/profiles/update-public", updateProfilePublic)
router.post("/api/profiles/update-email-verified-public", updateEmailVerifiedPublic)

// Protected API routes
router.get("/api/profile", requireAuth, getProfile)
router.post("/api/profiles/create", requireAuth, createProfile)
router.post("/api/profiles/update-email-verified", requireAuth, updateEmailVerified)
router.post("/api/profile/onboarding-complete", requireAuth, completeOnboarding)
router.get("/api/admin/dashboard/summary", requireAuth, getAdminDashboardSummary)
router.get("/api/admin/analytics", requireAuth, getAdminAnalytics)
router.get("/api/admin/employees", requireAuth, getEmployees)
router.get("/api/admin/customers", requireAuth, getCustomers)
router.get("/api/admin/subscriptions", requireAuth, getAllSubscriptions)
router.get("/api/admin/customers/:id", requireAuth, getCustomerDetailsAdmin)
router.post("/api/admin/profiles/approve", requireAuth, approveProfile)
router.get("/api/admin/reports", requireAuth, getAdminReports)

// SaaS core routes (company + settings)
router.get("/api/company", requireAuth, requireRole("owner", "editor", "viewer"), getCompany)
router.post("/api/company", requireAuth, requireRole("owner"), upsertCompany)

// Settings routes
router.get("/api/settings/ai-model", requireAuth, requireRole("owner", "editor", "viewer"), getAiModel)
router.put("/api/settings/ai-model", requireAuth, requireRole("owner"), setAiModel)

router.get("/api/tools", requireAuth, requireRole("owner", "editor", "viewer"), getTools)

// OpenAI cost analysis tool
router.post("/api/integrations/openai/connect", requireAuth, requireRole("owner", "editor"), openaiConnect)
router.delete("/api/integrations/openai", requireAuth, requireRole("owner", "editor"), openaiDisconnect)
router.post("/api/integrations/openai/sync", requireAuth, requireRole("owner", "editor"), openaiSync)
router.get("/api/integrations/openai/usage", requireAuth, requireRole("owner", "editor", "viewer"), openaiGetUsage)
router.get("/api/integrations/openai/status", requireAuth, requireRole("owner", "editor", "viewer"), openaiGetStatus)

// Anthropic cost analysis tool
router.post("/api/integrations/anthropic/connect", requireAuth, requireRole("owner", "editor"), anthropicConnect)
router.delete("/api/integrations/anthropic", requireAuth, requireRole("owner", "editor"), anthropicDisconnect)
router.post("/api/integrations/anthropic/sync", requireAuth, requireRole("owner", "editor"), anthropicSync)
router.get("/api/integrations/anthropic/usage", requireAuth, requireRole("owner", "editor", "viewer"), anthropicGetUsage)
router.get("/api/integrations/anthropic/status", requireAuth, requireRole("owner", "editor", "viewer"), anthropicGetStatus)

// Gemini cost analysis tool
router.post("/api/integrations/gemini/connect", requireAuth, requireRole("owner", "editor"), geminiConnect)
router.delete("/api/integrations/gemini", requireAuth, requireRole("owner", "editor"), geminiDisconnect)
router.post("/api/integrations/gemini/sync", requireAuth, requireRole("owner", "editor"), geminiSync)
router.get("/api/integrations/gemini/usage", requireAuth, requireRole("owner", "editor", "viewer"), geminiGetUsage)
router.get("/api/integrations/gemini/status", requireAuth, requireRole("owner", "editor", "viewer"), geminiGetStatus)

// Usage Summary routes (AI tools: OpenAI, Anthropic, Gemini)
router.post("/api/integrations/:id/usage-summary", requireAuth, requireRole("owner", "editor"), generateAndSaveUsageSummary)
router.get("/api/integrations/:id/usage-summaries", requireAuth, requireRole("owner", "editor", "viewer"), listUsageSummaries)

// Google Workspace OAuth + Directory
router.get("/api/integrations/googleworkspace/oauth/start", requireAuth, requireRole("owner", "editor"), startGoogleWorkspaceOAuth)
router.get("/api/integrations/googleworkspace/callback", googleWorkspaceOAuthCallback)
router.get("/api/integrations/googleworkspace/users", requireAuth, requireRole("owner", "editor", "viewer"), getGoogleWorkspaceUsers)
router.get("/api/integrations/googleworkspace/domain", requireAuth, requireRole("owner", "editor", "viewer"), getGoogleWorkspaceDomain)
router.get("/api/integrations/googleworkspace/groups", requireAuth, requireRole("owner", "editor", "viewer"), getGoogleWorkspaceGroups)
router.get("/api/integrations/googleworkspace/licenses", requireAuth, requireRole("owner", "editor", "viewer"), getGoogleWorkspaceLicenses)
router.get("/api/integrations/googleworkspace/reports", requireAuth, requireRole("owner", "editor", "viewer"), getGoogleWorkspaceReports)
router.post("/api/integrations/googleworkspace/cost-leaks", requireAuth, requireRole("owner", "editor", "viewer"), analyzeGoogleWorkspaceCostLeaksEndpoint)
router.get("/api/integrations", requireAuth, requireRole("owner", "editor", "viewer"), getIntegrations)
router.post("/api/integrations", requireAuth, requireRole("owner", "editor"), upsertIntegrations)
router.delete("/api/integrations/:id", requireAuth, requireRole("owner", "editor"), deleteIntegration)
router.get("/api/integrations/fortnox/oauth/start", requireAuth, requireRole("owner", "editor"), startFortnoxOAuth)
router.get("/api/integrations/fortnox/callback", fortnoxOAuthCallback)
router.get("/api/integrations/fortnox/customers", requireAuth, requireRole("owner", "editor", "viewer"), getFortnoxCustomers)
router.get("/api/integrations/fortnox/company", requireAuth, requireRole("owner", "editor", "viewer"), getFortnoxCompanyInfo)
router.get("/api/integrations/fortnox/settings", requireAuth, requireRole("owner", "editor", "viewer"), getFortnoxSettings)
router.get("/api/integrations/fortnox/profile", requireAuth, requireRole("owner", "editor", "viewer"), getFortnoxProfile)
router.get("/api/integrations/fortnox/invoices", requireAuth, requireRole("owner", "editor", "viewer"), getFortnoxInvoices)
router.get("/api/integrations/fortnox/supplier-invoices", requireAuth, requireRole("owner", "editor", "viewer"), getFortnoxSupplierInvoices)
router.get("/api/integrations/fortnox/expenses", requireAuth, requireRole("owner", "editor", "viewer"), getFortnoxExpenses)
router.get("/api/integrations/fortnox/vouchers", requireAuth, requireRole("owner", "editor", "viewer"), getFortnoxVouchers)
router.get("/api/integrations/fortnox/accounts", requireAuth, requireRole("owner", "editor", "viewer"), getFortnoxAccounts)
router.get("/api/integrations/fortnox/articles", requireAuth, requireRole("owner", "editor", "viewer"), getFortnoxArticles)
router.get("/api/integrations/fortnox/suppliers", requireAuth, requireRole("owner", "editor", "viewer"), getFortnoxSuppliers)
router.get("/api/integrations/fortnox/cost-leaks", requireAuth, requireRole("owner", "editor", "viewer"), analyzeFortnoxCostLeaks)
router.post("/api/integrations/fortnox/sync-customers", requireAuth, requireRole("owner", "editor"), syncFortnoxCustomers)
router.get("/api/integrations/fortnox/recommendations", requireAuth, requireRole("owner", "editor", "viewer"), getRecommendations)
router.post("/api/integrations/fortnox/recommendations/apply", requireAuth, requireRole("owner", "editor"), applyRecommendation)
router.patch("/api/integrations/fortnox/recommendations/steps", requireAuth, requireRole("owner", "editor"), updateRecommendationSteps)
router.delete("/api/integrations/fortnox/recommendations/:id", requireAuth, requireRole("owner"), deleteRecommendation)

// Microsoft 365 routes
router.get("/api/integrations/microsoft365/oauth/start", requireAuth, requireRole("owner", "editor"), startMicrosoft365OAuth)
router.get("/api/integrations/microsoft365/callback", microsoft365OAuthCallback)
router.get("/api/integrations/microsoft365/licenses", requireAuth, requireRole("owner", "editor", "viewer"), getMicrosoft365Licenses)
router.get("/api/integrations/microsoft365/users", requireAuth, requireRole("owner", "editor", "viewer"), getMicrosoft365Users)
router.get("/api/integrations/microsoft365/usage", requireAuth, requireRole("owner", "editor", "viewer"), getMicrosoft365UsageReports)
router.get("/api/integrations/microsoft365/cost-leaks", requireAuth, requireRole("owner", "editor", "viewer"), analyzeMicrosoft365CostLeaks)
router.get("/api/integrations/microsoft365/recommendations", requireAuth, requireRole("owner", "editor", "viewer"), getRecommendations)
router.post("/api/integrations/microsoft365/recommendations/apply", requireAuth, requireRole("owner", "editor"), applyRecommendation)
router.patch("/api/integrations/microsoft365/recommendations/steps", requireAuth, requireRole("owner", "editor"), updateRecommendationSteps)
router.delete("/api/integrations/microsoft365/recommendations/:id", requireAuth, requireRole("owner"), deleteRecommendation)

// HubSpot routes
router.get("/api/integrations/hubspot/oauth/start", requireAuth, requireRole("owner", "editor"), startHubSpotOAuth)
router.get("/api/integrations/hubspot/callback", hubspotOAuthCallback)
router.get("/api/integrations/hubspot/users", requireAuth, requireRole("owner", "editor", "viewer"), getHubSpotUsers)
router.get("/api/integrations/hubspot/account", requireAuth, requireRole("owner", "editor", "viewer"), getHubSpotAccountInfo)
router.get("/api/integrations/hubspot/cost-leaks", requireAuth, requireRole("owner", "editor", "viewer"), analyzeHubSpotCostLeaks)
router.get("/api/integrations/hubspot/recommendations", requireAuth, requireRole("owner", "editor", "viewer"), getRecommendations)
router.post("/api/integrations/hubspot/recommendations/apply", requireAuth, requireRole("owner", "editor"), applyRecommendation)
router.patch("/api/integrations/hubspot/recommendations/steps", requireAuth, requireRole("owner", "editor"), updateRecommendationSteps)
router.delete("/api/integrations/hubspot/recommendations/:id", requireAuth, requireRole("owner"), deleteRecommendation)
router.delete("/api/integrations/hubspot/disconnect", requireAuth, requireRole("owner", "editor"), disconnectHubSpot)

// Slack routes
router.get("/api/integrations/slack/oauth/start", requireAuth, requireRole("owner", "editor"), startSlackOAuth)
router.get("/api/integrations/slack/callback", slackOAuthCallback)
router.get("/api/integrations/slack/users", requireAuth, requireRole("owner", "editor", "viewer"), getSlackUsers)
router.get("/api/integrations/slack/team", requireAuth, requireRole("owner", "editor", "viewer"), getSlackTeam)
router.get("/api/integrations/slack/cost-leaks", requireAuth, requireRole("owner", "editor", "viewer"), analyzeSlackCostLeaks)
router.get("/api/integrations/slack/recommendations", requireAuth, requireRole("owner", "editor", "viewer"), getRecommendations)
router.post("/api/integrations/slack/recommendations/apply", requireAuth, requireRole("owner", "editor"), applyRecommendation)
router.patch("/api/integrations/slack/recommendations/steps", requireAuth, requireRole("owner", "editor"), updateRecommendationSteps)
router.delete("/api/integrations/slack/recommendations/:id", requireAuth, requireRole("owner"), deleteRecommendation)
router.delete("/api/integrations/slack/disconnect", requireAuth, requireRole("owner", "editor"), disconnectSlack)

// GCP routes
router.post(  "/api/integrations/gcp/validate",              requireAuth, requireRole("owner", "editor"),           validateGcp)
router.get(   "/api/integrations/gcp/status",                requireAuth, requireRole("owner", "editor", "viewer"), getGcpStatus)
router.get(   "/api/integrations/gcp/projects",              requireAuth, requireRole("owner", "editor", "viewer"), getGcpProjects)
router.get(   "/api/integrations/gcp/cost-leaks",            requireAuth, requireRole("owner", "editor", "viewer"), analyzeGcpCostLeaks)
router.get(   "/api/integrations/gcp/recommendations",       requireAuth, requireRole("owner", "editor", "viewer"), getRecommendations)
router.post(  "/api/integrations/gcp/recommendations/apply", requireAuth, requireRole("owner", "editor"),           applyRecommendation)
router.patch( "/api/integrations/gcp/recommendations/steps", requireAuth, requireRole("owner", "editor"),           updateRecommendationSteps)
router.delete("/api/integrations/gcp/recommendations/:id",   requireAuth, requireRole("owner"),                     deleteRecommendation)
router.delete("/api/integrations/gcp/disconnect",            requireAuth, requireRole("owner", "editor"),           disconnectGcp)

// AWS routes
router.get(   "/api/aws/cloudformation-template",              serveCloudFormationTemplate) // NO AUTH - static YAML
router.post(  "/api/integrations/aws/validate",                requireAuth, requireRole("owner", "editor"),           validateAws)
router.get(   "/api/integrations/aws/status",                  requireAuth, requireRole("owner", "editor", "viewer"), getAwsStatus)
router.get(   "/api/integrations/aws/accounts",                requireAuth, requireRole("owner", "editor", "viewer"), getAwsAccounts)
router.get(   "/api/integrations/aws/regions",                 requireAuth, requireRole("owner", "editor", "viewer"), getAwsRegions)
router.post(  "/api/integrations/aws/regions/refresh",         requireAuth, requireRole("owner", "editor"),           refreshAwsRegions)
router.post(  "/api/integrations/aws/cost-leaks",              requireAuth, requireRole("owner", "editor"),           analyzeAwsCostLeaks)
router.delete("/api/integrations/aws",                         requireAuth, requireRole("owner", "editor"),           disconnectAws)

// Azure routes
router.get(   "/api/integrations/azure/consent",                 requireAuth, requireRole("owner", "editor"),           initiateAzureConsent)
router.get(   "/api/integrations/azure/consent-callback",                                                               handleAzureConsentCallback) // NO AUTH — Microsoft redirect
router.post(  "/api/integrations/azure/validate",                requireAuth, requireRole("owner", "editor"),           validateAzure)
router.get(   "/api/integrations/azure/status",                  requireAuth, requireRole("owner", "editor", "viewer"), getAzureStatus)
router.get(   "/api/integrations/azure/subscriptions",           requireAuth, requireRole("owner", "editor", "viewer"), getAzureSubscriptions)
router.post(  "/api/integrations/azure/subscriptions/refresh",   requireAuth, requireRole("owner", "editor"),           refreshAzureSubscriptions)
router.post(  "/api/integrations/azure/cost-leaks",              requireAuth, requireRole("owner", "editor"),           analyzeAzureCostLeaks)
router.delete("/api/integrations/azure",                         requireAuth, requireRole("owner", "editor"),           disconnectAzure)

// Zoom routes
router.post(  "/api/integrations/zoom/validate",     requireAuth, requireRole("owner", "editor"),           validateZoom)
router.get(   "/api/integrations/zoom/status",       requireAuth, requireRole("owner", "editor", "viewer"), getZoomStatus)
router.get(   "/api/integrations/zoom/users",        requireAuth, requireRole("owner", "editor", "viewer"), getZoomUsers)
router.get(   "/api/integrations/zoom/account",      requireAuth, requireRole("owner", "editor", "viewer"), getZoomAccount)
router.post(  "/api/integrations/zoom/cost-leaks",   requireAuth, requireRole("owner", "editor"),           analyzeZoomCostLeaks)
router.delete("/api/integrations/zoom",              requireAuth, requireRole("owner", "editor"),           disconnectZoom)

// GitHub routes
router.post(  "/api/integrations/github/validate",     requireAuth, requireRole("owner", "editor"),           validateGitHub)
router.get(   "/api/integrations/github/status",       requireAuth, requireRole("owner", "editor", "viewer"), getGitHubStatus)
router.get(   "/api/integrations/github/members",      requireAuth, requireRole("owner", "editor", "viewer"), getGitHubMembers)
router.get(   "/api/integrations/github/org",          requireAuth, requireRole("owner", "editor", "viewer"), getGitHubOrg)
router.post(  "/api/integrations/github/cost-leaks",   requireAuth, requireRole("owner", "editor"),           analyzeGitHubCostLeaks)
router.delete("/api/integrations/github",              requireAuth, requireRole("owner", "editor"),           disconnectGitHub)

// Stripe Integration routes (revenue-leak analysis)
router.post(  "/api/integrations/stripe/validate",       requireAuth, requireRole("owner", "editor"),           validateStripe)
router.get(   "/api/integrations/stripe/status",         requireAuth, requireRole("owner", "editor", "viewer"), getStripeStatus)
router.get(   "/api/integrations/stripe/account",        requireAuth, requireRole("owner", "editor", "viewer"), getStripeAccount)
router.get(   "/api/integrations/stripe/subscriptions",  requireAuth, requireRole("owner", "editor", "viewer"), getStripeSubscriptions)
router.get(   "/api/integrations/stripe/invoices",       requireAuth, requireRole("owner", "editor", "viewer"), getStripeInvoices)
router.get(   "/api/integrations/stripe/disputes",       requireAuth, requireRole("owner", "editor", "viewer"), getStripeDisputes)
router.post(  "/api/integrations/stripe/cost-leaks",      requireAuth, requireRole("owner", "editor"),           analyzeStripeCostLeaks)
router.delete("/api/integrations/stripe",                requireAuth, requireRole("owner", "editor"),           disconnectStripe)

// Salesforce Integration routes (cost-leak analysis)
router.get(   "/api/integrations/salesforce/oauth/start", requireAuth, requireRole("owner", "editor"),           startSalesforceOAuth)
router.get(   "/api/integrations/salesforce/callback",                                                            salesforceOAuthCallback) // NO AUTH — Salesforce browser redirect; state param verifies
router.post(  "/api/integrations/salesforce/validate",    requireAuth, requireRole("owner", "editor"),           validateSalesforce)
router.get(   "/api/integrations/salesforce/status",      requireAuth, requireRole("owner", "editor", "viewer"), getSalesforceStatus)
router.get(   "/api/integrations/salesforce/users",       requireAuth, requireRole("owner", "editor", "viewer"), getSalesforceUsers)
router.get(   "/api/integrations/salesforce/licenses",    requireAuth, requireRole("owner", "editor", "viewer"), getSalesforceLicenses)
router.get(   "/api/integrations/salesforce/psls",        requireAuth, requireRole("owner", "editor", "viewer"), getSalesforcePSLs)
router.delete("/api/integrations/salesforce",             requireAuth, requireRole("owner", "editor"),           disconnectSalesforce)

// QuickBooks routes
router.get("/api/integrations/quickbooks/oauth/start", requireAuth, requireRole("owner", "editor"), startQuickBooksOAuth)
router.get("/api/integrations/quickbooks/callback", quickbooksOAuthCallback)
router.get("/api/integrations/quickbooks/company", requireAuth, requireRole("owner", "editor", "viewer"), getQuickBooksCompanyInfo)
router.get("/api/integrations/quickbooks/invoices", requireAuth, requireRole("owner", "editor", "viewer"), getQuickBooksInvoices)
router.get("/api/integrations/quickbooks/bills", requireAuth, requireRole("owner", "editor", "viewer"), getQuickBooksBills)
router.get("/api/integrations/quickbooks/expenses", requireAuth, requireRole("owner", "editor", "viewer"), getQuickBooksExpenses)
router.get("/api/integrations/quickbooks/vendors", requireAuth, requireRole("owner", "editor", "viewer"), getQuickBooksVendors)
router.get("/api/integrations/quickbooks/accounts", requireAuth, requireRole("owner", "editor", "viewer"), getQuickBooksAccounts)
router.get("/api/integrations/quickbooks/cost-leaks", requireAuth, requireRole("owner", "editor", "viewer"), analyzeQuickBooksCostLeaks)
router.get("/api/integrations/quickbooks/recommendations", requireAuth, requireRole("owner", "editor", "viewer"), getRecommendations)
router.post("/api/integrations/quickbooks/recommendations/apply", requireAuth, requireRole("owner", "editor"), applyRecommendation)
router.patch("/api/integrations/quickbooks/recommendations/steps", requireAuth, requireRole("owner", "editor"), updateRecommendationSteps)
router.delete("/api/integrations/quickbooks/recommendations/:id", requireAuth, requireRole("owner"), deleteRecommendation)
router.delete("/api/integrations/quickbooks/disconnect", requireAuth, requireRole("owner", "editor"), disconnectQuickBooks)

// Shopify routes
router.get("/api/integrations/shopify/oauth/start", requireAuth, requireRole("owner", "editor"), startShopifyOAuth)
router.get("/api/integrations/shopify/callback", shopifyOAuthCallback)
router.get("/api/integrations/shopify/shop", requireAuth, requireRole("owner", "editor", "viewer"), getShopifyShopInfo)
router.get("/api/integrations/shopify/orders", requireAuth, requireRole("owner", "editor", "viewer"), getShopifyOrders)
router.get("/api/integrations/shopify/products", requireAuth, requireRole("owner", "editor", "viewer"), getShopifyProducts)
router.get("/api/integrations/shopify/app-charges", requireAuth, requireRole("owner", "editor", "viewer"), getShopifyAppCharges)
router.get("/api/integrations/shopify/inventory", requireAuth, requireRole("owner", "editor", "viewer"), getShopifyInventoryLevels)
router.get("/api/integrations/shopify/cost-leaks", requireAuth, requireRole("owner", "editor", "viewer"), analyzeShopifyCostLeaks)
router.delete("/api/integrations/shopify/disconnect", requireAuth, requireRole("owner", "editor"), disconnectShopify)

// Analysis History Routes
router.post("/api/analysis-history", requireAuth, requireRole("owner", "editor"), saveAnalysis)
router.get("/api/analysis-history", requireAuth, requireRole("owner", "editor", "viewer"), getAnalysisHistory)
router.get("/api/analysis-history/:id", requireAuth, requireRole("owner", "editor", "viewer"), getAnalysisById)
router.delete("/api/analysis-history/:id", requireAuth, requireRole("owner", "editor"), deleteAnalysis)

// Dashboard Summary Route
router.get("/api/dashboard/summary", requireAuth, requireRole("owner", "editor", "viewer"), getDashboardSummary)

// Savings Summary Route
router.get("/api/dashboard/savings-summary", requireAuth, requireRole("owner", "editor", "viewer"), getSavingsSummary)

// Renewal Alert Routes
router.get("/api/dashboard/renewal-alerts", requireAuth, requireRole("owner", "editor", "viewer"), getRenewalAlerts)
router.post("/api/dashboard/renewal-alerts/refresh", requireAuth, requireRole("owner", "editor"), refreshRenewals)
router.patch("/api/dashboard/renewal-alerts/:id/dismiss", requireAuth, requireRole("owner", "editor"), dismissRenewal)

// Monthly Report Routes
router.get("/api/dashboard/monthly-reports", requireAuth, requireRole("owner", "editor", "viewer"), getMonthlyReports)
router.get("/api/dashboard/monthly-reports/:month", requireAuth, requireRole("owner", "editor", "viewer"), getMonthlyReportByMonth)
router.post("/api/dashboard/monthly-reports/generate", requireAuth, requireRole("owner"), triggerMonthlyReport)

router.get("/api/plans", requireAuth, requireRole("owner", "editor", "viewer"), getPlans)
router.post("/api/plans", requireAuth, requireRole("owner"), upsertPlans)

router.get("/api/alerts", requireAuth, requireRole("owner", "editor", "viewer"), getAlerts)
router.post("/api/alerts", requireAuth, requireRole("owner"), upsertAlerts)

// Stripe Payment Routes
router.post("/api/stripe/create-payment-intent", requireAuth, requireRole("owner"), createPaymentIntent)
router.post("/api/stripe/create-trial-setup", requireAuth, requireRole("owner"), createTrialSetupSession)
router.post("/api/stripe/confirm-payment", requireAuth, requireRole("owner"), confirmPaymentIntent)
router.get("/api/stripe/subscription", requireAuth, requireRole("owner", "editor", "viewer"), getUserSubscription)
router.get("/api/stripe/plans", getPlansDetails)
router.post("/api/stripe/use-tokens", requireAuth, requireRole("owner"), useTokens)
router.get("/api/stripe/token-history", requireAuth, requireRole("owner", "editor", "viewer"), getTokenHistory)
router.get("/api/stripe/token-balance", requireAuth, requireRole("owner", "editor", "viewer"), getTokenBalance)
router.get("/api/stripe/token-packages", requireAuth, requireRole("owner", "editor", "viewer"), getTokenPackages)
router.post("/api/stripe/purchase-tokens", requireAuth, requireRole("owner"), purchaseTokens)

// Stripe Webhook (requires raw body, no JSON parsing)
router.post("/api/stripe/webhook", express.raw({type: 'application/json'}), handleStripeWebhook)

// Admin Token Management Routes
router.get("/api/admin/tokens/usage", requireAuth, adminGetTokenUsage)
router.post("/api/admin/tokens/adjust", requireAuth, adminAdjustTokens)
router.post("/api/admin/subscription/change-plan", requireAuth, adminChangePlan)

// Team Management Routes
router.get("/api/team/members", requireAuth, requireRole("owner", "editor", "viewer"), getTeamMembers)
router.post("/api/team/invite", requireAuth, inviteTeamMember)
router.post("/api/team/accept-invitation", requireAuth, acceptInvitation)
router.patch("/api/team/members/:memberId", requireAuth, updateMemberRole)
router.delete("/api/team/members/:memberId", requireAuth, removeMember)
router.delete("/api/team/invitations/:invitationId", requireAuth, revokeInvitation)
router.post("/api/team/invitations/:invitationId/resend", requireAuth, resendInvitation)

// AI/OpenAI Routes
router.post("/api/ai/analyze", requireAuth, requireRole("owner", "editor"), analyzeWithAI)
router.post("/api/ai/chat", requireAuth, requireRole("owner", "editor"), chatAboutAnalysis)
router.post("/api/ai/recommendations", requireAuth, requireRole("owner", "editor"), getAIRecommendations)
router.post("/api/ai/estimate-savings", requireAuth, requireRole("owner", "editor"), estimateSavings)
router.post("/api/ai/summary", requireAuth, requireRole("owner", "editor"), getAnalysisSummary)

// Auth Routes (public - registration and login)
router.post("/api/auth/register", registerUserHandler)
router.post("/api/auth/login", loginHandler)

// Email Routes (public - no auth required for sending emails)
router.post("/api/email/send-verification", sendVerificationEmailHandler)
router.post("/api/email/send-password-reset", sendPasswordResetEmailHandler)

// Chat Conversation Routes
router.get("/api/chat/conversations", requireAuth, requireRole("owner", "editor", "viewer"), getConversations)
router.get("/api/chat/conversations/:id", requireAuth, requireRole("owner", "editor", "viewer"), getConversation)
router.post("/api/chat/conversations", requireAuth, requireRole("owner", "editor"), createConversation)
router.put("/api/chat/conversations/:id", requireAuth, requireRole("owner", "editor"), updateConversation)
router.delete("/api/chat/conversations/:id", requireAuth, requireRole("owner", "editor"), deleteConversation)
router.post("/api/chat/conversations/:id/messages", requireAuth, requireRole("owner", "editor"), addMessage)
router.post("/api/chat/tool", requireAuth, requireRole("owner", "editor"), chatWithTool)
router.post("/api/chat/file-upload", requireAuth, requireRole("owner", "editor"), chatWithFileUpload)

// Cross-Platform Comparison Routes
router.post("/api/chat/comparison", requireAuth, requireRole("owner", "editor"), chatComparison)
router.get("/api/chat/comparison/availability", requireAuth, requireRole("owner", "editor", "viewer"), checkComparisonAvailability)

// ============================================================================
// Internal Testing System Routes (admin-only)
// ============================================================================
const { requireAdmin } = require("../middleware/requireAdmin")

// Test Workspace Controller
const {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
} = require("../controllers/testWorkspaceController")

// Test Upload Controller
const {
  uploadData,
  uploadFile,
  listUploads,
  getUpload,
  deleteUpload,
  revalidateUpload,
  patchUpload,
  getSchemaInfo,
} = require("../controllers/testUploadController")

// Test Analysis Controller
const {
  triggerAnalysis,
  listAnalyses,
  getAnalysis,
  deleteAnalysis: deleteTestAnalysis,
  scoreAnalysis,
  autoScoreAnalysis,
  getWorkspaceLogs,
  aiEvaluateAnalysis,
  runImprovementCycleEndpoint,
  generateAuditReport,
} = require("../controllers/testAnalysisController")

// Mock Data Generator Controller
const { generateMockData } = require("../controllers/mockDataController")

// Test Template Controller
const {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  getTemplateVersions,
} = require("../controllers/testTemplateController")

// Stress Test Controller
const { generateStressTestData, listStressScenarios } = require("../controllers/stressTestController")

// Comparison Controller
const {
  createComparison,
  getComparison,
  listComparisons,
  getTemplateMetricTrends,
} = require("../controllers/testComparisonController")

// Agent Schedule Controller
const {
  listSchedules,
  createSchedule,
  getScheduleStatus,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
  triggerScheduleNow,
} = require("../controllers/agentScheduleController")

// Workspaces
router.post("/api/test/workspaces", requireAuth, requireAdmin, createWorkspace)
router.get("/api/test/workspaces", requireAuth, requireAdmin, listWorkspaces)
router.get("/api/test/workspaces/:id", requireAuth, requireAdmin, getWorkspace)
router.patch("/api/test/workspaces/:id", requireAuth, requireAdmin, updateWorkspace)
router.delete("/api/test/workspaces/:id", requireAuth, requireAdmin, deleteWorkspace)
router.post("/api/test/workspaces/:id/generate", requireAuth, requireAdmin, generateMockData)

// Uploads
router.post("/api/test/workspaces/:id/upload-file", requireAuth, requireAdmin, uploadFile)
router.post("/api/test/workspaces/:id/uploads", requireAuth, requireAdmin, uploadData)
router.get("/api/test/workspaces/:id/uploads", requireAuth, requireAdmin, listUploads)
router.get("/api/test/uploads/:uploadId", requireAuth, requireAdmin, getUpload)
router.delete("/api/test/uploads/:uploadId", requireAuth, requireAdmin, deleteUpload)
router.patch("/api/test/uploads/:uploadId", requireAuth, requireAdmin, patchUpload)
router.post("/api/test/uploads/:uploadId/validate", requireAuth, requireAdmin, revalidateUpload)

// Analyses
router.post("/api/test/workspaces/:id/analyze", requireAuth, requireAdmin, triggerAnalysis)
router.get("/api/test/workspaces/:id/analyses", requireAuth, requireAdmin, listAnalyses)
router.get("/api/test/analyses/:analysisId", requireAuth, requireAdmin, getAnalysis)
router.delete("/api/test/analyses/:analysisId", requireAuth, requireAdmin, deleteTestAnalysis)
router.post("/api/test/analyses/:analysisId/score", requireAuth, requireAdmin, scoreAnalysis)
router.post("/api/test/analyses/:analysisId/auto-score", requireAuth, requireAdmin, autoScoreAnalysis)

// Templates
router.get("/api/test/templates", requireAuth, requireAdmin, listTemplates)
router.post("/api/test/templates", requireAuth, requireAdmin, createTemplate)
router.get("/api/test/templates/:id", requireAuth, requireAdmin, getTemplate)
router.patch("/api/test/templates/:id", requireAuth, requireAdmin, updateTemplate)
router.get("/api/test/templates/:slug/versions", requireAuth, requireAdmin, getTemplateVersions)

// Logs
router.get("/api/test/workspaces/:id/logs", requireAuth, requireAdmin, getWorkspaceLogs)

// AI Evaluation
router.post("/api/test/analyses/:analysisId/ai-evaluate", requireAuth, requireAdmin, aiEvaluateAnalysis)

// Agent Audit
router.post("/api/test/analyses/:analysisId/audit", requireAuth, requireAdmin, generateAuditReport)

// Improvement Cycle
router.post("/api/test/workspaces/:id/improvement-cycle", requireAuth, requireAdmin, runImprovementCycleEndpoint)

// Stress Testing
router.post("/api/test/workspaces/:id/stress-test", requireAuth, requireAdmin, generateStressTestData)
router.get("/api/test/stress-scenarios", requireAuth, requireAdmin, listStressScenarios)

// Comparisons
router.post("/api/test/comparisons", requireAuth, requireAdmin, createComparison)
router.get("/api/test/comparisons/:comparisonId", requireAuth, requireAdmin, getComparison)
router.get("/api/test/workspaces/:id/comparisons", requireAuth, requireAdmin, listComparisons)
router.get("/api/test/templates/:slug/trends", requireAuth, requireAdmin, getTemplateMetricTrends)

// Schedules
router.get("/api/test/schedules", requireAuth, requireAdmin, listSchedules)
router.post("/api/test/schedules", requireAuth, requireAdmin, createSchedule)
router.get("/api/test/schedules/:scheduleId", requireAuth, requireAdmin, getScheduleStatus)
router.patch("/api/test/schedules/:scheduleId", requireAuth, requireAdmin, updateSchedule)
router.delete("/api/test/schedules/:scheduleId", requireAuth, requireAdmin, deleteSchedule)
router.post("/api/test/schedules/:scheduleId/toggle", requireAuth, requireAdmin, toggleSchedule)
router.post("/api/test/schedules/:scheduleId/run-now", requireAuth, requireAdmin, triggerScheduleNow)

// Schema reference
router.get("/api/test/schemas/:integration", requireAuth, requireAdmin, getSchemaInfo)

module.exports = router


