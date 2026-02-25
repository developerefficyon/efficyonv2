/**
 * Agent Scheduler
 * Uses node-cron to run scheduled test cycles.
 * Initialized from server.js after the app starts.
 */

const cron = require("node-cron")
const { supabase } = require("../config/supabase")
const { runImprovementCycle } = require("../services/continuousImprovementService")
const { runTestAnalysis } = require("../services/testAnalysisRunner")
const { generateStressData } = require("../services/stressTestGenerator")
const { validateData } = require("../services/schemaValidator")

// Map of schedule ID → cron task
const activeTasks = new Map()

/**
 * Initialize scheduler — load all enabled schedules from DB and start them
 */
async function initializeScheduler() {
  console.log(`[${new Date().toISOString()}] [AgentScheduler] Initializing...`)

  try {
    const { data: schedules, error } = await supabase
      .from("agent_schedules")
      .select("*")
      .eq("is_enabled", true)

    if (error) {
      // Table might not exist yet — that's fine
      console.warn(`[AgentScheduler] Could not load schedules: ${error.message}`)
      return
    }

    for (const schedule of schedules || []) {
      startSchedule(schedule)
    }

    console.log(`[${new Date().toISOString()}] [AgentScheduler] Initialized with ${activeTasks.size} active schedule(s)`)
  } catch (err) {
    console.warn(`[AgentScheduler] Initialization skipped: ${err.message}`)
  }
}

/**
 * Start a single cron schedule
 */
function startSchedule(schedule) {
  if (!cron.validate(schedule.schedule_cron)) {
    console.error(`[AgentScheduler] Invalid cron expression: "${schedule.schedule_cron}" for schedule ${schedule.id}`)
    return false
  }

  // Stop existing task if re-registering
  stopSchedule(schedule.id)

  const task = cron.schedule(schedule.schedule_cron, async () => {
    await executeSchedule(schedule)
  })

  activeTasks.set(schedule.id, task)
  console.log(`[AgentScheduler] Started: "${schedule.name}" (${schedule.schedule_cron})`)
  return true
}

/**
 * Stop a cron schedule
 */
function stopSchedule(scheduleId) {
  const task = activeTasks.get(scheduleId)
  if (task) {
    task.stop()
    activeTasks.delete(scheduleId)
    return true
  }
  return false
}

/**
 * Execute a scheduled run
 */
async function executeSchedule(schedule) {
  console.log(`[${new Date().toISOString()}] [AgentScheduler] Executing: "${schedule.name}"`)

  // Mark as running
  await supabase
    .from("agent_schedules")
    .update({ last_run_at: new Date().toISOString(), last_run_status: "running" })
    .eq("id", schedule.id)

  try {
    const config = schedule.config || {}
    let report

    if (schedule.schedule_type === "improvement_cycle") {
      report = await runImprovementCycle({
        workspaceId: schedule.workspace_id,
        scenarioProfile: config.scenario_profile || "startup_60",
        integrations: config.integrations || ["Fortnox", "Microsoft365", "HubSpot"],
        anomalyConfig: config.anomaly_config || {},
        templateId: config.template_id || null,
        userId: schedule.created_by,
        autoApplyTweaks: config.auto_apply_tweaks || false,
        maxIterations: config.max_iterations || 1,
      })
    } else if (schedule.schedule_type === "analysis_only") {
      report = await runTestAnalysis(schedule.workspace_id, {
        analysisType: config.analysis_type || "standard",
        integrationLabels: config.integrations || ["Fortnox", "Microsoft365", "HubSpot"],
        options: config.options || {},
        template: null,
        userId: schedule.created_by,
      })
    } else if (schedule.schedule_type === "stress_test") {
      const scenarios = config.scenarios || ["extreme_values", "partial_data"]
      const integrations = config.integrations || ["Fortnox"]
      const uploadResults = []

      for (const integration of integrations) {
        const { dataByType } = generateStressData(integration, scenarios, config.options || {})
        for (const [dataType, fileData] of Object.entries(dataByType)) {
          const validationReport = validateData(integration, dataType, fileData)
          const { data: upload } = await supabase
            .from("test_uploads")
            .insert({
              workspace_id: schedule.workspace_id,
              filename: `scheduled_stress_${integration.toLowerCase()}_${dataType}.json`,
              integration_label: integration,
              data_type: dataType,
              file_data: fileData,
              validation_status: validationReport.status,
              validation_report: validationReport,
              uploaded_by: schedule.created_by,
            })
            .select("id")
            .single()

          if (upload) uploadResults.push(upload.id)
        }
      }

      report = { uploadCount: uploadResults.length, uploadIds: uploadResults }
    }

    // Re-fetch schedule to get latest run_count (might have changed)
    const { data: current } = await supabase
      .from("agent_schedules")
      .select("run_count")
      .eq("id", schedule.id)
      .single()

    await supabase
      .from("agent_schedules")
      .update({
        last_run_status: "completed",
        last_run_report: report,
        run_count: (current?.run_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", schedule.id)

    console.log(`[${new Date().toISOString()}] [AgentScheduler] Completed: "${schedule.name}"`)
  } catch (err) {
    console.error(`[AgentScheduler] Schedule "${schedule.name}" failed:`, err.message)
    await supabase
      .from("agent_schedules")
      .update({
        last_run_status: "failed",
        last_run_report: { error: err.message },
        updated_at: new Date().toISOString(),
      })
      .eq("id", schedule.id)
  }
}

/**
 * Reload a specific schedule (after admin CRUD operations)
 */
async function reloadSchedule(scheduleId) {
  const { data, error } = await supabase
    .from("agent_schedules")
    .select("*")
    .eq("id", scheduleId)
    .single()

  if (error || !data) {
    stopSchedule(scheduleId)
    return
  }

  if (data.is_enabled) {
    startSchedule(data)
  } else {
    stopSchedule(scheduleId)
  }
}

/**
 * Get IDs of all active (in-memory) schedules
 */
function getActiveScheduleIds() {
  return Array.from(activeTasks.keys())
}

module.exports = {
  initializeScheduler,
  startSchedule,
  stopSchedule,
  executeSchedule,
  reloadSchedule,
  getActiveScheduleIds,
}
