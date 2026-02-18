/**
 * Test Analysis Controller
 * Triggers analyses on test workspace data and retrieves results.
 * Admin-only — used by the internal testing system.
 */

const { supabase } = require("../config/supabase")
const { runTestAnalysis, logTestRun } = require("../services/testAnalysisRunner")
const { computeDetectionScore, buildScoringPayload } = require("../services/analysisScoringService")

/**
 * Trigger an analysis on a workspace
 */
async function triggerAnalysis(req, res) {
  try {
    const { id: workspaceId } = req.params
    const { analysis_type, template_id, integration_labels, options } = req.body

    if (!analysis_type || !integration_labels || integration_labels.length === 0) {
      return res.status(400).json({ error: "Missing required fields: analysis_type, integration_labels" })
    }

    const validTypes = ["standard", "deep", "cross_platform"]
    if (!validTypes.includes(analysis_type)) {
      return res.status(400).json({ error: `Invalid analysis_type. Must be one of: ${validTypes.join(", ")}` })
    }

    if (analysis_type === "cross_platform" && integration_labels.length < 2) {
      return res.status(400).json({ error: "Cross-platform analysis requires at least 2 integrations" })
    }

    // Verify workspace exists
    const { data: workspace, error: wsError } = await supabase
      .from("test_workspaces")
      .select("id, name")
      .eq("id", workspaceId)
      .single()

    if (wsError || !workspace) {
      return res.status(404).json({ error: "Workspace not found" })
    }

    // Fetch template if specified
    let template = null
    if (template_id) {
      const { data: tmpl, error: tmplError } = await supabase
        .from("analysis_templates")
        .select("*")
        .eq("id", template_id)
        .single()

      if (tmplError || !tmpl) {
        return res.status(404).json({ error: "Template not found" })
      }
      template = tmpl
    }

    // Run the analysis
    const result = await runTestAnalysis(workspaceId, {
      analysisType: analysis_type,
      integrationLabels: integration_labels,
      options: options || {},
      template,
      userId: req.user.id,
    })

    res.status(201).json({
      analysis_id: result.analysisId,
      status: "completed",
      duration_ms: result.durationMs,
      overall_summary: result.result.overallSummary,
    })
  } catch (err) {
    console.error("triggerAnalysis error:", err)
    res.status(500).json({ error: err.message || "Analysis failed" })
  }
}

/**
 * List analyses for a workspace
 */
async function listAnalyses(req, res) {
  try {
    const { id: workspaceId } = req.params

    const { data, error } = await supabase
      .from("test_analyses")
      .select("id, workspace_id, analysis_type, template_id, template_version, integration_labels, status, scoring, duration_ms, error_log, created_at, completed_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({ analyses: data || [] })
  } catch (err) {
    console.error("listAnalyses error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Get a single analysis with full results
 */
async function getAnalysis(req, res) {
  try {
    const { analysisId } = req.params

    const { data, error } = await supabase
      .from("test_analyses")
      .select("*")
      .eq("id", analysisId)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: "Analysis not found" })
    }

    res.json({ analysis: data })
  } catch (err) {
    console.error("getAnalysis error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Score an analysis result (manual quality scoring)
 * Supports both legacy full-replace (scoring) and merge mode (quality_scores).
 */
async function scoreAnalysis(req, res) {
  try {
    const { analysisId } = req.params
    const { scoring, quality_scores } = req.body

    if (!scoring && !quality_scores) {
      return res.status(400).json({ error: "Missing required field: scoring or quality_scores" })
    }

    // Fetch analysis
    const { data: analysis, error: fetchError } = await supabase
      .from("test_analyses")
      .select("id, workspace_id, status, scoring")
      .eq("id", analysisId)
      .single()

    if (fetchError || !analysis) {
      return res.status(404).json({ error: "Analysis not found" })
    }

    if (analysis.status !== "completed") {
      return res.status(400).json({ error: "Can only score completed analyses" })
    }

    // Build final scoring payload
    let finalScoring
    if (quality_scores) {
      // Merge quality scores into existing scoring (preserving detection data)
      const existing = analysis.scoring || {}
      const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
      const avg =
        (quality_scores.clarity + quality_scores.precision + quality_scores.realism + quality_scores.actionability) / 4
      finalScoring = {
        ...existing,
        quality: {
          clarity: clamp(quality_scores.clarity, 1, 5),
          precision: clamp(quality_scores.precision, 1, 5),
          realism: clamp(quality_scores.realism, 1, 5),
          actionability: clamp(quality_scores.actionability, 1, 5),
          average: Math.round(avg * 100) / 100,
          scoredAt: new Date().toISOString(),
        },
      }
    } else {
      // Legacy full-replace path
      finalScoring = scoring
    }

    // Update scoring
    const { data, error } = await supabase
      .from("test_analyses")
      .update({ scoring: finalScoring })
      .eq("id", analysisId)
      .select("id, scoring")
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    // Log the scoring
    await logTestRun(analysis.workspace_id, analysisId, "info", "Analysis scored", finalScoring)

    res.json({ analysis_id: data.id, scoring: data.scoring })
  } catch (err) {
    console.error("scoreAnalysis error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Auto-score an analysis by comparing findings against known injected anomalies.
 * Reads anomaly_config from workspace metadata (saved during mock data generation).
 */
async function autoScoreAnalysis(req, res) {
  try {
    const { analysisId } = req.params
    const { quality_scores } = req.body

    // Fetch the full analysis
    const { data: analysis, error: fetchError } = await supabase
      .from("test_analyses")
      .select("*")
      .eq("id", analysisId)
      .single()

    if (fetchError || !analysis) {
      return res.status(404).json({ error: "Analysis not found" })
    }

    if (analysis.status !== "completed") {
      return res.status(400).json({ error: "Can only score completed analyses" })
    }

    // Fetch the workspace to get anomaly_config from metadata
    const { data: workspace, error: wsError } = await supabase
      .from("test_workspaces")
      .select("id, metadata")
      .eq("id", analysis.workspace_id)
      .single()

    if (wsError || !workspace) {
      return res.status(404).json({ error: "Workspace not found" })
    }

    const anomalyConfig = workspace.metadata?.last_mock_generation?.anomaly_config
    if (!anomalyConfig) {
      return res.status(400).json({
        error: "No anomaly config found. Generate mock data first, then re-run analysis.",
      })
    }

    // Compute detection score
    const detectionScore = computeDetectionScore(analysis.analysis_result, anomalyConfig)

    // Build combined scoring payload
    const scoring = buildScoringPayload(detectionScore, quality_scores || null)

    // Update analysis
    const { data: updated, error: updateError } = await supabase
      .from("test_analyses")
      .update({ scoring })
      .eq("id", analysisId)
      .select("id, scoring")
      .single()

    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    await logTestRun(analysis.workspace_id, analysisId, "info", "Auto-scored analysis", scoring.detection)

    res.json({ analysis_id: updated.id, scoring: updated.scoring })
  } catch (err) {
    console.error("autoScoreAnalysis error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Get logs for a workspace
 */
async function getWorkspaceLogs(req, res) {
  try {
    const { id: workspaceId } = req.params
    const { level, limit: queryLimit } = req.query

    let query = supabase
      .from("test_run_logs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(parseInt(queryLimit) || 100)

    if (level) {
      query = query.eq("log_level", level)
    }

    const { data, error } = await query

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({ logs: data || [] })
  } catch (err) {
    console.error("getWorkspaceLogs error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = {
  triggerAnalysis,
  listAnalyses,
  getAnalysis,
  scoreAnalysis,
  autoScoreAnalysis,
  getWorkspaceLogs,
}
