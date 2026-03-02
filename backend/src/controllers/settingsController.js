/**
 * Settings Controller
 * Handles user/company settings like AI model preference.
 */

const { getModelPreference, setModelPreference, MODEL_CONFIG, VALID_MODELS } = require("../services/modelPreferenceService")

/**
 * GET /api/settings/ai-model
 * Returns the current AI model preference for the requesting user.
 */
async function getAiModel(req, res) {
  try {
    const pref = await getModelPreference(req.user.id)
    res.json({
      model: pref.model,
      modelId: pref.modelId,
      multiplier: pref.multiplier,
      label: pref.label,
      availableModels: VALID_MODELS.map((key) => ({
        key,
        ...MODEL_CONFIG[key],
      })),
    })
  } catch (err) {
    console.error("getAiModel error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * PUT /api/settings/ai-model
 * Sets the AI model preference. Owner-only.
 * Body: { model: "haiku" | "sonnet" | "opus" }
 */
async function setAiModel(req, res) {
  try {
    const { model } = req.body

    if (!model) {
      return res.status(400).json({ error: "Missing required field: model" })
    }

    const result = await setModelPreference(req.user.id, model)

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    res.json({
      model: result.model,
      modelId: result.modelId,
      multiplier: result.multiplier,
      label: result.label,
    })
  } catch (err) {
    console.error("setAiModel error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = { getAiModel, setAiModel }
