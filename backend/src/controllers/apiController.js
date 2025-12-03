const { supabase } = require("../config/supabase")

function getRoot(req, res) {
  res.json({ message: "Effycion backend API is running" })
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

async function getEmployees(req, res) {
  console.log(`[${new Date().toISOString()}] GET /api/admin/employees - Request received`)
  
  if (!supabase) {
    console.error(`[${new Date().toISOString()}] GET /api/admin/employees - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, status, email_verified, admin_approved, created_at")
    .neq("role", "customer")
    .range(0, 9)
    .order("created_at", { ascending: false })

  if (error) {
    console.error(`[${new Date().toISOString()}] GET /api/admin/employees - Error:`, error.message)
    return res.status(500).json({ error: error.message })
  }

  console.log(`[${new Date().toISOString()}] GET /api/admin/employees - Success: Found ${data?.length || 0} employees`)
  res.json({ employees: data ?? [] })
}

async function getCustomers(req, res) {
  console.log(`[${new Date().toISOString()}] GET /api/admin/customers - Request received`)
  
  if (!supabase) {
    console.error(`[${new Date().toISOString()}] GET /api/admin/customers - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, status, email_verified, admin_approved, created_at")
    .eq("role", "customer")
    .range(0, 9)
    .order("created_at", { ascending: false })

  if (error) {
    console.error(`[${new Date().toISOString()}] GET /api/admin/customers - Error:`, error.message)
    return res.status(500).json({ error: error.message })
  }

  console.log(`[${new Date().toISOString()}] GET /api/admin/customers - Success: Found ${data?.length || 0} customers`)
  res.json({ customers: data ?? [] })
}

async function createProfile(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/profiles/create - Request received`)
  
  if (!supabase) {
    console.error(`[${new Date().toISOString()}] POST /api/profiles/create - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user

  if (!user) {
    console.warn(`[${new Date().toISOString()}] POST /api/profiles/create - Unauthorized: No user in request`)
    return res.status(401).json({ error: "Unauthorized" })
  }

  console.log(`[${new Date().toISOString()}] POST /api/profiles/create - Creating profile for user: ${user.id} (${user.email})`)

  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle()

  if (existingProfile) {
    console.log(`[${new Date().toISOString()}] POST /api/profiles/create - Profile already exists for user: ${user.id}`)
    return res.json({ profile: existingProfile, message: "Profile already exists" })
  }

  // Get user metadata
  const role = user.user_metadata?.role || "customer"
  const fullName = user.user_metadata?.name || user.email || ""
  const emailVerified = !!user.email_confirmed_at

  console.log(`[${new Date().toISOString()}] POST /api/profiles/create - Profile data:`, {
    id: user.id,
    email: user.email,
    full_name: fullName,
    role,
    email_verified: emailVerified,
    status: emailVerified ? "pending_admin" : "pending_email",
  })

  // Create profile entry
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      role: role,
      email_verified: emailVerified,
      admin_approved: false,
      status: emailVerified ? "pending_admin" : "pending_email",
    })
    .select()
    .maybeSingle()

  if (profileError) {
    console.error(`[${new Date().toISOString()}] POST /api/profiles/create - Error creating profile:`, profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  console.log(`[${new Date().toISOString()}] POST /api/profiles/create - Profile created successfully for user: ${user.id}`)
  return res.json({ profile, message: "Profile created successfully" })
}

async function createProfilePublic(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/profiles/create-public - Request received`)
  console.log(`[${new Date().toISOString()}] POST /api/profiles/create-public - Request body:`, req.body)
  
  if (!supabase) {
    console.error(`[${new Date().toISOString()}] POST /api/profiles/create-public - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const { userId, email, userMetadata, emailConfirmed } = req.body || {}

  if (!userId) {
    console.warn(`[${new Date().toISOString()}] POST /api/profiles/create-public - Bad request: userId is required`)
    return res.status(400).json({ error: "userId is required" })
  }

  // Use provided data or try to fetch from Supabase as fallback
  let u = null
  if (email && userMetadata !== undefined) {
    // Use data provided from frontend (faster, avoids timing issues)
    console.log(`[${new Date().toISOString()}] POST /api/profiles/create-public - Using provided user data for: ${email}`)
    u = {
      id: userId,
      email: email,
      user_metadata: userMetadata || {},
      email_confirmed_at: emailConfirmed ? new Date().toISOString() : null,
    }
  } else {
    // Fallback: Fetch from Supabase (in case frontend doesn't provide data)
    console.log(`[${new Date().toISOString()}] POST /api/profiles/create-public - Fetching user from Supabase: ${userId}`)
    const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError || !userResult?.user) {
      console.error(`[${new Date().toISOString()}] POST /api/profiles/create-public - Error fetching user:`, userError?.message || "User not found")
      return res.status(404).json({ error: "Auth user not found" })
    }

    u = userResult.user
    console.log(`[${new Date().toISOString()}] POST /api/profiles/create-public - User found: ${u.email} (${u.id})`)
  }

  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", u.id)
    .maybeSingle()

  if (existingProfile) {
    console.log(`[${new Date().toISOString()}] POST /api/profiles/create-public - Profile already exists for user: ${u.id}`)
    return res.json({ profile: existingProfile, message: "Profile already exists" })
  }

  // Get user metadata
  const role = u.user_metadata?.role || "customer"
  const fullName = u.user_metadata?.name || u.email || ""
  const emailVerified = !!u.email_confirmed_at

  console.log(`[${new Date().toISOString()}] POST /api/profiles/create-public - Creating profile with data:`, {
    id: u.id,
    email: u.email,
    full_name: fullName,
    role,
    email_verified: emailVerified,
    admin_approved: false,
    status: emailVerified ? "pending_admin" : "pending_email",
  })

  // Create profile entry
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: u.id,
      email: u.email,
      full_name: fullName,
      role: role,
      email_verified: emailVerified,
      admin_approved: false,
      status: emailVerified ? "pending_admin" : "pending_email",
    })
    .select()
    .maybeSingle()

  if (profileError) {
    console.error(`[${new Date().toISOString()}] POST /api/profiles/create-public - Error creating profile:`, profileError.message)
    console.error(`[${new Date().toISOString()}] POST /api/profiles/create-public - Full error:`, profileError)
    return res.status(500).json({ error: profileError.message })
  }

  console.log(`[${new Date().toISOString()}] POST /api/profiles/create-public - Profile created successfully for user: ${u.id}`)
  console.log(`[${new Date().toISOString()}] POST /api/profiles/create-public - Created profile:`, profile)
  return res.json({ profile, message: "Profile created successfully" })
}

