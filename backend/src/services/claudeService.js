/**
 * Claude AI Service for Testing System
 * Uses OpenRouter to evaluate analysis quality, suggest improvements,
 * and diagnose detection gaps. Internal testing use only.
 */

const axios = require("axios")

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "anthropic/claude-sonnet-4-5"
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

// ─── Helper ─────────────────────────────────────────────────────────

async function callClaude(systemPrompt, userMessage, maxTokens = 2000) {
  if (!OPENROUTER_API_KEY) {
    console.warn("[Claude] OpenRouter API key not configured, skipping evaluation")
    return null
  }

  try {
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://efficyon.com",
        },
      }
    )

    const text = response.data.choices[0].message.content

    // Log token usage
    console.log(
      `[Claude] Tokens — input: ${response.data.usage.prompt_tokens}, output: ${response.data.usage.completion_tokens}`
    )

    // Parse JSON response (strip markdown fences if present)
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim()
    return JSON.parse(cleaned)
  } catch (err) {
    console.error("[Claude] API call failed:", err.message)
    return null
  }
}

// ─── 1. Evaluate Analysis Quality ───────────────────────────────────

/**
 * Evaluate analysis output quality using Claude.
 * Returns scores for clarity, precision, realism, actionability (each 1-5) + rationale.
 *
 * @param {Object} analysisResult - The analysis_result JSONB from test_analyses
 * @param {Object} anomalyConfig - The anomaly_config used during mock data generation
 * @returns {Object|null} Quality evaluation or null if key not configured
 */
async function evaluateAnalysisQuality(analysisResult, anomalyConfig) {
  const systemPrompt = `You are an expert evaluator for a SaaS cost optimization platform called Efficyon.
Your job is to evaluate how well an automated analysis engine detects cost leaks, license waste, and inefficiencies.

Score each dimension from 1-5:
- **Clarity** (1-5): Are findings clearly described? Would a CFO understand them without technical knowledge?
- **Precision** (1-5): Are the findings specific and accurate? Do they cite exact data points (amounts, users, dates)?
- **Realism** (1-5): Are savings estimates realistic and conservative? Or are they inflated/implausible?
- **Actionability** (1-5): Can a company immediately act on the recommendations? Are next steps concrete?

Respond with valid JSON only, no markdown fences. Use this exact structure:
{
  "clarity": { "score": <1-5>, "rationale": "<why>" },
  "precision": { "score": <1-5>, "rationale": "<why>" },
  "realism": { "score": <1-5>, "rationale": "<why>" },
  "actionability": { "score": <1-5>, "rationale": "<why>" },
  "overallScore": <average>,
  "topStrengths": ["<strength1>", "<strength2>"],
  "topWeaknesses": ["<weakness1>", "<weakness2>"]
}`

  const userMessage = `Here is the analysis output to evaluate:

ANALYSIS RESULT:
${JSON.stringify(analysisResult, null, 2).slice(0, 8000)}

ANOMALY CONFIGURATION (what was injected into the test data):
${JSON.stringify(anomalyConfig, null, 2)}

Evaluate the quality of this analysis output.`

  return await callClaude(systemPrompt, userMessage, 1500)
}

// ─── 2. Suggest Improvements ────────────────────────────────────────

/**
 * Suggest template/prompt improvements based on scoring results.
 *
 * @param {Object} scoringData - The scoring JSONB (detection metrics + quality)
 * @param {Object} analysisResult - The analysis_result JSONB
 * @param {Object|null} template - The analysis_templates row used (if any)
 * @returns {Object|null} Array of improvement suggestions or null
 */
async function suggestImprovements(scoringData, analysisResult, template) {
  const systemPrompt = `You are an AI optimization expert for Efficyon, a SaaS cost analysis platform.
You analyze detection performance metrics and suggest concrete improvements to analysis templates and logic.

Focus on:
- Missed anomaly types and how to catch them
- False positives and how to reduce them
- Threshold adjustments (inactivity days, price drift %, duplicate windows)
- Prompt/template wording improvements
- New detection rules that should be added

Respond with valid JSON only, no markdown fences. Use this exact structure:
{
  "improvements": [
    {
      "category": "<prompt|threshold|detection_rule|data_generation|scoring_map>",
      "priority": "<high|medium|low>",
      "description": "<what to change>",
      "suggestedChange": "<specific code/config/prompt change>",
      "expectedImpact": "<what metric this should improve>"
    }
  ],
  "summary": "<1-2 sentence overview>"
}`

  const userMessage = `Here are the current scoring metrics and analysis results:

DETECTION METRICS:
${JSON.stringify(scoringData?.detection || {}, null, 2)}

PER-ANOMALY DETAILS:
${JSON.stringify(scoringData?.details || [], null, 2)}

ANALYSIS RESULT SUMMARY:
${JSON.stringify(analysisResult?.overallSummary || {}, null, 2)}

${template ? `TEMPLATE USED:\nName: ${template.name}\nAI Prompt Logic: ${template.ai_prompt_logic}\nParameters: ${JSON.stringify(template.parameters)}` : "No template used (default analysis)."}

Suggest specific, actionable improvements to increase detection precision and recall.`

  return await callClaude(systemPrompt, userMessage, 2000)
}

