/**
 * Monthly Report Scheduler
 * Runs on the 1st of every month at 08:00 UTC to generate
 * and email monthly reports for all companies.
 */

const cron = require("node-cron")
const { generateAllMonthlyReports } = require("../services/monthlyReportService")

let task = null

function initializeMonthlyReportScheduler() {
  // Run at 08:00 UTC on the 1st of every month
  task = cron.schedule("0 8 1 * *", async () => {
    console.log(`[${new Date().toISOString()}] [MonthlyReport] Starting scheduled report generation...`)
    try {
      const result = await generateAllMonthlyReports()
      console.log(`[${new Date().toISOString()}] [MonthlyReport] Completed: ${result.success}/${result.total} reports sent`)
    } catch (err) {
      console.error(`[${new Date().toISOString()}] [MonthlyReport] Scheduler failed:`, err.message)
    }
  })

  console.log(`[${new Date().toISOString()}] [MonthlyReport] Scheduler initialized (1st of month, 08:00 UTC)`)
}

function stopMonthlyReportScheduler() {
  if (task) {
    task.stop()
    task = null
  }
}

module.exports = { initializeMonthlyReportScheduler, stopMonthlyReportScheduler }
