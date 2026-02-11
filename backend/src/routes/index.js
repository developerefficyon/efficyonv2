const express = require("express")
const { getHealth } = require("../controllers/healthController")
const {
  analyzeWithAI,
  chatAboutAnalysis,
  getRecommendations,
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
} = require("../controllers/adminController")

// Integration Controller - generic integration CRUD
const {
  upsertIntegrations,
  getIntegrations,
  deleteIntegration,
  getTools,
} = require("../controllers/integrationController")

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
} = require("../controllers/chatController")

// Comparison Controller - cross-platform analysis
const {
  chatComparison,
  checkComparisonAvailability,
} = require("../controllers/comparisonController")

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
router.get("/api/admin/employees", requireAuth, getEmployees)
router.get("/api/admin/customers", requireAuth, getCustomers)
router.get("/api/admin/subscriptions", requireAuth, getAllSubscriptions)
router.get("/api/admin/customers/:id", requireAuth, getCustomerDetailsAdmin)
router.post("/api/admin/profiles/approve", requireAuth, approveProfile)

// SaaS core routes (company + settings)
router.get("/api/company", requireAuth, requireRole("owner", "editor", "viewer"), getCompany)
router.post("/api/company", requireAuth, requireRole("owner"), upsertCompany)

router.get("/api/tools", requireAuth, requireRole("owner", "editor", "viewer"), getTools)
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

// Microsoft 365 routes
router.get("/api/integrations/microsoft365/oauth/start", requireAuth, requireRole("owner", "editor"), startMicrosoft365OAuth)
router.get("/api/integrations/microsoft365/callback", microsoft365OAuthCallback)
router.get("/api/integrations/microsoft365/licenses", requireAuth, requireRole("owner", "editor", "viewer"), getMicrosoft365Licenses)
router.get("/api/integrations/microsoft365/users", requireAuth, requireRole("owner", "editor", "viewer"), getMicrosoft365Users)
router.get("/api/integrations/microsoft365/usage", requireAuth, requireRole("owner", "editor", "viewer"), getMicrosoft365UsageReports)
router.get("/api/integrations/microsoft365/cost-leaks", requireAuth, requireRole("owner", "editor", "viewer"), analyzeMicrosoft365CostLeaks)

// HubSpot routes
router.get("/api/integrations/hubspot/oauth/start", requireAuth, requireRole("owner", "editor"), startHubSpotOAuth)
router.get("/api/integrations/hubspot/callback", hubspotOAuthCallback)
router.get("/api/integrations/hubspot/users", requireAuth, requireRole("owner", "editor", "viewer"), getHubSpotUsers)
router.get("/api/integrations/hubspot/account", requireAuth, requireRole("owner", "editor", "viewer"), getHubSpotAccountInfo)
router.get("/api/integrations/hubspot/cost-leaks", requireAuth, requireRole("owner", "editor", "viewer"), analyzeHubSpotCostLeaks)
router.delete("/api/integrations/hubspot/disconnect", requireAuth, requireRole("owner", "editor"), disconnectHubSpot)

// Analysis History Routes
router.post("/api/analysis-history", requireAuth, requireRole("owner", "editor"), saveAnalysis)
router.get("/api/analysis-history", requireAuth, requireRole("owner", "editor", "viewer"), getAnalysisHistory)
router.get("/api/analysis-history/:id", requireAuth, requireRole("owner", "editor", "viewer"), getAnalysisById)
router.delete("/api/analysis-history/:id", requireAuth, requireRole("owner", "editor"), deleteAnalysis)

// Dashboard Summary Route
router.get("/api/dashboard/summary", requireAuth, requireRole("owner", "editor", "viewer"), getDashboardSummary)

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
router.post("/api/ai/recommendations", requireAuth, requireRole("owner", "editor"), getRecommendations)
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

// Cross-Platform Comparison Routes
router.post("/api/chat/comparison", requireAuth, requireRole("owner", "editor"), chatComparison)
router.get("/api/chat/comparison/availability", requireAuth, requireRole("owner", "editor", "viewer"), checkComparisonAvailability)

module.exports = router


