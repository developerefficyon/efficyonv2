/**
 * Recommendation Controller
 * Provider-agnostic recommendation management: apply, dismiss, snooze, track action steps.
 * Shared by all integration providers (Fortnox, QuickBooks, HubSpot, Microsoft 365, Shopify).
 */

const { supabase } = require("../config/supabase")

const log = (level, endpoint, message, data = null) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${endpoint} - ${message}`
  if (data) {
    console[level](logMessage, data)
  } else {
    console[level](logMessage)
  }
}

// Get all recommendations for the current user's company
async function getRecommendations(req, res) {
  const endpoint = "GET /recommendations"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return res.status(400).json({ error: "No company associated with this user" })
    }

    const provider = req.query.provider || "Unknown"
    const status = req.query.status // optional filter: pending, applied, dismissed, snoozed

    let query = supabase
      .from("applied_recommendations")
      .select("*")
      .eq("company_id", profile.company_id)
      .eq("provider", provider)
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    const { data: recommendations, error } = await query

    if (error) {
      log("error", endpoint, `Failed to fetch recommendations: ${error.message}`)
      return res.status(500).json({ error: "Failed to fetch recommendations" })
    }

    // Calculate summary stats
    const summary = {
      total: recommendations.length,
      pending: recommendations.filter(r => r.status === "pending").length,
      applied: recommendations.filter(r => r.status === "applied").length,
      dismissed: recommendations.filter(r => r.status === "dismissed").length,
      snoozed: recommendations.filter(r => r.status === "snoozed").length,
      totalSavingsRealized: recommendations
        .filter(r => r.status === "applied")
        .reduce((sum, r) => sum + parseFloat(r.potential_savings || 0), 0),
      totalSavingsPending: recommendations
        .filter(r => r.status === "pending")
        .reduce((sum, r) => sum + parseFloat(r.potential_savings || 0), 0),
    }

    return res.json({ recommendations, summary })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    return res.status(500).json({ error: error.message })
  }
}

// Apply, dismiss, or snooze a recommendation
async function applyRecommendation(req, res) {
  const endpoint = "POST /recommendations/apply"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const {
    findingHash,
    findingType,
    findingTitle,
    findingDescription,
    potentialSavings,
    status, // "applied", "dismissed", "snoozed", "pending"
    actionSteps,
    notes,
    snoozedUntil,
    provider,
    analysisId,
    integrationId,
  } = req.body

  if (!findingHash || !status) {
    return res.status(400).json({ error: "findingHash and status are required" })
  }

  const validStatuses = ["pending", "applied", "dismissed", "snoozed"]
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` })
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return res.status(400).json({ error: "No company associated with this user" })
    }

    // Upsert: update if exists (same company + finding hash), insert if new
    const upsertData = {
      company_id: profile.company_id,
      integration_id: integrationId || null,
      provider: provider || "Unknown",
      analysis_id: analysisId || null,
      finding_type: findingType || "unknown",
      finding_hash: findingHash,
      finding_title: findingTitle || null,
      finding_description: findingDescription || null,
      potential_savings: potentialSavings || 0,
      status,
      action_steps: actionSteps || [],
      notes: notes || null,
      applied_at: status === "applied" ? new Date().toISOString() : null,
      snoozed_until: status === "snoozed" && snoozedUntil ? snoozedUntil : null,
      updated_at: new Date().toISOString(),
    }

    const { data: recommendation, error } = await supabase
      .from("applied_recommendations")
      .upsert(upsertData, {
        onConflict: "company_id,finding_hash",
      })
      .select()
      .single()

    if (error) {
      log("error", endpoint, `Failed to upsert recommendation: ${error.message}`)
      return res.status(500).json({ error: "Failed to save recommendation" })
    }

    log("log", endpoint, `Recommendation ${status}: ${findingHash}`)
    return res.json({ success: true, recommendation })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    return res.status(500).json({ error: error.message })
  }
}

// Update completed steps for a recommendation
async function updateRecommendationSteps(req, res) {
  const endpoint = "PATCH /recommendations/steps"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { recommendationId, completedSteps, notes } = req.body

  if (!recommendationId) {
    return res.status(400).json({ error: "recommendationId is required" })
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return res.status(400).json({ error: "No company associated with this user" })
    }

    const updateData = {
      completed_steps: completedSteps || [],
      updated_at: new Date().toISOString(),
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const { data: recommendation, error } = await supabase
      .from("applied_recommendations")
      .update(updateData)
      .eq("id", recommendationId)
      .eq("company_id", profile.company_id)
      .select()
      .single()

    if (error) {
      log("error", endpoint, `Failed to update steps: ${error.message}`)
      return res.status(500).json({ error: "Failed to update recommendation steps" })
    }

    return res.json({ success: true, recommendation })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    return res.status(500).json({ error: error.message })
  }
}

// Delete a recommendation
async function deleteRecommendation(req, res) {
  const endpoint = "DELETE /recommendations"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { id } = req.params

  if (!id) {
    return res.status(400).json({ error: "Recommendation ID is required" })
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return res.status(400).json({ error: "No company associated with this user" })
    }

    const { error } = await supabase
      .from("applied_recommendations")
      .delete()
      .eq("id", id)
      .eq("company_id", profile.company_id)

    if (error) {
      log("error", endpoint, `Failed to delete recommendation: ${error.message}`)
      return res.status(500).json({ error: "Failed to delete recommendation" })
    }

    return res.json({ success: true })
  } catch (error) {
    log("error", endpoint, `Error: ${error.message}`)
    return res.status(500).json({ error: error.message })
  }
}

module.exports = {
  getRecommendations,
  applyRecommendation,
  updateRecommendationSteps,
  deleteRecommendation,
}
