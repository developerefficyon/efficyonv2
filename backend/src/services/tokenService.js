const { supabase } = require("../config/supabase")

/**
 * Token costs for different analysis types
 */
const TOKEN_COSTS = {
  single_source_analysis: 1,
  dual_source_analysis: 2,
  triple_source_analysis: 3,
  advanced_ai_deep_dive: 1,
}

/**
 * Check if user has enough tokens for an operation
 * @param {string} userId - User ID
 * @param {number} tokensRequired - Number of tokens needed
 * @returns {Promise<Object>} Balance check result
 */
async function checkTokenBalance(userId, tokensRequired) {
  console.log(`[${new Date().toISOString()}] Checking token balance for user ${userId}, required: ${tokensRequired}`)

  const { data: tokenBalance, error } = await supabase
    .from("token_balances")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    console.error(`[${new Date().toISOString()}] Error checking token balance:`, error.message)
    return { hasEnough: false, available: 0, required: tokensRequired, error: error.message }
  }

  if (!tokenBalance) {
    return { hasEnough: false, available: 0, required: tokensRequired, tokenBalance: null }
  }

  const available = tokenBalance.total_tokens - tokenBalance.used_tokens

  return {
    hasEnough: available >= tokensRequired,
    available,
    required: tokensRequired,
    tokenBalance,
  }
}

/**
 * Consume tokens for an action
 * @param {string} userId - User ID
 * @param {number} tokensToConsume - Number of tokens to consume
 * @param {string} actionType - Type of action consuming tokens
 * @param {Object} metadata - Additional metadata (integrationSources, analysisId, description)
 * @returns {Promise<Object>} Consumption result
 */
