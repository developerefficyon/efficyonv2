const { supabase } = require("../config/supabase")
const openaiService = require("../services/openaiService")

/**
 * Analyze with AI enhancement
 * Combines cost leak detection with AI-generated insights
 */
async function analyzeWithAI(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/ai/analyze`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { analysisData } = req.body

    if (!analysisData) {
      return res.status(400).json({ error: "analysisData is required" })
    }

    // Generate summary with AI
    const summary = await openaiService.generateAnalysisSummary(analysisData)

    // Enhance findings with AI recommendations and savings estimates
    let enhancedFindings = analysisData.findings || []
    if (enhancedFindings.length > 0) {
      enhancedFindings = await openaiService.enhanceFindingsWithAI(enhancedFindings)
    }

    const response = {
      success: true,
      analysis: {
        ...analysisData,
        findings: enhancedFindings,
        aiSummary: summary,
        aiEnhanced: true,
        enhancedAt: new Date().toISOString(),
      },
    }

    // Optionally save to database
    if (user.id) {
      await supabase.from("deep_research_analyses").insert({
        user_id: user.id,
        analysis_type: "ai_enhanced",
        integration_sources: [],
        tokens_used: 0,
        status: "completed",
        result: response.analysis,
      })
    }

    return res.json(response)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in analyze with AI:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Chat endpoint for questions about analysis
 */
async function chatAboutAnalysis(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/ai/chat`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { question, analysisContext } = req.body

    if (!question) {
      return res.status(400).json({ error: "question is required" })
    }

    // Check token balance first
    const { data: tokenBalance } = await supabase
      .from("token_balances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    const availableTokens = tokenBalance ? tokenBalance.total_tokens - tokenBalance.used_tokens : 0

    // Chat doesn't consume tokens - it's unlimited for Deep Research reports
    const response = await openaiService.chatAboutAnalysis(question, analysisContext)

    // Log chat for analytics
    await supabase.from("payments").insert({
      user_id: user.id,
      amount_cents: 0,
      currency: "usd",
      status: "succeeded",
      description: `Chat interaction: ${question.substring(0, 100)}...`,
    }).maybeSingle()

    return res.json({
      success: true,
      response,
      tokensRemaining: availableTokens,
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in chat:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Generate recommendations for a specific finding
 */
async function getRecommendations(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/ai/recommendations`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { finding } = req.body

    if (!finding) {
      return res.status(400).json({ error: "finding is required" })
    }

    const recommendations = await openaiService.generateRecommendations(finding)

    return res.json({
      success: true,
      finding: finding.type || "Unknown",
      recommendations,
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error generating recommendations:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Estimate savings for findings
 */
async function estimateSavings(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/ai/estimate-savings`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { findings } = req.body

    if (!findings || !Array.isArray(findings)) {
      return res.status(400).json({ error: "findings array is required" })
    }

    // Estimate savings for each finding
    const estimatedSavings = await Promise.all(
      findings.map(async (finding) => {
        const savings = await openaiService.estimatePotentialSavings(finding)
        return {
          type: finding.type,
          estimatedAnnualSavings: savings,
        }
      })
    )

    const totalEstimatedSavings = estimatedSavings.reduce(
      (sum, item) => sum + item.estimatedAnnualSavings,
      0
    )

    return res.json({
      success: true,
      estimatedSavings,
      totalEstimatedSavings,
      currency: "SEK",
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error estimating savings:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Get analysis summary
 */
async function getAnalysisSummary(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/ai/summary`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { analysisData } = req.body

    if (!analysisData) {
      return res.status(400).json({ error: "analysisData is required" })
    }

    const summary = await openaiService.generateAnalysisSummary(analysisData)

    return res.json({
      success: true,
      summary,
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error generating summary:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

module.exports = {
  analyzeWithAI,
  chatAboutAnalysis,
  getRecommendations,
  estimateSavings,
  getAnalysisSummary,
}


