/**
 * Test Comparison Controller
 * API endpoints for comparing analysis runs side-by-side.
 * Admin-only — used by the internal testing system.
 */

const { supabase } = require("../config/supabase")
const { compareAnalyses, getTemplateTrends, generateImprovementReport } = require("../services/comparativeAnalysisService")

/**
 * Create a comparison from analysis IDs
 * POST /api/test/comparisons
 */
async function createComparison(req, res) {
  try {
    const { name, analysis_ids, workspace_id } = req.body

    if (!name || !analysis_ids || analysis_ids.length < 2) {
      return res.status(400).json({ error: "name and at least 2 analysis_ids required" })
    }

    // Fetch full analyses
    const { data: analyses, error: fetchError } = await supabase
      .from("test_analyses")
      .select("*")
      .in("id", analysis_ids)

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message })
    }

    if (!analyses || analyses.length < 2) {
      return res.status(404).json({ error: "Could not find at least 2 of the specified analyses" })
    }

    // Run comparison
    const comparisonResult = compareAnalyses(analyses)

    // Generate improvement report
    const latestAnalysis = analyses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    const aiEval = latestAnalysis?.scoring?.aiEvaluation || null
    const improvementReport = generateImprovementReport(comparisonResult, aiEval)

    // Determine workspace_id from analyses if not provided
    const wsId = workspace_id || analyses[0].workspace_id

    // Store comparison
    const { data: comparison, error: insertError } = await supabase
      .from("test_comparisons")
      .insert({
        workspace_id: wsId,
        name,
        analysis_ids,
        comparison_result: { ...comparisonResult, improvementReport },
        created_by: req.user.id,
      })
      .select()
      .single()

    if (insertError) {
      return res.status(500).json({ error: insertError.message })
    }

    res.status(201).json({ comparison })
  } catch (err) {
    console.error("createComparison error:", err)
    res.status(500).json({ error: err.message || "Internal server error" })
  }
}

/**
 * Get a comparison by ID
 * GET /api/test/comparisons/:comparisonId
 */
async function getComparison(req, res) {
  try {
    const { comparisonId } = req.params

    const { data, error } = await supabase
      .from("test_comparisons")
      .select("*")
      .eq("id", comparisonId)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: "Comparison not found" })
    }

    res.json({ comparison: data })
  } catch (err) {
    console.error("getComparison error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * List comparisons for a workspace
 * GET /api/test/workspaces/:id/comparisons
 */
async function listComparisons(req, res) {
  try {
    const { id: workspaceId } = req.params

    const { data, error } = await supabase
      .from("test_comparisons")
      .select("id, workspace_id, name, analysis_ids, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({ comparisons: data || [] })
  } catch (err) {
    console.error("listComparisons error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Get template metric trends
 * GET /api/test/templates/:slug/trends
 */
async function getTemplateMetricTrends(req, res) {
  try {
    const { slug } = req.params

    const trends = await getTemplateTrends(slug)
    res.json(trends)
  } catch (err) {
    console.error("getTemplateMetricTrends error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = {
  createComparison,
  getComparison,
  listComparisons,
  getTemplateMetricTrends,
}
