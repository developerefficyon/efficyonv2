/**
 * Comparative Analysis Service
 * Compares multiple analysis runs side-by-side and tracks metric trends
 * across template versions.
 */

const { supabase } = require("../config/supabase")

/**
 * Extract key metrics from an analysis for comparison
 */
function extractMetrics(analysis) {
  const scoring = analysis.scoring || {}
  const result = analysis.analysis_result || {}
  const summary = result.overallSummary || {}

  return {
    analysisId: analysis.id,
    analysisType: analysis.analysis_type,
    templateId: analysis.template_id,
    templateVersion: analysis.template_version,
    createdAt: analysis.created_at,
    durationMs: analysis.duration_ms,
    status: analysis.status,

    // Detection metrics
    precision: scoring.detection?.precision ?? null,
    recall: scoring.detection?.recall ?? null,
    f1Score: scoring.detection?.f1Score ?? null,
    totalTruePositives: scoring.detection?.totalTruePositives ?? 0,
    totalFalsePositives: scoring.detection?.totalFalsePositives ?? 0,
    totalMissed: scoring.detection?.totalMissed ?? 0,

    // Quality metrics
    qualityAverage: scoring.quality?.average ?? null,
    clarity: scoring.quality?.clarity ?? null,
    qualityPrecision: scoring.quality?.precision ?? null,
    realism: scoring.quality?.realism ?? null,
    actionability: scoring.quality?.actionability ?? null,

    // AI evaluation
    aiQualityScore: scoring.aiEvaluation?.quality?.overallScore ?? null,

    // Finding metrics
    totalFindings: summary.totalFindings ?? 0,
    totalPotentialSavings: summary.totalPotentialSavings ?? 0,
    highSeverity: summary.highSeverity ?? 0,
    mediumSeverity: summary.mediumSeverity ?? 0,
    lowSeverity: summary.lowSeverity ?? 0,

    // Per-anomaly details
    detectionDetails: scoring.details || [],
  }
}

/**
 * Compute delta between two metric values
 */
function computeDelta(current, previous) {
  if (current === null || previous === null) return null
  const delta = current - previous
  const pctChange = previous !== 0 ? (delta / previous) * 100 : delta !== 0 ? 100 : 0
  return {
    value: Math.round(delta * 10000) / 10000,
    pctChange: Math.round(pctChange * 100) / 100,
    direction: delta > 0 ? "improved" : delta < 0 ? "regressed" : "unchanged",
  }
}

/**
 * Compare two or more analyses side-by-side
 * @param {Array} analyses - Array of full test_analyses rows
 * @returns {Object} Comparison report
 */
function compareAnalyses(analyses) {
  if (!analyses || analyses.length < 2) {
    throw new Error("At least 2 analyses required for comparison")
  }

  // Sort by created_at ascending (oldest first)
  const sorted = [...analyses].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const metrics = sorted.map(extractMetrics)

  // Build pairwise deltas (each vs previous)
  const deltas = []
  for (let i = 1; i < metrics.length; i++) {
    const current = metrics[i]
    const previous = metrics[i - 1]
    deltas.push({
      from: previous.analysisId,
      to: current.analysisId,
      precision: computeDelta(current.precision, previous.precision),
      recall: computeDelta(current.recall, previous.recall),
      f1Score: computeDelta(current.f1Score, previous.f1Score),
      totalFindings: computeDelta(current.totalFindings, previous.totalFindings),
      totalPotentialSavings: computeDelta(current.totalPotentialSavings, previous.totalPotentialSavings),
      qualityAverage: computeDelta(current.qualityAverage, previous.qualityAverage),
      durationMs: computeDelta(current.durationMs, previous.durationMs),
    })
  }

  // Build per-anomaly detection matrix
  const allAnomalyTypes = new Set()
  metrics.forEach((m) => {
    m.detectionDetails.forEach((d) => allAnomalyTypes.add(d.anomalyType))
  })

  const detectionMatrix = Array.from(allAnomalyTypes).map((anomalyType) => {
    const row = { anomalyType }
    metrics.forEach((m) => {
      const detail = m.detectionDetails.find((d) => d.anomalyType === anomalyType)
      row[m.analysisId] = detail ? detail.status : "n/a"
    })
    return row
  })

  // Overall assessment
  const first = metrics[0]
  const last = metrics[metrics.length - 1]
  const overallDelta = {
    precision: computeDelta(last.precision, first.precision),
    recall: computeDelta(last.recall, first.recall),
    f1Score: computeDelta(last.f1Score, first.f1Score),
  }

  return {
    analysisCount: metrics.length,
    metrics,
    deltas,
    detectionMatrix,
    overallDelta,
    bestF1: metrics.reduce((best, m) => (m.f1Score > (best.f1Score || 0) ? m : best), metrics[0]),
    comparedAt: new Date().toISOString(),
  }
}