// ─── 3. Diagnose Missed Anomalies ──────────────────────────────────

/**
 * Diagnose why specific anomaly types were missed.
 *
 * @param {Array} scoringDetails - The details array from scoring (per-anomaly status)
 * @param {Object} analysisResult - The full analysis_result JSONB
 * @param {Object} anomalyConfig - The anomaly config used
 * @returns {Object|null} Per-anomaly diagnosis or null
 */
async function diagnoseMissedAnomalies(scoringDetails, analysisResult, anomalyConfig) {
  const missed = (scoringDetails || []).filter((d) => d.status === "missed")
  if (missed.length === 0) {
    return { diagnoses: [], message: "No missed anomalies to diagnose." }
  }

  const systemPrompt = `You are a debugging expert for Efficyon's analysis engine.
When the analysis engine fails to detect injected anomalies, you diagnose the root cause.

Common reasons for missed detections:
- Threshold too high (e.g., inactivity threshold is 30 days but anomaly was set to 29 days)
- Data shape mismatch (the analysis looks for field X but the data uses field Y)
- Finding type label differs from what the scoring system expects
- Anomaly was too subtle (e.g., duplicate with slightly different amount)
- The analysis category doesn't cover this anomaly type

Respond with valid JSON only, no markdown fences. Use this exact structure:
{
  "diagnoses": [
    {
      "anomalyType": "<config path like fortnox.duplicates>",
      "findingType": "<expected finding type>",
      "label": "<human label>",
      "likelyReason": "<most probable cause>",
      "confidence": "<high|medium|low>",
      "suggestedFix": "<how to fix detection>"
    }
  ]
}`

  const userMessage = `The following anomaly types were INJECTED but NOT DETECTED by the analysis:

MISSED ANOMALIES:
${JSON.stringify(missed, null, 2)}

ANOMALY CONFIG USED:
${JSON.stringify(anomalyConfig, null, 2)}

ANALYSIS RESULT (relevant sections):
${JSON.stringify(
    {
      fortnoxFindings: analysisResult?.fortnox?.supplierInvoiceAnalysis?.findings?.slice(0, 10),
      m365Findings: analysisResult?.microsoft365?.licenseAnalysis?.findings?.slice(0, 10),
      hubspotFindings: analysisResult?.hubspot?.findings?.slice(0, 10),
    },
    null,
    2
  )}

Diagnose why each missed anomaly was not detected.`

  return await callClaude(systemPrompt, userMessage, 1500)
}

// ─── 4. Full Evaluation Report ──────────────────────────────────────

/**
 * Generate a complete evaluation combining quality, improvements, and missed diagnosis.
 *
 * @param {Object} analysisResult - The analysis_result JSONB
 * @param {Object} anomalyConfig - The anomaly_config used
 * @param {Object} scoringData - The scoring JSONB
 * @param {Object|null} template - The template used
 * @returns {Object|null} Complete evaluation report or null
 */
async function generateFullEvaluation(analysisResult, anomalyConfig, scoringData, template) {
  if (!OPENROUTER_API_KEY) {
    console.warn("[Claude] OpenRouter API key not configured, skipping full evaluation")
    return null
  }

  const [quality, improvements, missed] = await Promise.all([
    evaluateAnalysisQuality(analysisResult, anomalyConfig),
    suggestImprovements(scoringData, analysisResult, template),
    diagnoseMissedAnomalies(scoringData?.details, analysisResult, anomalyConfig),
  ])

  return {
    quality,
    improvements,
    missedDiagnosis: missed,
    evaluatedAt: new Date().toISOString(),
    model: CLAUDE_MODEL,
  }
}

module.exports = {
  callClaude,
  evaluateAnalysisQuality,
  suggestImprovements,
  diagnoseMissedAnomalies,
  generateFullEvaluation,
}