async function consumeTokens(userId, tokensToConsume, actionType, metadata = {}) {
  console.log(`[${new Date().toISOString()}] Consuming ${tokensToConsume} tokens for user ${userId}, action: ${actionType}`)

  const { hasEnough, available, tokenBalance } = await checkTokenBalance(userId, tokensToConsume)

  if (!hasEnough) {
    console.warn(`[${new Date().toISOString()}] Insufficient tokens for user ${userId}: has ${available}, needs ${tokensToConsume}`)
    return {
      success: false,
      error: "INSUFFICIENT_TOKENS",
      available,
      required: tokensToConsume,
    }
  }

  const balanceBefore = available
  const balanceAfter = available - tokensToConsume

  // Update token balance
  const { error: updateError } = await supabase
    .from("token_balances")
    .update({
      used_tokens: tokenBalance.used_tokens + tokensToConsume,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tokenBalance.id)

  if (updateError) {
    console.error(`[${new Date().toISOString()}] Error updating token balance:`, updateError.message)
    return { success: false, error: updateError.message }
  }

  // Log to usage history
  const { error: historyError } = await supabase.from("token_usage_history").insert({
    user_id: userId,
    company_id: tokenBalance.company_id,
    tokens_consumed: tokensToConsume,
    action_type: actionType,
    integration_sources: metadata.integrationSources || null,
    analysis_id: metadata.analysisId || null,
    description: metadata.description || null,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
  })

  if (historyError) {
    console.warn(`[${new Date().toISOString()}] Failed to log token usage history:`, historyError.message)
    // Non-critical, continue
  }

  console.log(`[${new Date().toISOString()}] Tokens consumed successfully. Balance: ${balanceBefore} -> ${balanceAfter}`)

  return {
    success: true,
    tokensConsumed: tokensToConsume,
    balanceBefore,
    balanceAfter,
  }
}

/**
 * Refund tokens (e.g., when analysis fails)
 * @param {string} userId - User ID
 * @param {number} tokensToRefund - Number of tokens to refund
 * @param {string} reason - Reason for refund
 * @returns {Promise<Object>} Refund result
 */
async function refundTokens(userId, tokensToRefund, reason) {
  console.log(`[${new Date().toISOString()}] Refunding ${tokensToRefund} tokens for user ${userId}: ${reason}`)

  const { data: tokenBalance, error: fetchError } = await supabase
    .from("token_balances")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (fetchError || !tokenBalance) {
    console.error(`[${new Date().toISOString()}] Error fetching token balance for refund:`, fetchError?.message)
    return { success: false, error: "No token balance found" }
  }

  const newUsedTokens = Math.max(0, tokenBalance.used_tokens - tokensToRefund)
  const balanceBefore = tokenBalance.total_tokens - tokenBalance.used_tokens
  const balanceAfter = tokenBalance.total_tokens - newUsedTokens

  const { error: updateError } = await supabase
    .from("token_balances")
    .update({
      used_tokens: newUsedTokens,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tokenBalance.id)

  if (updateError) {
    console.error(`[${new Date().toISOString()}] Error updating token balance for refund:`, updateError.message)
    return { success: false, error: updateError.message }
  }

  // Log refund to usage history
  await supabase.from("token_usage_history").insert({
    user_id: userId,
    company_id: tokenBalance.company_id,
    tokens_consumed: -tokensToRefund, // Negative for refunds
    action_type: "token_refund",
    description: reason,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
  })

  console.log(`[${new Date().toISOString()}] Tokens refunded successfully. Balance: ${balanceBefore} -> ${balanceAfter}`)

  return {
    success: true,
    tokensRefunded: tokensToRefund,
    balanceBefore,
    balanceAfter,
  }
}

/**
 * Reset tokens on subscription renewal
 * @param {string} userId - User ID
 * @param {number} newTotalTokens - New total tokens from plan
 * @returns {Promise<Object>} Reset result
 */
async function resetTokensForRenewal(userId, newTotalTokens) {
  console.log(`[${new Date().toISOString()}] Resetting tokens for user ${userId} to ${newTotalTokens}`)

  const { data: tokenBalance, error: fetchError } = await supabase
    .from("token_balances")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (fetchError || !tokenBalance) {
    console.error(`[${new Date().toISOString()}] Error fetching token balance for reset:`, fetchError?.message)
    return { success: false, error: "No token balance found" }
  }

  const balanceBefore = tokenBalance.total_tokens - tokenBalance.used_tokens

  const { error: updateError } = await supabase
    .from("token_balances")
    .update({
      total_tokens: newTotalTokens,
      used_tokens: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tokenBalance.id)

  if (updateError) {
    console.error(`[${new Date().toISOString()}] Error resetting token balance:`, updateError.message)
    return { success: false, error: updateError.message }
  }

  // Log reset to usage history
  await supabase.from("token_usage_history").insert({
    user_id: userId,
    company_id: tokenBalance.company_id,
    tokens_consumed: 0,
    action_type: "monthly_reset",
    description: `Monthly token reset: ${newTotalTokens} tokens allocated`,
    balance_before: balanceBefore,
    balance_after: newTotalTokens,
  })

  console.log(`[${new Date().toISOString()}] Tokens reset successfully. New balance: ${newTotalTokens}`)

  return {
    success: true,
    newBalance: newTotalTokens,
    previousBalance: balanceBefore,
  }
}

/**
 * Admin: Adjust customer tokens
 * @param {string} userId - Target user ID
 * @param {number} adjustment - Token adjustment (positive to add, negative to remove)
 * @param {string} reason - Reason for adjustment
 * @param {string} adminId - Admin user ID making the adjustment
 * @returns {Promise<Object>} Adjustment result
 */
async function adminAdjustTokens(userId, adjustment, reason, adminId) {
  console.log(`[${new Date().toISOString()}] Admin ${adminId} adjusting tokens for user ${userId}: ${adjustment > 0 ? "+" : ""}${adjustment}`)

  const { data: tokenBalance, error: fetchError } = await supabase
    .from("token_balances")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (fetchError || !tokenBalance) {
    console.error(`[${new Date().toISOString()}] Error fetching token balance for adjustment:`, fetchError?.message)
    return { success: false, error: "Token balance not found" }
  }

  const balanceBefore = tokenBalance.total_tokens - tokenBalance.used_tokens

  // Adjust total tokens (can be positive or negative)
  const newTotalTokens = Math.max(0, tokenBalance.total_tokens + adjustment)
  const balanceAfter = Math.max(0, newTotalTokens - tokenBalance.used_tokens)

  const { error: updateError } = await supabase
    .from("token_balances")
    .update({
      total_tokens: newTotalTokens,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tokenBalance.id)

  if (updateError) {
    console.error(`[${new Date().toISOString()}] Error adjusting token balance:`, updateError.message)
    return { success: false, error: updateError.message }
  }

  // Log adjustment to usage history
  await supabase.from("token_usage_history").insert({
    user_id: userId,
    company_id: tokenBalance.company_id,
    tokens_consumed: adjustment,
    action_type: "admin_adjustment",
    description: `Admin adjustment by ${adminId}: ${reason || "No reason provided"}`,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
  })

  console.log(`[${new Date().toISOString()}] Admin adjustment complete. Balance: ${balanceBefore} -> ${balanceAfter}`)

  return {
    success: true,
    adjustment,
    balanceBefore,
    balanceAfter,
  }
}

/**
 * Calculate token cost based on integration sources
 * @param {Array} integrationSources - Array of integration source names
 * @param {boolean} includeAdvancedAI - Whether to include advanced AI deep dive
 * @returns {number} Total token cost
 */
function calculateTokenCost(integrationSources = [], includeAdvancedAI = false) {
  const sourceCount = integrationSources.length
  let cost = 0

  if (sourceCount === 0) {
    cost = TOKEN_COSTS.single_source_analysis // Default to single
  } else if (sourceCount === 1) {
    cost = TOKEN_COSTS.single_source_analysis
  } else if (sourceCount === 2) {
    cost = TOKEN_COSTS.dual_source_analysis
  } else {
    cost = TOKEN_COSTS.triple_source_analysis
  }

  if (includeAdvancedAI) {
    cost += TOKEN_COSTS.advanced_ai_deep_dive
  }

  return cost
}

/**
 * Get action type based on source count
 * @param {number} sourceCount - Number of integration sources
 * @returns {string} Action type
 */
function getActionType(sourceCount) {
  if (sourceCount <= 1) return "single_source_analysis"
  if (sourceCount === 2) return "dual_source_analysis"
  return "triple_source_analysis"
}

/**
 * Get user's token usage history
 * @param {string} userId - User ID
 * @param {number} limit - Max records to return
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Object>} Usage history
 */
async function getTokenHistory(userId, limit = 20, offset = 0) {
  const { data: history, error, count } = await supabase
    .from("token_usage_history")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error(`[${new Date().toISOString()}] Error fetching token history:`, error.message)
    return { history: [], total: 0, error: error.message }
  }

  return { history: history || [], total: count || 0 }
}

/**
 * Get all customers' token usage (admin)
 * @returns {Promise<Object>} All customers token usage
 */
async function getAllTokenUsage() {
  const { data: tokenBalances, error } = await supabase
    .from("token_balances")
    .select(`
      *,
      profiles!inner(id, email, full_name),
      companies(name)
    `)
    .order("used_tokens", { ascending: false })

  if (error) {
    console.error(`[${new Date().toISOString()}] Error fetching all token usage:`, error.message)
    return { customers: [], error: error.message }
  }

  const formattedData = (tokenBalances || []).map((tb) => ({
    userId: tb.user_id,
    email: tb.profiles?.email,
    name: tb.profiles?.full_name,
    company: tb.companies?.name,
    planTier: tb.plan_tier,
    totalTokens: tb.total_tokens,
    usedTokens: tb.used_tokens,
    availableTokens: tb.total_tokens - tb.used_tokens,
    usagePercent: tb.total_tokens > 0 ? Math.round((tb.used_tokens / tb.total_tokens) * 100) : 0,
    updatedAt: tb.updated_at,
  }))

  return { customers: formattedData }
}

module.exports = {
  TOKEN_COSTS,
  checkTokenBalance,
  consumeTokens,
  refundTokens,
  resetTokensForRenewal,
  adminAdjustTokens,
  calculateTokenCost,
  getActionType,
  getTokenHistory,
  getAllTokenUsage,
}
