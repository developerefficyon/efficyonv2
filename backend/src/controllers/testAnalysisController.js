/**
 * Test Analysis Controller
 * Triggers analyses on test workspace data and retrieves results.
 * Admin-only — used by the internal testing system.
 */

const { supabase } = require("../config/supabase")
const { runTestAnalysis, logTestRun } = require("../services/testAnalysisRunner")
const { computeDetectionScore, buildScoringPayload } = require("../services/analysisScoringService")
const claudeService = require("../services/claudeService")
const { runImprovementCycle } = require("../services/continuousImprovementService")

/**
 * Trigger an analysis on a workspace
 */
async function triggerAnalysis(req, res) {
  try {
    const { id: workspaceId } = req.params
    const { analysis_type, template_id, integration_labels, upload_ids, options } = req.body

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
      uploadIds: upload_ids || null,
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

    if (!analysis.analysis_result) {
      return res.status(400).json({ error: "Analysis has no results. Re-run the analysis first." })
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

/**
 * AI-evaluate an analysis using Claude
 * POST /api/test/analyses/:analysisId/ai-evaluate
 */
async function aiEvaluateAnalysis(req, res) {
  try {
    const { analysisId } = req.params

    // Fetch full analysis
    const { data: analysis, error: fetchError } = await supabase
      .from("test_analyses")
      .select("*")
      .eq("id", analysisId)
      .single()

    if (fetchError || !analysis) {
      return res.status(404).json({ error: "Analysis not found" })
    }

    if (analysis.status !== "completed") {
      return res.status(400).json({ error: "Can only evaluate completed analyses" })
    }

    // Fetch workspace for anomaly config
    const { data: workspace, error: wsError } = await supabase
      .from("test_workspaces")
      .select("id, metadata")
      .eq("id", analysis.workspace_id)
      .single()

    if (wsError || !workspace) {
      return res.status(404).json({ error: "Workspace not found" })
    }

    const anomalyConfig = workspace.metadata?.last_mock_generation?.anomaly_config || {}

    // Fetch template if one was used
    let template = null
    if (analysis.template_id) {
      const { data: tmpl } = await supabase
        .from("analysis_templates")
        .select("*")
        .eq("id", analysis.template_id)
        .single()
      template = tmpl
    }

    // Run full Claude evaluation
    const evaluation = await claudeService.generateFullEvaluation(
      analysis.analysis_result,
      anomalyConfig,
      analysis.scoring || {},
      template
    )

    if (!evaluation) {
      return res.status(503).json({ error: "Claude API not configured or evaluation failed" })
    }

    // Merge into existing scoring JSONB
    const updatedScoring = {
      ...(analysis.scoring || {}),
      aiEvaluation: evaluation,
    }

    const { error: updateError } = await supabase
      .from("test_analyses")
      .update({ scoring: updatedScoring })
      .eq("id", analysisId)

    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    await logTestRun(analysis.workspace_id, analysisId, "info", "AI evaluation completed", {
      model: evaluation.model,
      qualityScore: evaluation.quality?.overallScore,
      improvementCount: evaluation.improvements?.improvements?.length || 0,
    })

    res.json({ analysis_id: analysisId, aiEvaluation: evaluation })
  } catch (err) {
    console.error("aiEvaluateAnalysis error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Run a full improvement cycle
 * POST /api/test/workspaces/:id/improvement-cycle
 */
async function runImprovementCycleEndpoint(req, res) {
  try {
    const { id: workspaceId } = req.params
    const { integrations, anomaly_config, template_id, auto_apply_tweaks, max_iterations } = req.body

    if (!integrations || integrations.length === 0) {
      return res.status(400).json({ error: "integrations is required" })
    }

    // Verify workspace
    const { data: workspace, error: wsError } = await supabase
      .from("test_workspaces")
      .select("id, scenario_profile")
      .eq("id", workspaceId)
      .single()

    if (wsError || !workspace) {
      return res.status(404).json({ error: "Workspace not found" })
    }

    const report = await runImprovementCycle({
      workspaceId,
      scenarioProfile: workspace.scenario_profile || "startup_60",
      integrations,
      anomalyConfig: anomaly_config || {},
      templateId: template_id || null,
      userId: req.user.id,
      autoApplyTweaks: auto_apply_tweaks || false,
      maxIterations: max_iterations || 1,
    })

    res.status(201).json({ report })
  } catch (err) {
    console.error("runImprovementCycle error:", err)
    res.status(500).json({ error: err.message || "Improvement cycle failed" })
  }
}

/**
 * Generate an Agent Audit Report for a completed analysis.
 * AI classifies each finding as correct, misclassified, hallucinated, or logic_gap.
 */
async function generateAuditReport(req, res) {
  try {
    const { analysisId } = req.params

    // Fetch analysis with full results
    const { data: analysis, error: fetchError } = await supabase
      .from("test_analyses")
      .select("*")
      .eq("id", analysisId)
      .single()

    if (fetchError || !analysis) {
      return res.status(404).json({ error: "Analysis not found" })
    }

    if (analysis.status !== "completed") {
      return res.status(400).json({ error: "Can only audit completed analyses" })
    }

    // Fetch the original uploads to compare against
    const { data: uploads } = await supabase
      .from("test_uploads")
      .select("integration_label, data_type, file_data")
      .eq("workspace_id", analysis.workspace_id)
      .in("integration_label", analysis.integration_labels || [])

    // Fetch workspace for anomaly config (ground truth)
    const { data: workspace } = await supabase
      .from("test_workspaces")
      .select("id, metadata")
      .eq("id", analysis.workspace_id)
      .single()

    const anomalyConfig = workspace?.metadata?.last_mock_generation?.anomaly_config || {}

    // Build audit data payload (limit upload samples to avoid token overflow)
    const uploadSummary = (uploads || []).map((u) => ({
      integration: u.integration_label,
      dataType: u.data_type,
      rowCount: Array.isArray(u.file_data) ? u.file_data.length : 1,
      sampleRows: Array.isArray(u.file_data) ? u.file_data.slice(0, 20) : u.file_data,
    }))

    const systemPrompt = `You are a senior financial data analyst auditing an automated cost-leak analysis engine called Efficyon. Your job is to find errors, hallucinations, and logic gaps in the analysis output.

You will receive:
1. ORIGINAL DATA: Sample rows from the raw uploaded data that was analyzed
2. ANALYSIS OUTPUT: What Efficyon's engine produced (findings, summary)
3. ANOMALY CONFIG: Which anomalies were injected (if this was mock/test data)

For each finding in the analysis output, classify it as:
- CORRECT: Finding is supported by the data
- MISCLASSIFIED: Finding type or category is wrong (e.g., labeled "General/Other" but actually cloud costs)
- HALLUCINATED: Finding has no basis in the data
- LOGIC_GAP: Finding is partially correct but the reasoning or calculation is flawed

Return ONLY valid JSON with this structure:
{
  "totalFindingsAudited": <number>,
  "correct": <number>,
  "misclassified": <number>,
  "hallucinated": <number>,
  "logicGaps": <number>,
  "accuracy": <number 0-1>,
  "issues": [
    {
      "findingTitle": "<title of the finding>",
      "classification": "correct|misclassified|hallucinated|logic_gap",
      "explanation": "<why this classification>",
      "affectedRows": <number or 0>,
      "suggestedCorrection": "<what should be done differently, or null>"
    }
  ],
  "summary": "<2-3 sentence executive summary of audit results>",
  "recommendation": "<actionable recommendation for improving the analysis engine>"
}`

    const userMessage = `ORIGINAL DATA (sample rows per upload):
${JSON.stringify(uploadSummary, null, 2)}

ANALYSIS OUTPUT:
${JSON.stringify(analysis.analysis_result, null, 2)}

ANOMALY CONFIG (injected anomalies, if any):
${JSON.stringify(anomalyConfig, null, 2)}

Audit each finding in the analysis output. Classify it and explain your reasoning.`

    const auditRaw = await claudeService.callClaude(systemPrompt, userMessage, 4000)

    if (!auditRaw) {
      return res.status(503).json({
        error: "AI evaluation unavailable. Ensure OPENROUTER_API_KEY is configured.",
      })
    }

    // callClaude() already parses JSON and returns an object.
    // Use it directly if it's an object; only try string parsing as fallback.
    let auditReport
    if (typeof auditRaw === "object" && auditRaw !== null && !Array.isArray(auditRaw)) {
      auditReport = auditRaw
    } else if (typeof auditRaw === "string") {
      try {
        const cleaned = auditRaw.replace(/```json\n?|```\n?/g, "").trim()
        // Try direct parse first, then extract JSON substring
        try {
          auditReport = JSON.parse(cleaned)
        } catch {
          const start = cleaned.indexOf("{")
          const end = cleaned.lastIndexOf("}")
          if (start !== -1 && end > start) {
            auditReport = JSON.parse(cleaned.substring(start, end + 1))
          } else {
            throw new Error("No JSON object found in response")
          }
        }
      } catch {
        auditReport = {
          totalFindingsAudited: 0,
          correct: 0,
          misclassified: 0,
          hallucinated: 0,
          logicGaps: 0,
          accuracy: 0,
          issues: [],
          summary: typeof auditRaw === "string" ? auditRaw : JSON.stringify(auditRaw),
          recommendation: "Could not parse structured audit. Raw response included in summary.",
          parseError: true,
        }
      }
    } else {
      auditReport = auditRaw
    }

    // Store audit in scoring
    const updatedScoring = {
      ...(analysis.scoring || {}),
      audit: {
        ...auditReport,
        generatedAt: new Date().toISOString(),
      },
    }

    await supabase
      .from("test_analyses")
      .update({ scoring: updatedScoring })
      .eq("id", analysisId)

    await logTestRun(analysis.workspace_id, analysisId, "info", "Agent audit report generated", {
      accuracy: auditReport.accuracy,
      correct: auditReport.correct,
      misclassified: auditReport.misclassified,
      hallucinated: auditReport.hallucinated,
      logicGaps: auditReport.logicGaps,
    })

    res.json({ analysisId, audit: auditReport })
  } catch (err) {
    console.error("generateAuditReport error:", err)
    res.status(500).json({ error: err.message || "Audit failed" })
  }
}

module.exports = {
  triggerAnalysis,
  listAnalyses,
  getAnalysis,
  scoreAnalysis,
  autoScoreAnalysis,
  getWorkspaceLogs,
  aiEvaluateAnalysis,
  runImprovementCycleEndpoint,
  generateAuditReport,
}
