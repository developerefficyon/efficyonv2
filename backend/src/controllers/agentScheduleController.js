/**
 * Agent Schedule Controller
 * CRUD for scheduled test runs.
 * Admin-only — used by the internal testing system.
 */

const cron = require("node-cron")
const { supabase } = require("../config/supabase")
const { reloadSchedule, executeSchedule, getActiveScheduleIds } = require("../schedulers/agentScheduler")

/**
 * List all schedules
 * GET /api/test/schedules
 */
async function listSchedules(req, res) {
  try {
    const { data, error } = await supabase
      .from("agent_schedules")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    // Annotate with active-in-memory status
    const activeIds = getActiveScheduleIds()
    const schedules = (data || []).map((s) => ({
      ...s,
      is_active_in_memory: activeIds.includes(s.id),
    }))

    res.json({ schedules })
  } catch (err) {
    console.error("listSchedules error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Create a new schedule
 * POST /api/test/schedules
 */
async function createSchedule(req, res) {
  try {
    const { name, description, workspace_id, schedule_cron, schedule_type, config } = req.body

    if (!name || !workspace_id || !schedule_cron) {
      return res.status(400).json({ error: "name, workspace_id, and schedule_cron are required" })
    }

    if (!cron.validate(schedule_cron)) {
      return res.status(400).json({ error: `Invalid cron expression: "${schedule_cron}"` })
    }

    const validTypes = ["improvement_cycle", "analysis_only", "stress_test"]
    if (schedule_type && !validTypes.includes(schedule_type)) {
      return res.status(400).json({ error: `Invalid schedule_type. Must be one of: ${validTypes.join(", ")}` })
    }

    // Verify workspace exists
    const { data: workspace, error: wsError } = await supabase
      .from("test_workspaces")
      .select("id")
      .eq("id", workspace_id)
      .single()

    if (wsError || !workspace) {
      return res.status(404).json({ error: "Workspace not found" })
    }

    const { data, error } = await supabase
      .from("agent_schedules")
      .insert({
        name,
        description: description || null,
        workspace_id,
        schedule_cron,
        schedule_type: schedule_type || "improvement_cycle",
        config: config || {},
        is_enabled: true,
        created_by: req.user.id,
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    // Activate the schedule immediately
    await reloadSchedule(data.id)

    res.status(201).json({ schedule: data })
  } catch (err) {
    console.error("createSchedule error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Get schedule status
 * GET /api/test/schedules/:scheduleId
 */
async function getScheduleStatus(req, res) {
  try {
    const { scheduleId } = req.params

    const { data, error } = await supabase
      .from("agent_schedules")
      .select("*")
      .eq("id", scheduleId)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: "Schedule not found" })
    }

    const activeIds = getActiveScheduleIds()
    res.json({
      schedule: {
        ...data,
        is_active_in_memory: activeIds.includes(data.id),
      },
    })
  } catch (err) {
    console.error("getScheduleStatus error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Update a schedule
 * PATCH /api/test/schedules/:scheduleId
 */
async function updateSchedule(req, res) {
  try {
    const { scheduleId } = req.params
    const { name, description, schedule_cron, schedule_type, config, is_enabled } = req.body

    if (schedule_cron && !cron.validate(schedule_cron)) {
      return res.status(400).json({ error: `Invalid cron expression: "${schedule_cron}"` })
    }

    const updates = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (schedule_cron !== undefined) updates.schedule_cron = schedule_cron
    if (schedule_type !== undefined) updates.schedule_type = schedule_type
    if (config !== undefined) updates.config = config
    if (is_enabled !== undefined) updates.is_enabled = is_enabled

    const { data, error } = await supabase
      .from("agent_schedules")
      .update(updates)
      .eq("id", scheduleId)
      .select()
      .single()

    if (error || !data) {
      return res.status(404).json({ error: "Schedule not found" })
    }

    // Reload the cron task
    await reloadSchedule(scheduleId)

    res.json({ schedule: data })
  } catch (err) {
    console.error("updateSchedule error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Delete a schedule
 * DELETE /api/test/schedules/:scheduleId
 */
async function deleteSchedule(req, res) {
  try {
    const { scheduleId } = req.params

    const { error } = await supabase
      .from("agent_schedules")
      .delete()
      .eq("id", scheduleId)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    // Stop the cron task
    const { stopSchedule } = require("../schedulers/agentScheduler")
    stopSchedule(scheduleId)

    res.json({ message: "Schedule deleted" })
  } catch (err) {
    console.error("deleteSchedule error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Toggle schedule enabled/disabled
 * POST /api/test/schedules/:scheduleId/toggle
 */
async function toggleSchedule(req, res) {
  try {
    const { scheduleId } = req.params

    // Fetch current state
    const { data: current, error: fetchError } = await supabase
      .from("agent_schedules")
      .select("is_enabled")
      .eq("id", scheduleId)
      .single()

    if (fetchError || !current) {
      return res.status(404).json({ error: "Schedule not found" })
    }

    const newEnabled = !current.is_enabled

    const { data, error } = await supabase
      .from("agent_schedules")
      .update({ is_enabled: newEnabled, updated_at: new Date().toISOString() })
      .eq("id", scheduleId)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    // Reload the cron task
    await reloadSchedule(scheduleId)

    res.json({ schedule: data })
  } catch (err) {
    console.error("toggleSchedule error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Trigger a schedule to run immediately
 * POST /api/test/schedules/:scheduleId/run-now
 */
async function triggerScheduleNow(req, res) {
  try {
    const { scheduleId } = req.params

    const { data: schedule, error } = await supabase
      .from("agent_schedules")
      .select("*")
      .eq("id", scheduleId)
      .single()

    if (error || !schedule) {
      return res.status(404).json({ error: "Schedule not found" })
    }

    // Execute asynchronously — respond immediately
    executeSchedule(schedule).catch((err) => {
      console.error(`[AgentScheduler] Manual trigger for "${schedule.name}" failed:`, err.message)
    })

    res.json({ message: `Schedule "${schedule.name}" triggered. Check status for results.` })
  } catch (err) {
    console.error("triggerScheduleNow error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = {
  listSchedules,
  createSchedule,
  getScheduleStatus,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
  triggerScheduleNow,
}
