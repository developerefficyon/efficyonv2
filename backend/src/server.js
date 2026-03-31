const dotenv = require("dotenv")

// Load environment variables from .env before loading the app (and Supabase)
dotenv.config()

const app = require("./app")
const { initializeScheduler } = require("./schedulers/agentScheduler")
const { initializeMonthlyReportScheduler } = require("./schedulers/monthlyReportScheduler")

// Use PORT from env or default to 4000
const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] ========================================`)
  console.log(`[${new Date().toISOString()}] Backend server starting...`)
  console.log(`[${new Date().toISOString()}] Server listening on port ${PORT}`)
  console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV || "development"}`)
  console.log(`[${new Date().toISOString()}] Supabase URL: ${process.env.SUPABASE_URL ? "✓ Configured" : "✗ Not configured"}`)
  console.log(`[${new Date().toISOString()}] ========================================`)

  // Initialize agent scheduler after server is ready
  initializeScheduler().catch((err) => {
    console.error(`[AgentScheduler] Initialization failed: ${err.message}`)
  })

  // Initialize monthly report scheduler
  try {
    initializeMonthlyReportScheduler()
  } catch (err) {
    console.error(`[MonthlyReport] Scheduler initialization failed: ${err.message}`)
  }
})




