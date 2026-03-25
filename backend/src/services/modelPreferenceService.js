/**
 * Model Preference Service
 * Resolves the AI model preference for a user, following team hierarchy.
 * Company owners set the model; team members inherit the company setting.
 */

const { supabase } = require("../config/supabase")

const MODEL_CONFIG = {
  haiku: {
    modelId: "anthropic/claude-haiku-4.5",
    multiplier: 1,
    label: "Claude Haiku",
  },
  sonnet: {
    modelId: "anthropic/claude-sonnet-4.5",
    multiplier: 2,
    label: "Claude Sonnet",
  },
  opus: {
    modelId: "anthropic/claude-opus-4.6",
    multiplier: 3,
    label: "Claude Opus",
  },
}

const VALID_MODELS = Object.keys(MODEL_CONFIG)
const DEFAULT_MODEL = "haiku"

/**
 * Get the effective AI model preference for a user.
 * Team members inherit the company's setting; solo users use their profile setting.
 * @param {string} userId
 * @returns {Promise<{ model: string, modelId: string, multiplier: number, label: string }>}
 */
async function getModelPreference(userId) {
  // 1. Get user profile with company_id
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id, ai_model")
    .eq("id", userId)
    .single()

  if (profileError || !profile) {
    console.warn(`[ModelPref] Could not fetch profile for ${userId}, using default`)
    return { model: DEFAULT_MODEL, ...MODEL_CONFIG[DEFAULT_MODEL] }
  }

  // 2. If user has a company, use the company's setting
  if (profile.company_id) {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("ai_model")
      .eq("id", profile.company_id)
      .single()

    if (!companyError && company && company.ai_model && MODEL_CONFIG[company.ai_model]) {
      return { model: company.ai_model, ...MODEL_CONFIG[company.ai_model] }
    }
  }

  // 3. Solo user — use profile setting
  if (profile.ai_model && MODEL_CONFIG[profile.ai_model]) {
    return { model: profile.ai_model, ...MODEL_CONFIG[profile.ai_model] }
  }

  // 4. Fallback to default
  return { model: DEFAULT_MODEL, ...MODEL_CONFIG[DEFAULT_MODEL] }
}

/**
 * Set the AI model preference.
 * Updates the company record (for team users) or profile (for solo users).
 * @param {string} userId - The owner's user ID
 * @param {string} modelKey - 'haiku', 'sonnet', or 'opus'
 * @returns {Promise<{ success: boolean, model?: string, error?: string }>}
 */
async function setModelPreference(userId, modelKey) {
  if (!VALID_MODELS.includes(modelKey)) {
    return { success: false, error: `Invalid model. Must be one of: ${VALID_MODELS.join(", ")}` }
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .single()

  if (profileError || !profile) {
    return { success: false, error: "User profile not found" }
  }

  // Update company setting if user has a company
  if (profile.company_id) {
    const { error } = await supabase
      .from("companies")
      .update({ ai_model: modelKey })
      .eq("id", profile.company_id)

    if (error) {
      console.error("[ModelPref] Error updating company model:", error.message)
      return { success: false, error: error.message }
    }
  } else {
    // Solo user — update profile
    const { error } = await supabase
      .from("profiles")
      .update({ ai_model: modelKey })
      .eq("id", userId)

    if (error) {
      console.error("[ModelPref] Error updating profile model:", error.message)
      return { success: false, error: error.message }
    }
  }

  return { success: true, model: modelKey, ...MODEL_CONFIG[modelKey] }
}

module.exports = {
  MODEL_CONFIG,
  VALID_MODELS,
  getModelPreference,
  setModelPreference,
}
