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
const { requireAuth } = require("../middleware/auth")
const {
  createPaymentIntent,
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

// Email Controller - Resend email sending
const {
  registerUserHandler,
  sendVerificationEmailHandler,
  sendPasswordResetEmailHandler,
} = require("../controllers/emailController")

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
router.get("/api/admin/employees", requireAuth, getEmployees)
router.get("/api/admin/customers", requireAuth, getCustomers)
router.get("/api/admin/subscriptions", requireAuth, getAllSubscriptions)
router.get("/api/admin/customers/:id", requireAuth, getCustomerDetailsAdmin)
router.post("/api/admin/profiles/approve", requireAuth, approveProfile)

// SaaS core routes (company + settings)
router.get("/api/company", requireAuth, getCompany)
router.post("/api/company", requireAuth, upsertCompany)

router.get("/api/tools", requireAuth, getTools)
router.get("/api/integrations", requireAuth, getIntegrations)
router.post("/api/integrations", requireAuth, upsertIntegrations)
router.delete("/api/integrations/:id", requireAuth, deleteIntegration)
router.get("/api/integrations/fortnox/oauth/start", requireAuth, startFortnoxOAuth)
router.get("/api/integrations/fortnox/callback", fortnoxOAuthCallback)
router.get("/api/integrations/fortnox/customers", requireAuth, getFortnoxCustomers)
router.get("/api/integrations/fortnox/company", requireAuth, getFortnoxCompanyInfo)
router.get("/api/integrations/fortnox/settings", requireAuth, getFortnoxSettings)
router.get("/api/integrations/fortnox/profile", requireAuth, getFortnoxProfile)
router.get("/api/integrations/fortnox/invoices", requireAuth, getFortnoxInvoices)
router.get("/api/integrations/fortnox/supplier-invoices", requireAuth, getFortnoxSupplierInvoices)
router.get("/api/integrations/fortnox/expenses", requireAuth, getFortnoxExpenses)
router.get("/api/integrations/fortnox/vouchers", requireAuth, getFortnoxVouchers)
router.get("/api/integrations/fortnox/accounts", requireAuth, getFortnoxAccounts)
router.get("/api/integrations/fortnox/articles", requireAuth, getFortnoxArticles)
router.get("/api/integrations/fortnox/suppliers", requireAuth, getFortnoxSuppliers)
router.get("/api/integrations/fortnox/cost-leaks", requireAuth, analyzeFortnoxCostLeaks)
router.post("/api/integrations/fortnox/sync-customers", requireAuth, syncFortnoxCustomers)

// Microsoft 365 routes
router.get("/api/integrations/microsoft365/oauth/start", requireAuth, startMicrosoft365OAuth)
router.get("/api/integrations/microsoft365/callback", microsoft365OAuthCallback)
router.get("/api/integrations/microsoft365/licenses", requireAuth, getMicrosoft365Licenses)
router.get("/api/integrations/microsoft365/users", requireAuth, getMicrosoft365Users)
router.get("/api/integrations/microsoft365/usage", requireAuth, getMicrosoft365UsageReports)
router.get("/api/integrations/microsoft365/cost-leaks", requireAuth, analyzeMicrosoft365CostLeaks)

router.get("/api/plans", requireAuth, getPlans)
router.post("/api/plans", requireAuth, upsertPlans)

router.get("/api/alerts", requireAuth, getAlerts)
router.post("/api/alerts", requireAuth, upsertAlerts)

// Stripe Payment Routes
router.post("/api/stripe/create-payment-intent", requireAuth, createPaymentIntent)
router.post("/api/stripe/confirm-payment", requireAuth, confirmPaymentIntent)
router.get("/api/stripe/subscription", requireAuth, getUserSubscription)
router.get("/api/stripe/plans", getPlansDetails)
router.post("/api/stripe/use-tokens", requireAuth, useTokens)
router.get("/api/stripe/token-history", requireAuth, getTokenHistory)
router.get("/api/stripe/token-balance", requireAuth, getTokenBalance)

// Stripe Webhook (requires raw body, no JSON parsing)
router.post("/api/stripe/webhook", express.raw({type: 'application/json'}), handleStripeWebhook)

// Admin Token Management Routes
router.get("/api/admin/tokens/usage", requireAuth, adminGetTokenUsage)
router.post("/api/admin/tokens/adjust", requireAuth, adminAdjustTokens)
router.post("/api/admin/subscription/change-plan", requireAuth, adminChangePlan)

// AI/OpenAI Routes
router.post("/api/ai/analyze", requireAuth, analyzeWithAI)
router.post("/api/ai/chat", requireAuth, chatAboutAnalysis)
router.post("/api/ai/recommendations", requireAuth, getRecommendations)
router.post("/api/ai/estimate-savings", requireAuth, estimateSavings)
router.post("/api/ai/summary", requireAuth, getAnalysisSummary)

// Auth Routes (public - registration)
router.post("/api/auth/register", registerUserHandler)

// Email Routes (public - no auth required for sending emails)
router.post("/api/email/send-verification", sendVerificationEmailHandler)
router.post("/api/email/send-password-reset", sendPasswordResetEmailHandler)

module.exports = router


