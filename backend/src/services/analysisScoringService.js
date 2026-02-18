/**
 * Analysis Scoring Service
 * Compares analysis findings against known injected anomalies
 * to compute detection metrics (precision, recall, F1).
 */

/**
 * Maps anomaly config keys to the finding types produced by analysis services.
 */
const ANOMALY_FINDING_MAP = [
  {
    configPath: "fortnox.duplicates",
    findingType: "duplicate_payment",
    findingsPath: "fortnox.supplierInvoiceAnalysis.findings",
    label: "Duplicate Invoices",
  },
  {
    configPath: "fortnox.unusualAmounts",
    findingType: "unusual_amount",
    findingsPath: "fortnox.supplierInvoiceAnalysis.findings",
    label: "Unusual Amounts",
  },
  {
    configPath: "fortnox.overdueInvoices",
    findingType: "overdue_invoice",
    findingsPath: "fortnox.supplierInvoiceAnalysis.findings",
    label: "Overdue Invoices",
  },
  {
    configPath: "fortnox.priceDrift",
    findingType: "price_increase",
    findingsPath: "fortnox.supplierInvoiceAnalysis.findings",
    label: "Price Drift",
  },
  {
    configPath: "microsoft365.inactiveUsers",
    findingType: "inactive_license",
    findingsPath: "microsoft365.licenseAnalysis.findings",
    label: "Inactive Users",
  },
  {
    configPath: "microsoft365.orphanedLicenses",
    findingType: "orphaned_license",
    findingsPath: "microsoft365.licenseAnalysis.findings",
    label: "Orphaned Licenses",
  },
  {
    configPath: "microsoft365.overProvisioned",
    findingType: "over_provisioned",
    findingsPath: "microsoft365.licenseAnalysis.findings",
    label: "Over-Provisioned",
  },
  {
    configPath: "hubspot.inactiveUsers",
    findingType: "inactive_seats",
    findingsPath: "hubspot.findings",
    label: "Inactive Users",
  },
  {
    configPath: "hubspot.unassignedRoles",
    findingType: "unassigned_roles",
    findingsPath: "hubspot.findings",
    label: "Unassigned Roles",
  },
]

/**
 * Get a nested value from an object using a dot-path string.
 */
function getNestedValue(obj, path) {
  return path.split(".").reduce(
    (current, key) => (current && current[key] !== undefined ? current[key] : undefined),
    obj
  )
}

function round(value, decimals) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

/**
 * Compute detection metrics for an analysis result against known anomaly config.
 *
 * Scoring is at anomaly-TYPE level: if duplicates were injected and we found
 * 5 duplicate_payment findings, that's 1 true positive (the type was detected).
 *
 * @param {Object} analysisResult - The analysis_result JSONB from test_analyses
 * @param {Object} anomalyConfig  - The anomaly_config used during mock data generation
 * @returns {Object} Detection scoring object
 */
function computeDetectionScore(analysisResult, anomalyConfig) {
  const perIntegration = {}
  const details = []

  let totalExpected = 0
  let totalTruePositives = 0
  let totalFalsePositives = 0
  let totalMissed = 0

  for (const mapping of ANOMALY_FINDING_MAP) {
    const wasInjected = getNestedValue(anomalyConfig, mapping.configPath)
    const findings = getNestedValue(analysisResult, mapping.findingsPath) || []
    const matchingFindings = findings.filter((f) => f.type === mapping.findingType)

    const expected = wasInjected !== false // defaults true if key missing/undefined
    const detectedCount = matchingFindings.length

    const entry = {
      anomalyType: mapping.configPath,
      findingType: mapping.findingType,
      label: mapping.label,
      injected: expected,
      detectedCount,
      status: "true_negative",
    }

    if (expected && detectedCount > 0) {
      entry.status = "true_positive"
      totalTruePositives++
      totalExpected++
    } else if (expected && detectedCount === 0) {
      entry.status = "missed"
      totalMissed++
      totalExpected++
    } else if (!expected && detectedCount > 0) {
      entry.status = "false_positive"
      totalFalsePositives++
    }
    // else: true_negative (not injected, not detected) — default

    details.push(entry)

    // Group by integration
    const integration = mapping.configPath.split(".")[0]
    if (!perIntegration[integration]) {
      perIntegration[integration] = {
        expected: 0,
        truePositives: 0,
        falsePositives: 0,
        missed: 0,
      }
    }
    if (expected) perIntegration[integration].expected++
    if (entry.status === "true_positive") perIntegration[integration].truePositives++
    if (entry.status === "false_positive") perIntegration[integration].falsePositives++
    if (entry.status === "missed") perIntegration[integration].missed++
  }

  // Precision: of anomaly types we flagged, how many were actually injected?
  const totalDetectedTypes = totalTruePositives + totalFalsePositives
  const precision =
    totalDetectedTypes > 0
      ? totalTruePositives / totalDetectedTypes
      : totalExpected === 0
      ? 1
      : 0

  // Recall: of anomaly types injected, how many did we detect?
  const recall = totalExpected > 0 ? totalTruePositives / totalExpected : 1

  // F1: harmonic mean of precision and recall
  const f1 =
    precision + recall > 0 ? (2 * (precision * recall)) / (precision + recall) : 0

  return {
    detection: {
      precision: round(precision, 4),
      recall: round(recall, 4),
      f1Score: round(f1, 4),
      totalExpectedAnomalyTypes: totalExpected,
      totalTruePositives,
      totalFalsePositives,
      totalMissed,
    },
    perIntegration,
    details,
    scoredAt: new Date().toISOString(),
  }
}

/**
 * Build the complete scoring payload for the test_analyses.scoring JSONB field.
 *
 * @param {Object} detectionScore - Output from computeDetectionScore()
 * @param {Object|null} manualScores - { clarity, precision, realism, actionability } each 1-5
 * @returns {Object} Complete scoring object
 */
function buildScoringPayload(detectionScore, manualScores) {
  const scoring = {
    version: 1,
    detection: detectionScore.detection,
    perIntegration: detectionScore.perIntegration,
    details: detectionScore.details,
    scoredAt: detectionScore.scoredAt,
  }

  if (manualScores) {
    scoring.quality = {
      clarity: clamp(manualScores.clarity, 1, 5),
      precision: clamp(manualScores.precision, 1, 5),
      realism: clamp(manualScores.realism, 1, 5),
      actionability: clamp(manualScores.actionability, 1, 5),
      average: round(
        (manualScores.clarity +
          manualScores.precision +
          manualScores.realism +
          manualScores.actionability) /
          4,
        2
      ),
      scoredAt: new Date().toISOString(),
    }
  }

  return scoring
}

module.exports = {
  computeDetectionScore,
  buildScoringPayload,
  ANOMALY_FINDING_MAP,
}
