/**
 * Profile Controller
 * Handles user profile operations: CRUD, email verification, onboarding
 */

const { supabase } = require("../config/supabase")

// Helper for logging
const log = (level, endpoint, message, data = null) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${endpoint} - ${message}`
  if (data) {
    console[level](logMessage, data)
  } else {
    console[level](logMessage)
  }
}

function getProfile(req, res) {
  const user = req.user
  res.json({
    id: user.id,
    email: user.email,
    role: user.user_metadata?.role || "user",
    name: user.user_metadata?.name || "",
  })
}

async function createProfile(req, res) {
  const endpoint = "POST /api/profiles/create"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    log("warn", endpoint, "Unauthorized: No user in request")
    return res.status(401).json({ error: "Unauthorized" })
  }

  log("log", endpoint, `Creating profile for user: ${user.id} (${user.email})`)

  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle()

  if (existingProfile) {
    log("log", endpoint, `Profile already exists for user: ${user.id}`)
    return res.json({ profile: existingProfile, message: "Profile already exists" })
  }

  // Get user metadata - validate role
  let role = user.user_metadata?.role || "customer"
  if (!["user", "admin", "customer"].includes(role)) {
    role = "customer"
  }
  const fullName = user.user_metadata?.name || null

  log("log", endpoint, "Profile data:", { id: user.id, email: user.email, full_name: fullName, role })

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      role: role,
    })
    .select()
    .maybeSingle()

  if (profileError) {
    log("error", endpoint, "Error creating profile:", profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  log("log", endpoint, `Profile created successfully for user: ${user.id}`)
  return res.json({ profile, message: "Profile created successfully" })
}

async function createProfilePublic(req, res) {
  const endpoint = "POST /api/profiles/create-public"
  log("log", endpoint, "Request received")
  log("log", endpoint, "Request body:", req.body)

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const { userId, email, userMetadata, emailConfirmed } = req.body || {}

  if (!userId) {
    log("warn", endpoint, "Bad request: userId is required")
    return res.status(400).json({ error: "userId is required" })
  }

  let u = null
  if (email && userMetadata !== undefined) {
    log("log", endpoint, `Using provided user data for: ${email}`)
    u = {
      id: userId,
      email: email,
      user_metadata: userMetadata || {},
      email_confirmed_at: emailConfirmed ? new Date().toISOString() : null,
    }
  } else {
    log("log", endpoint, `Fetching user from Supabase: ${userId}`)
    const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError || !userResult?.user) {
      log("error", endpoint, "Error fetching user:", userError?.message || "User not found")
      return res.status(404).json({ error: "Auth user not found" })
    }

    u = userResult.user
    log("log", endpoint, `User found: ${u.email} (${u.id})`)
  }

  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", u.id)
    .maybeSingle()

  if (existingProfile) {
    log("log", endpoint, `Profile already exists for user: ${u.id}`)
    return res.json({ profile: existingProfile, message: "Profile already exists" })
  }

  // Validate role
  let role = u.user_metadata?.role || "customer"
  if (!["user", "admin", "customer"].includes(role)) {
    role = "customer"
  }
  const fullName = u.user_metadata?.name || null

  log("log", endpoint, "Creating profile with data:", { id: u.id, email: u.email, full_name: fullName, role })

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: u.id,
      email: u.email,
      full_name: fullName,
      role: role,
    })
    .select()
    .maybeSingle()

  if (profileError) {
    log("error", endpoint, "Error creating profile:", profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  log("log", endpoint, `Profile created successfully for user: ${u.id}`)
  return res.json({ profile, message: "Profile created successfully" })
}

async function updateProfilePublic(req, res) {
  const endpoint = "POST /api/profiles/update-public"
  log("log", endpoint, "Request received")
  log("log", endpoint, "Request body:", req.body)

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const { userId, full_name, role } = req.body || {}

  if (!userId) {
    log("warn", endpoint, "Bad request: userId is required")
    return res.status(400).json({ error: "userId is required" })
  }

  const updateData = {}
  if (full_name !== undefined) updateData.full_name = full_name || null
  if (role !== undefined) updateData.role = role

  if (Object.keys(updateData).length === 0) {
    log("warn", endpoint, "Bad request: no fields to update")
    return res.status(400).json({ error: "At least one field (full_name or role) must be provided" })
  }

  log("log", endpoint, `Updating profile for user: ${userId}`, updateData)

  const { data: profile, error: updateError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId)
    .select()
    .maybeSingle()

  if (updateError) {
    log("error", endpoint, "Error updating profile:", updateError.message)
    return res.status(500).json({ error: updateError.message })
  }

  if (!profile) {
    log("warn", endpoint, `Profile not found for user: ${userId}`)
    return res.status(404).json({ error: "Profile not found. It should be created automatically on signup." })
  }

  log("log", endpoint, `Profile updated successfully for user: ${userId}`)
  return res.json({ profile, message: "Profile updated successfully" })
}

async function updateEmailVerified(req, res) {
  const endpoint = "POST /api/profiles/update-email-verified"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    log("warn", endpoint, "Unauthorized: No user in request")
    return res.status(401).json({ error: "Unauthorized" })
  }

  log("log", endpoint, `Updating email_verified for user: ${user.id}`)

  const emailVerified = !!user.email_confirmed_at
  if (!emailVerified) {
    log("warn", endpoint, `Email not confirmed for user: ${user.id}`)
    return res.status(400).json({ error: "Email is not confirmed" })
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", user.id)
    .maybeSingle()

  if (!existingProfile) {
    log("warn", endpoint, `Profile not found for user: ${user.id}`)
    return res.status(404).json({ error: "Profile not found" })
  }

  const updateData = {}
  if (user.email && user.email !== existingProfile.email) {
    updateData.email = user.email
  }

  if (Object.keys(updateData).length > 0) {
    const { data: profile, error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .maybeSingle()

    if (updateError) {
      log("error", endpoint, "Error updating profile:", updateError.message)
      return res.status(500).json({ error: updateError.message })
    }

    log("log", endpoint, `Profile email synced for user: ${user.id}`)
    return res.json({ profile, message: "Email verified - profile updated" })
  }

  log("log", endpoint, `Email verified for user: ${user.id}`)
  return res.json({ profile: existingProfile, message: "Email verified successfully" })
}

async function updateEmailVerifiedPublic(req, res) {
  const endpoint = "POST /api/profiles/update-email-verified-public"
  log("log", endpoint, "Request received")
  log("log", endpoint, "Request body:", req.body)

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const { userId } = req.body || {}

  if (!userId) {
    log("warn", endpoint, "Bad request: userId is required")
    return res.status(400).json({ error: "userId is required" })
  }

  log("log", endpoint, `Fetching user from Supabase: ${userId}`)

  const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(userId)

  if (userError || !userResult?.user) {
    log("error", endpoint, "Error fetching user:", userError?.message || "User not found")
    return res.status(404).json({ error: "Auth user not found" })
  }

  const u = userResult.user
  log("log", endpoint, `User found: ${u.email} (${u.id})`)
  log("log", endpoint, `Email confirmed: ${!!u.email_confirmed_at}`)

  const { data: existingProfile, error: checkError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", u.id)
    .maybeSingle()

  if (checkError) {
    log("error", endpoint, "Error checking profile:", checkError.message)
    return res.status(500).json({ error: checkError.message })
  }

  if (!existingProfile) {
    log("warn", endpoint, `Profile not found for user: ${u.id}, creating it now`)

    let role = u.user_metadata?.role || "customer"
    if (!["user", "admin", "customer"].includes(role)) {
      role = "customer"
    }
    const fullName = u.user_metadata?.name || null

    const { data: newProfile, error: createError } = await supabase
      .from("profiles")
      .insert({
        id: u.id,
        email: u.email,
        full_name: fullName,
        role: role,
      })
      .select()
      .maybeSingle()

    if (createError) {
      log("error", endpoint, "Error creating profile:", createError.message)
      return res.status(500).json({ error: createError.message })
    }

    log("log", endpoint, `Profile created for user: ${u.id}`)
    return res.json({ profile: newProfile, message: "Profile created successfully" })
  }

  const updateData = {}
  if (u.email && u.email !== existingProfile.email) {
    updateData.email = u.email
  }

  if (Object.keys(updateData).length > 0) {
    const { data: profile, error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", u.id)
      .select()
      .maybeSingle()

    if (updateError) {
      log("error", endpoint, "Error updating profile:", updateError.message)
      return res.status(500).json({ error: updateError.message })
    }

    log("log", endpoint, `Profile email synced for user: ${u.id}`)
    return res.json({ profile, message: "Email verified - profile updated" })
  }

  log("log", endpoint, `Email verified for user: ${u.id}`)
  return res.json({ profile: existingProfile, message: "Email verified successfully" })
}

async function completeOnboarding(req, res) {
  const endpoint = "POST /api/profile/onboarding-complete"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    log("warn", endpoint, "Unauthorized: No user in request")
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id)
    .select("id, onboarding_completed")
    .maybeSingle()

  if (error) {
    log("error", endpoint, "Error updating profile:", error.message)
    return res.status(500).json({ error: error.message })
  }

  log("log", endpoint, `Onboarding marked complete for user: ${user.id}`)
  return res.json({ profile: data })
}

module.exports = {
  getProfile,
  createProfile,
  createProfilePublic,
  updateProfilePublic,
  updateEmailVerified,
  updateEmailVerifiedPublic,
  completeOnboarding,
}
