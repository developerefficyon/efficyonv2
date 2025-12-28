const express = require("express")
const { getHealth } = require("../controllers/healthController")
const {
  analyzeWithAI,
  chatAboutAnalysis,
  getRecommendations,
  estimateSavings,
  getAnalysisSummary,
} = require("../controllers/aiController")
const {
  getRoot,
  getProfile,
  getEmployees,
  getCustomers,
  getAllSubscriptions,
  createProfile,
  createProfilePublic,
  updateProfilePublic,
  updateEmailVerified,
  updateEmailVerifiedPublic,
  approveProfile,
  completeOnboarding,
  getCustomerDetailsAdmin,
  upsertCompany,
  getCompany,
  upsertIntegrations,
  getIntegrations,
  deleteIntegration,
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
  upsertPlans,
  getPlans,
  upsertAlerts,
  getAlerts,
} = require("../controllers/apiController")
const { requireAuth } = require("../middleware/auth")
const {
  createPaymentIntent,
  confirmPaymentIntent,
  getUserSubscription,
  getPlansDetails,
  handleStripeWebhook,
  useTokens,
} = require("../controllers/stripeController")

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

// Stripe Webhook (requires raw body, no JSON parsing)
router.post("/api/stripe/webhook", express.raw({type: 'application/json'}), handleStripeWebhook)

// AI/OpenAI Routes
router.post("/api/ai/analyze", requireAuth, analyzeWithAI)
router.post("/api/ai/chat", requireAuth, chatAboutAnalysis)
router.post("/api/ai/recommendations", requireAuth, getRecommendations)
router.post("/api/ai/estimate-savings", requireAuth, estimateSavings)
router.post("/api/ai/summary", requireAuth, getAnalysisSummary)

module.exports = router