/**
 * Track trends across template versions
 * @param {string} templateSlug - Template slug to track
 * @returns {Object} Trend data (metrics over versions)
 */
async function getTemplateTrends(templateSlug) {
  // Get all template versions for this slug
  const { data: templates, error: tmplError } = await supabase
    .from("analysis_templates")
    .select("id, version")
    .eq("slug", templateSlug)
    .order("version", { ascending: true })

  if (tmplError || !templates || templates.length === 0) {
    return { slug: templateSlug, versions: [], message: "No templates found" }
  }

  const templateIds = templates.map((t) => t.id)

  // Get all analyses that used these templates
  const { data: analyses, error: analysisError } = await supabase
    .from("test_analyses")
    .select("id, template_id, template_version, status, scoring, analysis_result, duration_ms, created_at")
    .in("template_id", templateIds)
    .eq("status", "completed")
    .order("created_at", { ascending: true })

  if (analysisError || !analyses) {
    return { slug: templateSlug, versions: [], message: "Failed to fetch analyses" }
  }

  // Group by template version and compute averages
  const versionMap = {}
  for (const analysis of analyses) {
    const version = analysis.template_version || 1
    if (!versionMap[version]) {
      versionMap[version] = { analyses: [], metrics: {} }
    }
    versionMap[version].analyses.push(analysis)
  }

  const versions = Object.entries(versionMap)
    .map(([version, data]) => {
      const metricsArr = data.analyses.map(extractMetrics)
      const avg = (field) => {
        const vals = metricsArr.map((m) => m[field]).filter((v) => v !== null)
        return vals.length > 0 ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10000) / 10000 : null
      }

      return {
        version: parseInt(version),
        runCount: metricsArr.length,
        avgPrecision: avg("precision"),
        avgRecall: avg("recall"),
        avgF1Score: avg("f1Score"),
        avgQualityScore: avg("qualityAverage"),
        avgFindings: avg("totalFindings"),
        avgSavings: avg("totalPotentialSavings"),
        avgDurationMs: avg("durationMs"),
      }
    })
    .sort((a, b) => a.version - b.version)

  return {
    slug: templateSlug,
    versions,
    totalRuns: analyses.length,
    computedAt: new Date().toISOString(),
  }
}

/**
 * Generate an improvement report from comparison data
 * @param {Object} comparison - Output from compareAnalyses
 * @param {Object|null} aiEvaluation - Claude evaluation data
 * @returns {Object} Improvement report
 */
function generateImprovementReport(comparison, aiEvaluation) {
  const { overallDelta, detectionMatrix, metrics } = comparison
  const report = {
    metricChanges: [],
    detectionChanges: [],
    recommendations: [],
  }

  // Identify metric changes
  const metricFields = ["precision", "recall", "f1Score"]
  for (const field of metricFields) {
    const delta = overallDelta[field]
    if (delta && delta.direction !== "unchanged") {
      report.metricChanges.push({
        metric: field,
        direction: delta.direction,
        change: delta.value,
        pctChange: delta.pctChange,
      })
    }
  }

  // Identify anomaly types that gained/lost detection
  if (metrics.length >= 2) {
    const first = metrics[0]
    const last = metrics[metrics.length - 1]

    for (const row of detectionMatrix) {
      const firstStatus = row[first.analysisId]
      const lastStatus = row[last.analysisId]
      if (firstStatus !== lastStatus) {
        report.detectionChanges.push({
          anomalyType: row.anomalyType,
          before: firstStatus,
          after: lastStatus,
          improved: lastStatus === "true_positive" && firstStatus !== "true_positive",
        })
      }
    }
  }

  // Add AI recommendations if available
  if (aiEvaluation?.improvements?.improvements) {
    report.recommendations = aiEvaluation.improvements.improvements
  }

  return report
}

module.exports = {
  compareAnalyses,
  getTemplateTrends,
  generateImprovementReport,
  extractMetrics,
}