async function updateEmailVerified(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - Request received`)
  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - Request body:`, req.body)
  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - Headers:`, req.headers.authorization ? "Authorization header present" : "No authorization header")
  
  if (!supabase) {
    console.error(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user

  if (!user) {
    console.warn(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - Unauthorized: No user in request`)
    return res.status(401).json({ error: "Unauthorized" })
  }

  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - Updating email_verified for user: ${user.id}`)
  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - User email_confirmed_at:`, user.email_confirmed_at)

  // Check if email is actually confirmed in auth.users
  const emailVerified = !!user.email_confirmed_at

  if (!emailVerified) {
    console.warn(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - Email not confirmed for user: ${user.id}`)
    return res.status(400).json({ error: "Email is not confirmed" })
  }

  // Update profile
  const { data: profile, error: updateError } = await supabase
    .from("profiles")
    .update({
      email_verified: true,
      status: "pending_admin", // Move to pending admin approval
    })
    .eq("id", user.id)
    .select()
    .maybeSingle()

  if (updateError) {
    console.error(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - Error updating profile:`, updateError.message)
    console.error(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - Full error:`, updateError)
    return res.status(500).json({ error: updateError.message })
  }

  if (!profile) {
    console.warn(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - Profile not found for user: ${user.id}`)
    return res.status(404).json({ error: "Profile not found" })
  }

  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - Profile updated successfully for user: ${user.id}`)
  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - Updated profile:`, profile)
  return res.json({ profile, message: "Email verified status updated" })
}

