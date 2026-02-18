/**
 * Test Template Controller
 * CRUD for analysis templates with versioning.
 * Admin-only — used by the internal testing system.
 */

const { supabase } = require("../config/supabase")

/**
 * List all templates (latest active version of each slug)
 */
async function listTemplates(req, res) {
  try {
    const { include_inactive } = req.query

    let query = supabase
      .from("analysis_templates")
      .select("*")
      .order("slug")
      .order("version", { ascending: false })

    if (!include_inactive) {
      query = query.eq("is_active", true)
    }

    const { data, error } = await query

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({ templates: data })
  } catch (err) {
    console.error("listTemplates error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Get a single template by ID
 */
async function getTemplate(req, res) {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from("analysis_templates")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: "Template not found" })
    }

    res.json({ template: data })
  } catch (err) {
    console.error("getTemplate error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Create a new template
 */
async function createTemplate(req, res) {
  try {
    const { slug, name, objective, targeting_scope, ai_prompt_logic, primary_kpi, kpi_description, applicable_integrations, parameters } = req.body

    if (!slug || !name || !objective || !ai_prompt_logic || !primary_kpi) {
      return res.status(400).json({ error: "Missing required fields: slug, name, objective, ai_prompt_logic, primary_kpi" })
    }

    // Check if slug already exists
    const { data: existing } = await supabase
      .from("analysis_templates")
      .select("id")
      .eq("slug", slug)
      .limit(1)

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: `Template with slug '${slug}' already exists. Use PATCH to create a new version.` })
    }

    const { data, error } = await supabase
      .from("analysis_templates")
      .insert({
        slug,
        name,
        version: 1,
        is_active: true,
        objective,
        targeting_scope: targeting_scope || {},
        ai_prompt_logic,
        primary_kpi,
        kpi_description: kpi_description || null,
        applicable_integrations: applicable_integrations || [],
        parameters: parameters || {},
        created_by: req.user.id,
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.status(201).json({ template: data })
  } catch (err) {
    console.error("createTemplate error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Update a template — creates a new version, deactivates the old one
 */
async function updateTemplate(req, res) {
  try {
    const { id } = req.params
    const updates = req.body

    // Fetch current template
    const { data: current, error: fetchError } = await supabase
      .from("analysis_templates")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !current) {
      return res.status(404).json({ error: "Template not found" })
    }

    // Deactivate current version
    await supabase
      .from("analysis_templates")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)

    // Create new version with merged fields
    const { data: newVersion, error: createError } = await supabase
      .from("analysis_templates")
      .insert({
        slug: current.slug,
        name: updates.name || current.name,
        version: current.version + 1,
        is_active: true,
        objective: updates.objective || current.objective,
        targeting_scope: updates.targeting_scope || current.targeting_scope,
        ai_prompt_logic: updates.ai_prompt_logic || current.ai_prompt_logic,
        primary_kpi: updates.primary_kpi || current.primary_kpi,
        kpi_description: updates.kpi_description !== undefined ? updates.kpi_description : current.kpi_description,
        applicable_integrations: updates.applicable_integrations || current.applicable_integrations,
        parameters: updates.parameters || current.parameters,
        created_by: req.user.id,
      })
      .select()
      .single()

    if (createError) {
      // Rollback: re-activate old version
      await supabase
        .from("analysis_templates")
        .update({ is_active: true })
        .eq("id", id)
      return res.status(500).json({ error: createError.message })
    }

    res.json({
      template: newVersion,
      previousVersion: { id: current.id, version: current.version },
    })
  } catch (err) {
    console.error("updateTemplate error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * List all versions of a template by slug
 */
async function getTemplateVersions(req, res) {
  try {
    const { slug } = req.params

    const { data, error } = await supabase
      .from("analysis_templates")
      .select("*")
      .eq("slug", slug)
      .order("version", { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: `No template found with slug '${slug}'` })
    }

    res.json({ slug, versions: data })
  } catch (err) {
    console.error("getTemplateVersions error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  getTemplateVersions,
}
