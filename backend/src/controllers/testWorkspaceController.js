/**
 * Test Workspace Controller
 * CRUD for test workspaces (simulated company scenarios).
 * Admin-only — used by the internal testing system.
 */

const { supabase } = require("../config/supabase")

/**
 * Create a new test workspace
 */
async function createWorkspace(req, res) {
  try {
    const { name, description, scenario_profile, metadata } = req.body

    if (!name) {
      return res.status(400).json({ error: "Missing required field: name" })
    }

    const { data, error } = await supabase
      .from("test_workspaces")
      .insert({
        name,
        description: description || null,
        scenario_profile: scenario_profile || "custom",
        metadata: metadata || {},
        created_by: req.user.id,
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.status(201).json({ workspace: data })
  } catch (err) {
    console.error("createWorkspace error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * List all workspaces
 */
async function listWorkspaces(req, res) {
  try {
    const { status } = req.query

    let query = supabase
      .from("test_workspaces")
      .select("*")
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    } else {
      query = query.neq("status", "archived")
    }

    const { data, error } = await query

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    // Fetch upload counts per workspace
    const workspaceIds = data.map((w) => w.id)
    let uploadCounts = {}
    let analysisCounts = {}

    if (workspaceIds.length > 0) {
      const { data: uploads } = await supabase
        .from("test_uploads")
        .select("workspace_id")
        .in("workspace_id", workspaceIds)

      if (uploads) {
        uploads.forEach((u) => {
          uploadCounts[u.workspace_id] = (uploadCounts[u.workspace_id] || 0) + 1
        })
      }

      const { data: analyses } = await supabase
        .from("test_analyses")
        .select("workspace_id")
        .in("workspace_id", workspaceIds)

      if (analyses) {
        analyses.forEach((a) => {
          analysisCounts[a.workspace_id] = (analysisCounts[a.workspace_id] || 0) + 1
        })
      }
    }

    const workspaces = data.map((w) => ({
      ...w,
      upload_count: uploadCounts[w.id] || 0,
      analysis_count: analysisCounts[w.id] || 0,
    }))

    res.json({ workspaces })
  } catch (err) {
    console.error("listWorkspaces error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Get a single workspace with its uploads and analyses
 */
async function getWorkspace(req, res) {
  try {
    const { id } = req.params

    const { data: workspace, error } = await supabase
      .from("test_workspaces")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !workspace) {
      return res.status(404).json({ error: "Workspace not found" })
    }

    // Fetch uploads
    const { data: uploads } = await supabase
      .from("test_uploads")
      .select("id, filename, integration_label, data_type, validation_status, validation_report, created_at")
      .eq("workspace_id", id)
      .order("created_at", { ascending: false })

    // Fetch analyses
    const { data: analyses } = await supabase
      .from("test_analyses")
      .select("id, analysis_type, template_id, template_version, integration_labels, status, scoring, duration_ms, created_at, completed_at")
      .eq("workspace_id", id)
      .order("created_at", { ascending: false })

    res.json({
      workspace,
      uploads: uploads || [],
      analyses: analyses || [],
    })
  } catch (err) {
    console.error("getWorkspace error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Update a workspace
 */
async function updateWorkspace(req, res) {
  try {
    const { id } = req.params
    const { name, description, scenario_profile, metadata, status } = req.body

    const updates = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (scenario_profile !== undefined) updates.scenario_profile = scenario_profile
    if (metadata !== undefined) updates.metadata = metadata
    if (status !== undefined) updates.status = status

    const { data, error } = await supabase
      .from("test_workspaces")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    if (!data) {
      return res.status(404).json({ error: "Workspace not found" })
    }

    res.json({ workspace: data })
  } catch (err) {
    console.error("updateWorkspace error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Delete (archive) a workspace
 */
async function deleteWorkspace(req, res) {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from("test_workspaces")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error || !data) {
      return res.status(404).json({ error: "Workspace not found" })
    }

    res.json({ message: "Workspace archived", workspace: data })
  } catch (err) {
    console.error("deleteWorkspace error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
}