async function updateEmailVerifiedPublic(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Request received`)
  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Request body:`, req.body)
  
  if (!supabase) {
    console.error(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const { userId } = req.body || {}

  if (!userId) {
    console.warn(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Bad request: userId is required`)
    return res.status(400).json({ error: "userId is required" })
  }

  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Fetching user from Supabase: ${userId}`)

  // Fetch the auth user by id using the service role key
  const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(userId)

  if (userError || !userResult?.user) {
    console.error(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Error fetching user:`, userError?.message || "User not found")
    return res.status(404).json({ error: "Auth user not found" })
  }

  const u = userResult.user
  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - User found: ${u.email} (${u.id})`)
  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Email confirmed:`, !!u.email_confirmed_at)
  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Email confirmed at:`, u.email_confirmed_at)

  // Check if profile exists first
  const { data: existingProfile, error: checkError } = await supabase
    .from("profiles")
    .select("id, email_verified, status")
    .eq("id", u.id)
    .maybeSingle()

  if (checkError) {
    console.error(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Error checking profile:`, checkError.message)
    return res.status(500).json({ error: checkError.message })
  }

  if (!existingProfile) {
    console.warn(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Profile not found for user: ${u.id}, creating it now`)
    
    // Create profile if it doesn't exist
    const role = u.user_metadata?.role || "customer"
    const fullName = u.user_metadata?.name || u.email || ""
    
    const { data: newProfile, error: createError } = await supabase
      .from("profiles")
      .insert({
        id: u.id,
        email: u.email,
        full_name: fullName,
        role: role,
        email_verified: true,
        admin_approved: false,
        status: "pending_admin",
      })
      .select()
      .maybeSingle()

    if (createError) {
      console.error(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Error creating profile:`, createError.message)
      return res.status(500).json({ error: createError.message })
    }

    console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Profile created and verified for user: ${u.id}`)
    return res.json({ profile: newProfile, message: "Profile created and email verified" })
  }

  // Check if email is actually confirmed
  // If not confirmed yet, it might be a timing issue - still update the profile
  // The email was verified if we reached this endpoint via the verification link
  const emailConfirmed = !!u.email_confirmed_at
  
  if (!emailConfirmed) {
    console.warn(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Email not confirmed yet for user: ${u.id}, but updating anyway (timing issue)`)
    // Don't return error - update anyway since user clicked verification link
  }

  // Update profile
  const { data: profile, error: updateError } = await supabase
    .from("profiles")
    .update({
      email_verified: true,
      status: "pending_admin",
    })
    .eq("id", u.id)
    .select()
    .maybeSingle()

  if (updateError) {
    console.error(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Error updating profile:`, updateError.message)
    console.error(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Full error:`, updateError)
    return res.status(500).json({ error: updateError.message })
  }

  if (!profile) {
    console.warn(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Profile not found after update for user: ${u.id}`)
    return res.status(404).json({ error: "Profile not found after update" })
  }

  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Profile updated successfully for user: ${u.id}`)
  return res.json({ profile, message: "Email verified status updated" })
}

async function approveProfile(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/admin/profiles/approve - Request received`)
  
  if (!supabase) {
    console.error(`[${new Date().toISOString()}] POST /api/admin/profiles/approve - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const requester = req.user
  const requesterRole = requester?.user_metadata?.role

  if (requesterRole !== "admin") {
    console.warn(`[${new Date().toISOString()}] POST /api/admin/profiles/approve - Forbidden: User ${requester?.id} is not an admin`)
    return res.status(403).json({ error: "Only admins can approve profiles" })
  }

  const { userId, role } = req.body || {}

  if (!userId) {
    console.warn(`[${new Date().toISOString()}] POST /api/admin/profiles/approve - Bad request: userId is required`)
    return res.status(400).json({ error: "userId is required" })
  }

  console.log(`[${new Date().toISOString()}] POST /api/admin/profiles/approve - Admin ${requester?.id} approving user: ${userId}`)

  // Fetch the auth user by id using the service role key
  const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(userId)

  if (userError || !userResult?.user) {
    console.error(`[${new Date().toISOString()}] POST /api/admin/profiles/approve - Error fetching user:`, userError?.message || "User not found")
    return res.status(404).json({ error: "Auth user not found" })
  }

  const u = userResult.user
  const profileRole = role || u.user_metadata?.role || "customer"

  console.log(`[${new Date().toISOString()}] POST /api/admin/profiles/approve - Approving profile for user: ${u.email} with role: ${profileRole}`)

  const { data: upserted, error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.name || u.email || "",
        role: profileRole,
        email_verified: !!u.email_confirmed_at,
        admin_approved: true,
        status: "active",
      },
      { onConflict: "id" }
    )
    .select()
    .maybeSingle()

  if (upsertError) {
    console.error(`[${new Date().toISOString()}] POST /api/admin/profiles/approve - Error upserting profile:`, upsertError.message)
    return res.status(500).json({ error: upsertError.message })
  }

  console.log(`[${new Date().toISOString()}] POST /api/admin/profiles/approve - Profile approved successfully for user: ${u.id}`)
  return res.json({ profile: upserted })
}

module.exports = {
  getRoot,
  getProfile,
  getEmployees,
  getCustomers,
  createProfile,
  createProfilePublic,
  updateEmailVerified,
  updateEmailVerifiedPublic,
  approveProfile,
}


