const { supabase } = require("../config/supabase")
const openaiService = require("../services/openaiService")
const tokenService = require("../services/tokenService")

/**
 * Analyze with AI enhancement
 * Combines cost leak detection with AI-generated insights
 * Consumes tokens based on number of integration sources
 */
async function analyzeWithAI(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/ai/analyze`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { analysisData, integrationSources = [], includeAdvancedAI = false } = req.body

    if (!analysisData) {
      return res.status(400).json({ error: "analysisData is required" })
    }

    // Calculate token cost based on integration sources
    const tokenCost = tokenService.calculateTokenCost(integrationSources, includeAdvancedAI)
    const actionType = tokenService.getActionType(integrationSources.length)

    // Check token balance before analysis
    const { hasEnough, available, required } = await tokenService.checkTokenBalance(user.id, tokenCost)

    if (!hasEnough) {
      console.warn(`[${new Date().toISOString()}] Insufficient tokens for user ${user.id}: has ${available}, needs ${required}`)
      return res.status(402).json({
        error: "INSUFFICIENT_TOKENS",
        message: "You don't have enough tokens for this analysis",
        available,
        required,
        upgradeRequired: true,
      })
    }

    // Consume tokens before starting analysis
    const consumeResult = await tokenService.consumeTokens(user.id, tokenCost, actionType, {
      integrationSources,
      description: `AI analysis with ${integrationSources.length || 1} source(s)`,
    })

    if (!consumeResult.success) {
      console.error(`[${new Date().toISOString()}] Failed to consume tokens:`, consumeResult.error)
      return res.status(402).json({
        error: "TOKEN_CONSUMPTION_FAILED",
        message: consumeResult.error,
      })
    }

    try {
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
        tokensUsed: tokenCost,
        tokensRemaining: consumeResult.balanceAfter,
      }

      // Save to database with actual token usage
      if (user.id) {
        const { data: analysisRecord } = await supabase
          .from("deep_research_analyses")
          .insert({
            user_id: user.id,
            analysis_type: actionType,
            integration_sources: integrationSources,
            tokens_used: tokenCost,
            status: "completed",
            result: response.analysis,
          })
          .select()
          .maybeSingle()

        // Update usage history with analysis_id if record was created
        if (analysisRecord) {
          await supabase
            .from("token_usage_history")
            .update({ analysis_id: analysisRecord.id })
            .eq("user_id", user.id)
            .is("analysis_id", null)
            .order("created_at", { ascending: false })
            .limit(1)
        }
      }

      return res.json(response)
    } catch (analysisError) {
      // Refund tokens on analysis failure
      console.error(`[${new Date().toISOString()}] Analysis failed, refunding ${tokenCost} tokens:`, analysisError.message)
      await tokenService.refundTokens(user.id, tokenCost, `Analysis failed: ${analysisError.message}`)
      throw analysisError
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in analyze with AI:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Chat endpoint for questions about analysis
 * Note: Chat doesn't consume tokens - it's unlimited for Deep Research reports
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

    // Check token balance (for display purposes, chat doesn't consume tokens)
    const { available: availableTokens } = await tokenService.checkTokenBalance(user.id, 0)

    // Chat doesn't consume tokens - it's unlimited for Deep Research reports
    const response = await openaiService.chatAboutAnalysis(question, analysisContext)

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
      currency: "USD",
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


