const express = require("express")
const { getHealth } = require("../controllers/healthController")
const {
  getRoot,
  getProfile,
  getEmployees,
  getCustomers,
  createProfile,
  createProfilePublic,
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
  upsertPlans,
  getPlans,
  upsertAlerts,
  getAlerts,
} = require("../controllers/apiController")
const { requireAuth } = require("../middleware/auth")

const router = express.Router()

// Health
router.get("/health", getHealth)

// Public API route
router.get("/api", getRoot)
router.post("/api/profiles/create-public", createProfilePublic)
router.post("/api/profiles/update-email-verified-public", updateEmailVerifiedPublic)

// Protected API routes
router.get("/api/profile", requireAuth, getProfile)
router.post("/api/profiles/create", requireAuth, createProfile)
router.post("/api/profiles/update-email-verified", requireAuth, updateEmailVerified)
router.post("/api/profile/onboarding-complete", requireAuth, completeOnboarding)
router.get("/api/admin/employees", requireAuth, getEmployees)
router.get("/api/admin/customers", requireAuth, getCustomers)
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
router.post("/api/integrations/fortnox/sync-customers", requireAuth, syncFortnoxCustomers)

router.get("/api/plans", requireAuth, getPlans)
router.post("/api/plans", requireAuth, upsertPlans)

router.get("/api/alerts", requireAuth, getAlerts)
router.post("/api/alerts", requireAuth, upsertAlerts)

module.exports = router


