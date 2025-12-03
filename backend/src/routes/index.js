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
router.get("/api/admin/employees", requireAuth, getEmployees)
router.get("/api/admin/customers", requireAuth, getCustomers)
router.post("/api/admin/profiles/approve", requireAuth, approveProfile)

module.exports = router


