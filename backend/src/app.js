const express = require("express")
const cors = require("cors")
const routes = require("./routes")

const app = express()

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.path}`)
  next()
})

// Global middleware
app.use(cors())
// Skip JSON parsing for Stripe webhook (needs raw body for signature verification)
app.use((req, res, next) => {
  if (req.path === '/api/stripe/webhook') {
    next()
  } else {
    // Increase limit to 50MB to handle large analysis data
    express.json({ limit: '50mb' })(req, res, next)
  }
})

// Routes
app.use("/", routes)

module.exports = app


