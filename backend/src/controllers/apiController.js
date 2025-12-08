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
    .select(
      `
      id,
      email,
      full_name,
      role,
      status,
      email_verified,
      admin_approved,
      created_at,
      companies (
        name,
        size,
        industry
      )
    `
    )
    .eq("role", "customer")
    .range(0, 49)
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

async function getCustomerDetailsAdmin(req, res) {
  console.log(`[${new Date().toISOString()}] GET /api/admin/customers/:id - Request received`)

  if (!supabase) {
    console.error(`[${new Date().toISOString()}] GET /api/admin/customers/:id - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const requester = req.user
  const requesterRole = requester?.user_metadata?.role

  if (requesterRole !== "admin") {
    console.warn(
      `[${new Date().toISOString()}] GET /api/admin/customers/:id - Forbidden: User ${requester?.id} is not an admin`
    )
    return res.status(403).json({ error: "Only admins can view customer details" })
  }

  const { id } = req.params

  if (!id) {
    return res.status(400).json({ error: "Customer id is required" })
  }

  // Fetch profile with company_id
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, status, email_verified, admin_approved, created_at, company_id, onboarding_completed")
    .eq("id", id)
    .maybeSingle()

  if (profileError) {
    console.error(
      `[${new Date().toISOString()}] GET /api/admin/customers/:id - Error fetching profile:`,
      profileError.message
    )
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile) {
    return res.status(404).json({ error: "Customer profile not found" })
  }

  const companyId = profile.company_id

  let company = null
  let plans = []
  let alerts = null
  let integrations = []

  if (companyId) {
    const [{ data: companyData }, { data: plansData }, { data: alertsData }, { data: integrationsData }] =
      await Promise.all([
        supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
        supabase.from("company_plans").select("*").eq("company_id", companyId),
        supabase.from("company_alerts").select("*").eq("company_id", companyId).maybeSingle(),
        supabase.from("company_integrations").select("*").eq("company_id", companyId),
      ])

    company = companyData || null
    plans = plansData || []
    alerts = alertsData || null
    integrations = integrationsData || []
  }

  return res.json({
    profile,
    company,
    plans,
    alerts,
    integrations,
  })
}

async function completeOnboarding(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/profile/onboarding-complete - Request received`)

  if (!supabase) {
    console.error(
      `[${new Date().toISOString()}] POST /api/profile/onboarding-complete - Supabase not configured`
    )
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    console.warn(
      `[${new Date().toISOString()}] POST /api/profile/onboarding-complete - Unauthorized: No user in request`
    )
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id)
    .select("id, onboarding_completed")
    .maybeSingle()

  if (error) {
    console.error(
      `[${new Date().toISOString()}] POST /api/profile/onboarding-complete - Error updating profile:`,
      error.message
    )
    return res.status(500).json({ error: error.message })
  }

  console.log(
    `[${new Date().toISOString()}] POST /api/profile/onboarding-complete - Onboarding marked complete for user: ${user.id}`
  )
  return res.json({ profile: data })
}

// ================================
// SaaS core: companies & settings
// ================================

async function upsertCompany(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/company - Request received`)

  if (!supabase) {
    console.error(`[${new Date().toISOString()}] POST /api/company - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    console.warn(`[${new Date().toISOString()}] POST /api/company - Unauthorized: No user in request`)
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { name, size, industry, website, phone } = req.body || {}

  if (!name) {
    console.warn(`[${new Date().toISOString()}] POST /api/company - Bad request: name is required`)
    return res.status(400).json({ error: "Company name is required" })
  }

  // Find existing profile for this user
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(`[${new Date().toISOString()}] POST /api/company - Error fetching profile:`, profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  let companyId = profile?.company_id || null

  if (companyId) {
    console.log(`[${new Date().toISOString()}] POST /api/company - Updating existing company: ${companyId}`)
    const { data: company, error: updateError } = await supabase
      .from("companies")
      .update({
        name,
        size,
        industry,
        website,
        phone,
      })
      .eq("id", companyId)
      .select()
      .maybeSingle()

    if (updateError) {
      console.error(`[${new Date().toISOString()}] POST /api/company - Error updating company:`, updateError.message)
      return res.status(500).json({ error: updateError.message })
    }

    return res.json({ company })
  } else {
    console.log(`[${new Date().toISOString()}] POST /api/company - Creating new company`)
    const { data: company, error: insertError } = await supabase
      .from("companies")
      .insert({
        name,
        size,
        industry,
        website,
        phone,
      })
      .select()
      .maybeSingle()

    if (insertError) {
      console.error(`[${new Date().toISOString()}] POST /api/company - Error creating company:`, insertError.message)
      return res.status(500).json({ error: insertError.message })
    }

    companyId = company.id

    // Link profile to company
    if (profile) {
      await supabase
        .from("profiles")
        .update({ company_id: companyId })
        .eq("id", user.id)
    }

    return res.json({ company })
  }
}

async function getCompany(req, res) {
  console.log(`[${new Date().toISOString()}] GET /api/company - Request received`)

  if (!supabase) {
    console.error(`[${new Date().toISOString()}] GET /api/company - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    console.warn(`[${new Date().toISOString()}] GET /api/company - Unauthorized: No user in request`)
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(`[${new Date().toISOString()}] GET /api/company - Error fetching profile:`, profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    console.log(`[${new Date().toISOString()}] GET /api/company - No company linked to profile`)
    return res.json({ company: null })
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", profile.company_id)
    .maybeSingle()

  if (companyError) {
    console.error(`[${new Date().toISOString()}] GET /api/company - Error fetching company:`, companyError.message)
    return res.status(500).json({ error: companyError.message })
  }

  return res.json({ company })
}

async function upsertIntegrations(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/integrations - Request received`)

  if (!supabase) {
    console.error(`[${new Date().toISOString()}] POST /api/integrations - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    console.warn(`[${new Date().toISOString()}] POST /api/integrations - Unauthorized: No user in request`)
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { integrations } = req.body || {}

  if (!Array.isArray(integrations) || integrations.length === 0) {
    console.warn(`[${new Date().toISOString()}] POST /api/integrations - Bad request: integrations array is required`)
    return res.status(400).json({ error: "integrations array is required" })
  }

  // Get company_id from profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(`[${new Date().toISOString()}] POST /api/integrations - Error fetching profile:`, profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    console.warn(`[${new Date().toISOString()}] POST /api/integrations - No company linked to profile`)
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const companyId = profile.company_id

  const rows = integrations.map((i) => {
    // Validate Fortnox Client ID if it's a Fortnox integration
    if (i.tool_name === "Fortnox" && i.client_id) {
      // Check if client_id looks like an email (common mistake)
      if (i.client_id.includes("@") || (i.client_id.includes(".") && i.client_id.length < 20)) {
        console.error(
          `[${new Date().toISOString()}] POST /api/integrations - ❌ INVALID CLIENT ID: "${i.client_id}" looks like an email address. Fortnox Client ID should be a string like "PJXSFQMcbFeJ", not an email.`
        )
        // Still save it, but the OAuth start will catch and reject it
      } else {
        console.log(
          `[${new Date().toISOString()}] POST /api/integrations - ✅ Valid Fortnox Client ID format: ${i.client_id.substring(0, 8)}... (length: ${i.client_id.length})`
        )
      }
    }
    
    return {
    company_id: companyId,
    tool_name: i.tool_name,
    connection_type: i.connection_type || "api_key",
    status: i.status || "connected",
    environment: i.environment || "production",
    oauth_data: i.oauth_data || null,
    api_key: i.api_key || null,
    client_id: i.client_id || null,
    client_secret: i.client_secret || null,
    webhook_url: i.webhook_url || null,
    }
  })

  const { data, error } = await supabase
    .from("company_integrations")
    .upsert(rows)
    .select()

  if (error) {
    console.error(`[${new Date().toISOString()}] POST /api/integrations - Error upserting integrations:`, error.message)
    return res.status(500).json({ error: error.message })
  }

  return res.json({ integrations: data })
}

async function getIntegrations(req, res) {
  console.log(`[${new Date().toISOString()}] GET /api/integrations - Request received`)

  if (!supabase) {
    console.error(`[${new Date().toISOString()}] GET /api/integrations - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    console.warn(`[${new Date().toISOString()}] GET /api/integrations - Unauthorized: No user in request`)
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(`[${new Date().toISOString()}] GET /api/integrations - Error fetching profile:`, profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    console.log(`[${new Date().toISOString()}] GET /api/integrations - No company linked to profile`)
    return res.json({ integrations: [] })
  }

  const { data, error } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error(`[${new Date().toISOString()}] GET /api/integrations - Error fetching integrations:`, error.message)
    return res.status(500).json({ error: error.message })
  }

  return res.json({ integrations: data || [] })
}

async function deleteIntegration(req, res) {
  console.log(`[${new Date().toISOString()}] DELETE /api/integrations/:id - Request received`)

  if (!supabase) {
    console.error(`[${new Date().toISOString()}] DELETE /api/integrations/:id - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    console.warn(`[${new Date().toISOString()}] DELETE /api/integrations/:id - Unauthorized: No user in request`)
    return res.status(401).json({ error: "Unauthorized" })
  }

  const integrationId = req.params.id
  if (!integrationId) {
    console.warn(`[${new Date().toISOString()}] DELETE /api/integrations/:id - Bad request: integration ID is required`)
    return res.status(400).json({ error: "Integration ID is required" })
  }

  // Get company_id from profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(`[${new Date().toISOString()}] DELETE /api/integrations/:id - Error fetching profile:`, profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    console.warn(`[${new Date().toISOString()}] DELETE /api/integrations/:id - No company linked to profile`)
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const companyId = profile.company_id

  // First, verify the integration belongs to the user's company
  const { data: integration, error: fetchError } = await supabase
    .from("company_integrations")
    .select("id, tool_name, company_id")
    .eq("id", integrationId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (fetchError) {
    console.error(`[${new Date().toISOString()}] DELETE /api/integrations/:id - Error fetching integration:`, fetchError.message)
    return res.status(500).json({ error: fetchError.message })
  }

  if (!integration) {
    console.warn(`[${new Date().toISOString()}] DELETE /api/integrations/:id - Integration not found or access denied`)
    return res.status(404).json({ error: "Integration not found or you don't have permission to delete it" })
  }

  // Delete the integration
  const { error: deleteError } = await supabase
    .from("company_integrations")
    .delete()
    .eq("id", integrationId)
    .eq("company_id", companyId)

  if (deleteError) {
    console.error(`[${new Date().toISOString()}] DELETE /api/integrations/:id - Error deleting integration:`, deleteError.message)
    return res.status(500).json({ error: deleteError.message })
  }

  console.log(`[${new Date().toISOString()}] DELETE /api/integrations/:id - Successfully deleted integration: ${integration.tool_name}`)
  return res.json({ message: "Integration deleted successfully", id: integrationId })
}

// =====================================
// Fortnox OAuth + Customers sync
// =====================================

// Rate limiting for Fortnox API calls (25 requests per 5 seconds per access token)
const fortnoxRateLimit = new Map() // Map of access_token -> { count, resetTime }

function checkRateLimit(accessToken) {
  const now = Date.now()
  const limit = fortnoxRateLimit.get(accessToken)
  
  if (!limit || now > limit.resetTime) {
    // Reset or initialize
    fortnoxRateLimit.set(accessToken, {
      count: 1,
      resetTime: now + 5000, // 5 seconds
    })
    return { allowed: true, remaining: 24 }
  }
  
  if (limit.count >= 25) {
    const waitTime = Math.ceil((limit.resetTime - now) / 1000)
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: waitTime,
      message: `Rate limit exceeded. Please wait ${waitTime} second${waitTime !== 1 ? 's' : ''} before trying again.`
    }
  }
  
  limit.count++
  return { allowed: true, remaining: 25 - limit.count }
}

async function startFortnoxOAuth(req, res) {
  console.log(`[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - Request received`)

  if (!supabase) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - Supabase not configured`
    )
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    console.warn(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - Unauthorized: No user in request`
    )
    return res.status(401).json({ error: "Unauthorized" })
  }

  // Get company for this user
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - Error fetching profile:`,
      profileError.message
    )
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    console.warn(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - No company linked to profile`
    )
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const companyId = profile.company_id

  // Find Fortnox integration for this company to get client_id/client_secret
  const { data: integration, error: integrationError } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("tool_name", "Fortnox")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (integrationError) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - Error fetching integration:`,
      integrationError.message
    )
    return res.status(500).json({ error: integrationError.message })
  }

  if (!integration || !integration.client_id) {
    console.warn(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - No Fortnox integration/client_id configured for company`
    )
    return res.status(400).json({ error: "Fortnox integration not configured for this company" })
  }

  const clientId = integration.client_id
  
  // Validate that client_id is not an email address (common mistake)
  if (clientId.includes("@") || clientId.includes(".") && clientId.length < 20) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - ❌ INVALID CLIENT ID: "${clientId}" looks like an email address. Fortnox Client ID should be a string like "PJXSFQMcbFeJ", not an email.`
    )
    return res.status(400).json({ 
      error: "Invalid Fortnox Client ID",
      details: `The Client ID "${clientId}" appears to be an email address. Please enter your actual Fortnox Client ID from the Fortnox Developer Portal (e.g., "PJXSFQMcbFeJ").`
    })
  }
  
  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - Using Client ID: ${clientId.substring(0, 8)}... (length: ${clientId.length})`
  )
  
  const environment = integration.environment || "sandbox"

  const redirectUri =
    process.env.FORTNOX_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/fortnox/callback"

  // Fortnox OAuth: Scope is required. 
  // NOTE: Scopes must match what's enabled in your Fortnox Developer Portal app settings
  // Valid scope names per Fortnox API: "archive", "companyinformation", "inbox", "profile", "settings", etc.
  // Scopes that work with "Any" license: "archive", "companyinformation", "inbox", "profile", "settings"
  // Scopes that require licenses: "customer" (Kundfaktura/Order), "invoice" (Order/Kundfaktura), "order" (Order), etc.
  // Multiple scopes can be space-separated: "companyinformation settings profile archive inbox"
  // Set FORTNOX_OAUTH_SCOPE env var to override (default includes "Any" license scopes)
  const scopeEnv = process.env.FORTNOX_OAUTH_SCOPE
  let scope = scopeEnv !== undefined ? scopeEnv.trim() : "companyinformation settings profile archive inbox"
  
  // Normalize scope: Fortnox requires lowercase scopes
  // Convert to lowercase and normalize spaces (multiple spaces to single space)
  if (scope && scope !== "") {
    const originalScope = scope
    scope = scope.toLowerCase().replace(/\s+/g, ' ').trim()
    
    // Warn if we had to normalize it
    if (originalScope !== scope) {
      console.warn(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - Normalized scope from "${originalScope}" to "${scope}" (Fortnox requires lowercase scopes)`
      )
    }
    
    // Additional validation: warn about potentially invalid scope names
    // "Kund Företagsinformation" is not a valid scope - it's a UI label, not an API scope
    if (originalScope.includes("Företagsinformation") || originalScope.includes("företagsinformation")) {
      console.error(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - ERROR: "${originalScope}" is not a valid Fortnox scope. "Företagsinformation" is a UI label, not an API scope. Using default "customer" instead.`
      )
      // Use default valid scope instead
      scope = "customer"
    }
  } else {
    // If scope is empty, use default
    scope = "customer"
  }
  
  const authUrl = new URL("https://apps.fortnox.se/oauth-v1/auth")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  // Always include scope (Fortnox requires it)
  authUrl.searchParams.set("scope", scope)
  // Request offline access to get refresh tokens (required for long-lived sessions)
  authUrl.searchParams.set("access_type", "offline")
  
  const statePayload = {
    company_id: companyId,
    environment,
  }
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url")
  authUrl.searchParams.set("state", state)

  const authUrlString = authUrl.toString()

  const authUrlForLogging = new URL(authUrlString)
  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - Generated Fortnox auth URL: ${authUrlForLogging.toString()}`
  )
  // Always log the scope being used (should never be empty after our fixes)
  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - Requesting scope: "${scope}" (env var: ${scopeEnv !== undefined ? `"${scopeEnv}"` : "not set, using default"})`
  )

  // If called from frontend via fetch (Accept: application/json), return JSON with URL
  const acceptHeader = req.headers.accept || ""
  if (acceptHeader.includes("application/json")) {
    return res.json({ url: authUrlString })
  }

  // If called directly in browser, redirect
  return res.redirect(authUrlString)
}

async function fortnoxOAuthCallback(req, res) {
  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - Request received`
  )

  if (!supabase) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - Supabase not configured`
    )
    return res.status(500).send("Supabase not configured on backend")
  }

  const { code, state, error, error_description } = req.query

  if (error) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - Error from Fortnox:`,
      error,
      error_description || ""
    )
    
    // Handle specific error types
    let errorType = "error"
    if (error === "error_missing_license" || error_description?.includes("not licensed")) {
      errorType = "error_missing_license"
      console.error(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - ⚠️ LICENSE ERROR: The Fortnox account doesn't have a license for the requested scope(s). The account needs a Fortnox subscription that includes customer data access.`
      )
    } else if (error === "invalid_scope") {
      errorType = "error_invalid_scope"
      console.error(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - ⚠️ INVALID SCOPE ERROR: One or more requested scopes are not valid or not enabled in the Fortnox Developer Portal.`,
        `Error description: ${error_description || "No description provided"}`,
        `Please check your Fortnox Developer Portal app settings and ensure all requested scopes are enabled.`
      )
    }
    
    const errorParam = encodeURIComponent(error)
    const errorDescParam = error_description ? encodeURIComponent(error_description) : ""
    const frontendErrorRedirect =
      (process.env.FRONTEND_APP_URL || "http://localhost:3000") +
      `/dashboard/integrations?fortnox=${errorType}&error=${errorParam}${
        errorDescParam ? `&error_desc=${errorDescParam}` : ""
      }`
    return res.redirect(frontendErrorRedirect)
  }

  if (!code || !state) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - Missing code or state`
    )
    const frontendErrorRedirect =
      (process.env.FRONTEND_APP_URL || "http://localhost:3000") +
      "/dashboard/integrations?fortnox=error_missing_code"
    return res.redirect(frontendErrorRedirect)
  }

  let decodedState
  try {
    decodedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
  } catch (e) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - Invalid state:`,
      e.message
    )
    const frontendErrorRedirect =
      (process.env.FRONTEND_APP_URL || "http://localhost:3000") +
      "/dashboard/integrations?fortnox=error_invalid_state"
    return res.redirect(frontendErrorRedirect)
  }

  const companyId = decodedState.company_id
  const { data: integration, error: integrationError } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("tool_name", "Fortnox")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (integrationError || !integration) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - Integration not found or error:`,
      integrationError?.message
    )
    const frontendErrorRedirect =
      (process.env.FRONTEND_APP_URL || "http://localhost:3000") +
      "/dashboard/integrations?fortnox=error_integration_not_found"
    return res.redirect(frontendErrorRedirect)
  }

  const clientId = integration.client_id
  const clientSecret = integration.client_secret

  const redirectUri =
    process.env.FORTNOX_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/fortnox/callback"

  try {
    // Use Basic Auth as per Fortnox OAuth spec: Base64(ClientId:ClientSecret)
    const credentials = Buffer.from(`${clientId}:${clientSecret || ""}`).toString("base64")
    
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - 🔑 Fetching tokens from Fortnox...`,
      {
        endpoint: "https://apps.fortnox.se/oauth-v1/token",
        grant_type: "authorization_code",
        client_id: clientId.substring(0, 8) + "...", // Log partial client ID for security
        redirect_uri: redirectUri,
      }
    )
    
    const tokenResponse = await fetch("https://apps.fortnox.se/oauth-v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: redirectUri,
      }).toString(),
    })
    
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - 📥 Token response received:`,
      {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        ok: tokenResponse.ok,
      }
    )

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - Token exchange failed:`,
        tokenResponse.status,
        errorText
      )
      const frontendErrorRedirect =
        (process.env.FRONTEND_APP_URL || "http://localhost:3000") +
        "/dashboard/integrations?fortnox=error_token"
      return res.redirect(frontendErrorRedirect)
    }

    const tokenData = await tokenResponse.json()

    // Log the granted scope for debugging
    const grantedScope = tokenData.scope || 'none'
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - ✅ Tokens successfully fetched from Fortnox!`,
      {
        has_access_token: !!tokenData.access_token,
        has_refresh_token: !!tokenData.refresh_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        granted_scope: grantedScope,
      }
    )
    
    // Log detailed scope information for troubleshooting
    if (!grantedScope || grantedScope === 'none') {
      console.warn(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - WARNING: No scope returned in token response!`
      )
    } else {
      const scopeList = grantedScope.split(/\s+/).filter(s => s)
      console.log(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - Granted scopes (${scopeList.length}): ${scopeList.join(", ")}`
      )
    }

    const now = Date.now()
    const expiresIn = tokenData.expires_in || 3600
    // Store expires_at as Unix timestamp (seconds) for easier comparison
    const expiresAt = Math.floor((now + expiresIn * 1000) / 1000)

    const newOauthData = {
      ...(integration.oauth_data || {}),
      tokens: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: expiresIn,
        expires_at: expiresAt,
        scope: tokenData.scope,
        token_type: tokenData.token_type,
      },
    }

    // Validate scopes - check for customer scope OR companyinformation scope (works with any license)
    const grantedScopeLower = (grantedScope || "").toLowerCase()
    const hasCustomerScope = grantedScopeLower.includes("customer")
    const hasCompanyInfoScope = grantedScopeLower.includes("companyinformation") || grantedScopeLower.includes("company")
    const hasValidScope = hasCustomerScope || hasCompanyInfoScope
    
    // Set status based on what scopes are available
    let integrationStatus = "connected"
    if (hasCustomerScope) {
      integrationStatus = "connected"
    } else if (hasCompanyInfoScope) {
      integrationStatus = "connected" // Company info works with any license
    } else {
      integrationStatus = "warning"
    }
    
    if (hasCustomerScope) {
      console.log(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - ✓ Customer scope confirmed. Integration ready for customer sync operations.`
      )
    } else if (hasCompanyInfoScope) {
      console.log(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - ✓ Company Information scope confirmed. Integration ready for company info operations (works with any license).`
      )
    } else {
      console.error(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - WARNING: Token does not include expected scopes. Granted scope: "${grantedScope}".`
      )
    }

    // Prepare database update
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - 💾 Preparing to save tokens to database...`,
      {
        integration_id: integration.id,
        company_id: companyId,
        status: integrationStatus,
        has_tokens: !!newOauthData.tokens?.access_token,
        token_expires_at: new Date(expiresAt * 1000).toISOString(),
      }
    )
    
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - 🔄 Executing database update...`
    )

    const { error: updateError } = await supabase
      .from("company_integrations")
      .update({
        oauth_data: newOauthData,
        status: integrationStatus,
      })
      .eq("id", integration.id)
      
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - 📊 Database update completed, checking for errors...`
    )

    if (updateError) {
      console.error(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - ❌ Error saving tokens to database:`,
        updateError.message,
        updateError
      )
      const frontendErrorRedirect =
        (process.env.FRONTEND_APP_URL || "http://localhost:3000") +
        "/dashboard/integrations?fortnox=error_saving_tokens"
      return res.redirect(frontendErrorRedirect)
    }
    
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - ✅ Tokens successfully saved to database!`,
      {
        integration_id: integration.id,
        company_id: companyId,
        status: integrationStatus,
        token_expires_at: new Date(expiresAt * 1000).toISOString(),
      }
    )

    // Redirect with warning if customer scope is missing (but company info scope is OK)
    if (!hasCustomerScope && !hasCompanyInfoScope) {
      const frontendWarningRedirect =
        (process.env.FRONTEND_APP_URL || "http://localhost:3000") +
        "/dashboard/integrations?fortnox=connected&scope_warning=true"
      return res.redirect(frontendWarningRedirect)
    }
    
    // If only company info scope (no customer scope), redirect with info message
    if (!hasCustomerScope && hasCompanyInfoScope) {
      const frontendInfoRedirect =
        (process.env.FRONTEND_APP_URL || "http://localhost:3000") +
        "/dashboard/integrations?fortnox=connected&scope_info=companyinfo"
      return res.redirect(frontendInfoRedirect)
    }

    const frontendSuccessRedirect =
      (process.env.FRONTEND_APP_URL || "http://localhost:3000") +
      "/dashboard/integrations?fortnox=connected"
    return res.redirect(frontendSuccessRedirect)
  } catch (e) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - Unexpected error:`,
      e
    )
    const frontendErrorRedirect =
      (process.env.FRONTEND_APP_URL || "http://localhost:3000") +
      "/dashboard/integrations?fortnox=error_unexpected"
    return res.redirect(frontendErrorRedirect)
  }
}

async function syncFortnoxCustomers(req, res) {
  console.log(
    `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Request received`
  )

  if (!supabase) {
    console.error(
      `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Supabase not configured`
    )
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    console.warn(
      `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Unauthorized: No user in request`
    )
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(
      `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Error fetching profile:`,
      profileError.message
    )
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    console.warn(
      `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - No company linked to profile`
    )
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const companyId = profile.company_id
  const { data: integration, error: integrationError } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("tool_name", "Fortnox")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (integrationError || !integration) {
    console.error(
      `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Integration not found or error:`,
      integrationError?.message
    )
    return res.status(400).json({ error: "Fortnox integration not configured for this company" })
  }

  const tokens = integration.oauth_data?.tokens

  if (!tokens?.access_token) {
    console.warn(
      `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - No access token stored`
    )
    return res
      .status(400)
      .json({ error: "Fortnox is connected but no access token is stored. Please reconnect." })
  }

  // Check if the token has the required customer scope
  const grantedScope = (tokens.scope || "").toLowerCase()
  if (!grantedScope.includes("customer")) {
    console.error(
      `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Token missing "customer" scope. Granted scope: "${tokens.scope}". Please reconnect with the correct permissions.`
    )
    return res.status(403).json({ 
      error: "Missing permission to access customer data",
      details: `The Fortnox integration doesn't have permission to access the customer register. Please reconnect your integration and ensure you grant 'customer' permissions during the OAuth authorization. Also verify that the "customer" scope is enabled in your Fortnox Developer Portal app settings.`,
      fortnoxError: "Token missing customer scope",
      currentScope: tokens.scope || 'none',
      action: "reconnect"
    })
  }

  // Check if token is expired and refresh if needed
  // expires_at can be stored as ISO string or Unix timestamp, handle both
  let expiresAt = tokens.expires_at
  if (typeof expiresAt === 'string') {
    // Convert ISO string to Unix timestamp
    expiresAt = Math.floor(new Date(expiresAt).getTime() / 1000)
  }
  const now = Math.floor(Date.now() / 1000)
  
  // Refresh if expired or about to expire in the next 5 minutes (300 seconds)
  if (expiresAt && now >= (expiresAt - 300)) {
    console.log(
      `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Access token expired, attempting refresh...`
    )
    
    try {
      // Use Basic Auth as per Fortnox OAuth spec: Base64(ClientId:ClientSecret)
      const credentials = Buffer.from(`${integration.client_id}:${integration.client_secret || ""}`).toString("base64")
      
      const refreshResponse = await fetch("https://apps.fortnox.se/oauth-v1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokens.refresh_token,
        }).toString(),
      })

      if (!refreshResponse.ok) {
        const refreshErrorText = await refreshResponse.text()
        let refreshErrorMsg = "Token refresh failed"
        try {
          const refreshErrorData = JSON.parse(refreshErrorText)
          refreshErrorMsg = refreshErrorData.error || refreshErrorData.error_description || refreshErrorMsg
        } catch (e) {
          refreshErrorMsg = refreshErrorText || refreshErrorMsg
        }
        
        console.error(
          `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Token refresh failed:`,
          refreshErrorMsg,
          `(Status: ${refreshResponse.status})`
        )
        
        // If refresh token expired (45 days), user needs to reconnect
        if (refreshResponse.status === 400 || refreshErrorMsg.includes("invalid") || refreshErrorMsg.includes("expired")) {
          return res.status(401).json({ 
            error: "Refresh token expired. Please reconnect your Fortnox integration.",
            details: "The refresh token has expired (45 days). You need to reconnect to continue using the integration.",
            action: "reconnect"
          })
        }
        
        return res.status(401).json({ 
          error: "Access token expired and refresh failed. Please reconnect your integration.",
          details: refreshErrorMsg
        })
      }

      const refreshData = await refreshResponse.json()
      const expiresIn = refreshData.expires_in || 3600
      const newExpiresAt = now + expiresIn

      // Preserve the original scope if the refresh token doesn't return it
      const refreshedScope = refreshData.scope || tokens.scope
      
      console.log(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - ✅ Refreshed tokens successfully fetched from Fortnox!`,
        {
          has_access_token: !!refreshData.access_token,
          has_refresh_token: !!refreshData.refresh_token,
          token_type: refreshData.token_type,
          expires_in: expiresIn,
          new_expires_at: new Date(newExpiresAt * 1000).toISOString(),
          refreshed_scope: refreshedScope,
        }
      )
      
      console.log(
        `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - ✅ Refreshed tokens successfully fetched from Fortnox!`,
        {
          has_access_token: !!refreshData.access_token,
          has_refresh_token: !!refreshData.refresh_token,
          token_type: refreshData.token_type,
          expires_in: expiresIn,
          new_expires_at: new Date(newExpiresAt * 1000).toISOString(),
          refreshed_scope: refreshedScope,
        }
      )

      // Validate that the refreshed token still has the customer scope
      const refreshedScopeLower = (refreshedScope || "").toLowerCase()
      if (!refreshedScopeLower.includes("customer")) {
        console.error(
          `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Refreshed token missing "customer" scope. Scope: "${refreshedScope}". Please reconnect.`
        )
        return res.status(403).json({ 
          error: "Refreshed token missing customer permission. Please reconnect Fortnox and ensure you grant access to customer data.",
          details: `Refreshed scope: ${refreshedScope || 'none'}. Required scope must include "customer".`,
          action: "reconnect"
        })
      }

      const updatedOauthData = {
        ...(integration.oauth_data || {}),
        tokens: {
          ...tokens,
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || tokens.refresh_token,
          expires_in: expiresIn,
          expires_at: newExpiresAt,
          scope: refreshedScope, // Preserve/update scope
        },
      }

      // Update integration with new tokens (IMPORTANT: Save refreshed tokens to DB)
      const { error: updateTokenError } = await supabase
        .from("company_integrations")
        .update({ oauth_data: updatedOauthData })
        .eq("id", integration.id)

      if (updateTokenError) {
        console.error(
          `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Error saving refreshed tokens:`,
          updateTokenError.message
        )
        // Continue anyway, but log the error
      } else {
        console.log(
          `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Refreshed tokens saved to database`
        )
      }

      // Use the new access token
      tokens.access_token = refreshData.access_token
      tokens.refresh_token = refreshData.refresh_token || tokens.refresh_token
      tokens.expires_at = newExpiresAt
      tokens.scope = refreshedScope
      console.log(
        `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Token refreshed successfully (new expiry: ${new Date(newExpiresAt * 1000).toISOString()})`
      )
    } catch (refreshError) {
      console.error(
        `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Error refreshing token:`,
        refreshError
      )
      return res.status(401).json({ 
        error: "Access token expired and could not be refreshed. Please reconnect your integration.",
        details: refreshError.message
      })
    }
  }

  // Check rate limit before making API call
  const rateLimitCheck = checkRateLimit(tokens.access_token)
  if (!rateLimitCheck.allowed) {
    console.warn(
      `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Rate limit exceeded`
    )
    return res.status(429).json({
      error: "Rate limit exceeded",
      details: rateLimitCheck.message,
      retryAfter: rateLimitCheck.resetIn,
    })
  }

  try {
    const apiUrl = "https://api.fortnox.se/3/customers?filter=active&sortby=customernumber"
    
    console.log(
      `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Fetching from Fortnox API (rate limit: ${rateLimitCheck.remaining} remaining)`
    )
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        // Fortnox-specific headers – adjust if needed based on your app's configuration
        Authorization: `Bearer ${tokens.access_token}`,
        "Client-Id": integration.client_id,
        "Client-Secret": integration.client_secret || "",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = "Failed to fetch customers from Fortnox"
      let errorData = null
      let fortnoxErrorCode = null
      
      // Try to parse error response
      try {
        errorData = JSON.parse(errorText)
        errorMessage = errorData.ErrorInformation?.message || errorData.message || errorMessage
        fortnoxErrorCode = errorData.ErrorInformation?.code
      } catch (e) {
        // If not JSON, use the text as-is
        if (errorText) {
          errorMessage = errorText
        }
      }
      
      console.error(
        `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Fortnox API error:`,
        response.status,
        response.statusText,
        errorMessage,
        fortnoxErrorCode ? `(Code: ${fortnoxErrorCode})` : ""
      )
      
      // Handle permission errors (400 with specific error codes)
      // Error code 2001538 = "Saknar behörighet för kundregister" (Missing permission for customer register)
      if (
        response.status === 400 && 
        (errorMessage.includes("behörighet") || 
         errorMessage.includes("permission") ||
         errorMessage.includes("2001538") ||
         fortnoxErrorCode === 2001538)
      ) {
        return res.status(403).json({ 
          error: "Missing permission to access customer data",
          details: "The Fortnox integration doesn't have permission to access the customer register. Please reconnect your integration and ensure you grant 'customer' permissions during the OAuth authorization.",
          fortnoxError: errorMessage,
          fortnoxCode: fortnoxErrorCode || 2001538,
          action: "reconnect"
        })
      }
      
      // Provide more specific error messages
      if (response.status === 401 || response.status === 403) {
        return res.status(401).json({ 
          error: "Fortnox authentication failed. Please reconnect your integration.",
          details: errorMessage
        })
      }
      
      return res.status(response.status).json({ 
        error: errorMessage,
        status: response.status,
        statusText: response.statusText,
        fortnoxError: errorMessage,
        fortnoxCode: fortnoxErrorCode
      })
    }

    const data = await response.json()
    const customers = data.Customers || data.customers || []
    const activeCustomersCount = Array.isArray(customers) ? customers.length : 0
    const lastSyncedAt = new Date().toISOString()

    const newOauthData = {
      ...(integration.oauth_data || {}),
      usage: {
        ...(integration.oauth_data?.usage || {}),
        active_customers_count: activeCustomersCount,
        last_synced_at: lastSyncedAt,
      },
    }

    const { error: updateError } = await supabase
      .from("company_integrations")
      .update({
        oauth_data: newOauthData,
      })
      .eq("id", integration.id)

    if (updateError) {
      console.error(
        `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Error updating integration with usage:`,
        updateError.message
      )
      return res.status(500).json({ error: updateError.message })
    }

    console.log(
      `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Success, active customers: ${activeCustomersCount}`
    )

    return res.json({
      active_customers_count: activeCustomersCount,
      last_synced_at: lastSyncedAt,
    })
  } catch (e) {
    console.error(
      `[${new Date().toISOString()}] POST /api/integrations/fortnox/sync-customers - Unexpected error:`,
      e
    )
    return res.status(500).json({ error: "Unexpected error while syncing customers" })
  }
}

async function getFortnoxCustomers(req, res) {
  // Log immediately when function is called
  console.log("=".repeat(80))
  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - 🚀🚀🚀 VIEW CUSTOMERS CLICKED - Request received - Starting View Customers flow 🚀🚀🚀`
  )
  console.log("=".repeat(80))
  
  // Extract query parameters for filtering
  const { name, email, phone, customernumber, city, zipcode } = req.query

  if (!supabase) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - ❌ Supabase not configured`
    )
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    console.warn(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - ⚠️ Unauthorized: No user in request`
    )
    return res.status(401).json({ error: "Unauthorized" })
  }
  
  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - 👤 User authenticated: ${user.id}`
  )

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - Error fetching profile:`,
      profileError.message
    )
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    console.warn(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - No company linked to profile`
    )
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const companyId = profile.company_id
  
  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - 💾 Fetching integration and tokens from database...`,
    {
      company_id: companyId,
      user_id: user.id,
    }
  )
  
  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - 🔍 Querying database for Fortnox integration...`
  )
  
  const { data: integration, error: integrationError } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("tool_name", "Fortnox")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (integrationError || !integration) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - ❌ Integration not found or error:`,
      integrationError?.message
    )
    return res.status(400).json({ error: "Fortnox integration not configured for this company" })
  }

  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - ✅ Integration found in database!`,
    {
      integration_id: integration.id,
      status: integration.status,
      has_oauth_data: !!integration.oauth_data,
    }
  )

  const tokens = integration.oauth_data?.tokens
  
  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - 🔑 Extracting tokens from integration data...`
  )
  
  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - ✅ Tokens retrieved from database!`,
    {
      integration_id: integration.id,
      has_access_token: !!tokens?.access_token,
      has_refresh_token: !!tokens?.refresh_token,
      token_scope: tokens?.scope || 'none',
      token_expires_at: tokens?.expires_at ? new Date(tokens.expires_at * 1000).toISOString() : 'unknown',
      access_token_preview: tokens?.access_token ? tokens.access_token.substring(0, 20) + '...' : 'none',
    }
  )

  if (!tokens?.access_token) {
    console.warn(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - No access token stored`
    )
    return res
      .status(400)
      .json({ error: "Fortnox is connected but no access token is stored. Please reconnect." })
  }

  if (!tokens?.refresh_token) {
    console.warn(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - No refresh token stored`
    )
    return res
      .status(400)
      .json({ error: "Fortnox is connected but no refresh token is stored. Please reconnect." })
  }

  // Check if the token has the required customer scope
  const grantedScope = (tokens.scope || "").toLowerCase()
  if (!grantedScope.includes("customer")) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - Token missing "customer" scope. Granted scope: "${tokens.scope}".`
    )
    return res.status(403).json({ 
      error: "Missing permission to access customer data",
      details: `The Fortnox integration doesn't have permission to access the customer register. Please reconnect your integration and ensure you grant 'customer' permissions during the OAuth authorization. Also verify that the "customer" scope is enabled in your Fortnox Developer Portal app settings.`,
      fortnoxError: "Token missing customer scope",
      currentScope: tokens.scope || 'none',
      action: "reconnect"
    })
  }

  // Check if token is expired and refresh if needed
  // expires_at can be stored as ISO string or Unix timestamp, handle both
  let expiresAt = tokens.expires_at
  if (typeof expiresAt === 'string') {
    // Convert ISO string to Unix timestamp
    expiresAt = Math.floor(new Date(expiresAt).getTime() / 1000)
  }
  const now = Math.floor(Date.now() / 1000)
  
  let accessToken = tokens.access_token
  
  // Refresh if expired or about to expire in the next 5 minutes (300 seconds)
  if (expiresAt && now >= (expiresAt - 300)) {
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - Access token expired, attempting refresh...`
    )
    
    try {
      // Use Basic Auth as per Fortnox OAuth spec: Base64(ClientId:ClientSecret)
      const credentials = Buffer.from(`${integration.client_id}:${integration.client_secret || ""}`).toString("base64")
      
      console.log(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - 🔑 Fetching refreshed tokens from Fortnox...`,
        {
          endpoint: "https://apps.fortnox.se/oauth-v1/token",
          grant_type: "refresh_token",
          client_id: integration.client_id.substring(0, 8) + "...", // Log partial client ID for security
          current_token_expires_at: tokens.expires_at ? new Date(tokens.expires_at * 1000).toISOString() : "unknown",
        }
      )
      
      const refreshResponse = await fetch("https://apps.fortnox.se/oauth-v1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokens.refresh_token,
        }).toString(),
      })
      
      console.log(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - 📥 Token refresh response received:`,
        {
          status: refreshResponse.status,
          statusText: refreshResponse.statusText,
          ok: refreshResponse.ok,
        }
      )

      if (!refreshResponse.ok) {
        const refreshErrorText = await refreshResponse.text()
        let refreshErrorMsg = "Token refresh failed"
        try {
          const refreshErrorData = JSON.parse(refreshErrorText)
          refreshErrorMsg = refreshErrorData.error || refreshErrorData.error_description || refreshErrorMsg
        } catch (e) {
          refreshErrorMsg = refreshErrorText || refreshErrorMsg
        }
        
        console.error(
          `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - Token refresh failed:`,
          refreshErrorMsg,
          `(Status: ${refreshResponse.status})`
        )
        
        // If refresh token expired (45 days), user needs to reconnect
        if (refreshResponse.status === 400 || refreshErrorMsg.includes("invalid") || refreshErrorMsg.includes("expired")) {
          return res.status(401).json({ 
            error: "Refresh token expired. Please reconnect your Fortnox integration.",
            details: "The refresh token has expired (45 days). You need to reconnect to continue using the integration.",
            action: "reconnect"
          })
        }
        
        return res.status(401).json({ 
          error: "Access token expired and refresh failed. Please reconnect your integration.",
          details: refreshErrorMsg
        })
      }

      const refreshData = await refreshResponse.json()
      const expiresIn = refreshData.expires_in || 3600
      const newExpiresAt = now + expiresIn
      const refreshedScope = refreshData.scope || tokens.scope
      
      console.log(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - ✅ Refreshed tokens successfully fetched from Fortnox!`,
        {
          has_access_token: !!refreshData.access_token,
          has_refresh_token: !!refreshData.refresh_token,
          token_type: refreshData.token_type,
          expires_in: expiresIn,
          new_expires_at: new Date(newExpiresAt * 1000).toISOString(),
          refreshed_scope: refreshedScope,
        }
      )
      const refreshedScopeLower = (refreshedScope || "").toLowerCase()
      
      if (!refreshedScopeLower.includes("customer")) {
        return res.status(403).json({ 
          error: "Refreshed token missing customer permission. Please reconnect Fortnox and ensure you grant access to customer data.",
          details: `Refreshed scope: ${refreshedScope || 'none'}. Required scope must include "customer".`,
          action: "reconnect"
        })
      }

      // Save refreshed tokens to database
      const updatedOauthData = {
        ...(integration.oauth_data || {}),
        tokens: {
          ...tokens,
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || tokens.refresh_token,
          expires_in: expiresIn,
          expires_at: newExpiresAt,
          scope: refreshedScope,
        },
      }

      const { error: updateTokenError } = await supabase
        .from("company_integrations")
        .update({ oauth_data: updatedOauthData })
        .eq("id", integration.id)

      if (updateTokenError) {
        console.error(
          `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - Error saving refreshed tokens:`,
          updateTokenError.message
        )
      } else {
        console.log(
          `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - Refreshed tokens saved to database`
        )
      }

      accessToken = refreshData.access_token
      console.log(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - Token refreshed successfully (new expiry: ${new Date(newExpiresAt * 1000).toISOString()})`
      )
    } catch (refreshError) {
      console.error(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - Error refreshing token:`,
        refreshError
      )
      return res.status(401).json({ 
        error: "Access token expired and could not be refreshed. Please reconnect your integration.",
        details: refreshError.message
      })
    }
  }

  // Check rate limit before making API call
  const rateLimitCheck = checkRateLimit(accessToken)
  if (!rateLimitCheck.allowed) {
    console.warn(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - Rate limit exceeded`
    )
    return res.status(429).json({
      error: "Rate limit exceeded",
      details: rateLimitCheck.message,
      retryAfter: rateLimitCheck.resetIn,
    })
  }

  try {
    // Build query parameters based on OpenAPI spec
    const queryParams = new URLSearchParams()
    queryParams.set("filter", "active") // Always filter active customers
    
    // Add optional filters from query parameters
    if (name) queryParams.set("name", name)
    if (email) queryParams.set("email", email)
    if (phone) queryParams.set("phone", phone)
    if (customernumber) queryParams.set("customernumber", customernumber)
    if (city) queryParams.set("city", city)
    if (zipcode) queryParams.set("zipcode", zipcode)
    
    // Sort by customer number (default behavior per OpenAPI spec)
    queryParams.set("sortby", "customernumber")
    
    const apiUrl = `https://api.fortnox.se/3/customers?${queryParams.toString()}`
    
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - Fetching from Fortnox API (rate limit: ${rateLimitCheck.remaining} remaining)`
    )
    
    // Fetch customers from Fortnox (read-only, no saving to DB)
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - 🌐 Making API call to Fortnox:`,
      {
        url: apiUrl,
        client_id: integration.client_id, // Log full client ID to verify it matches Developer Portal
        client_id_length: integration.client_id?.length,
        has_client_secret: !!integration.client_secret,
        access_token_preview: accessToken.substring(0, 20) + "...",
        token_scope: tokens?.scope,
        integration_status: integration.status,
      }
    )
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": integration.client_id,
        "Client-Secret": integration.client_secret || "",
        Accept: "application/json",
      },
    })
    
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - 📡 Fortnox API response received:`,
      {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = "Failed to fetch customers from Fortnox"
      let errorData = null
      let fortnoxErrorCode = null
      
      console.error(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - ❌ Fortnox API error response:`,
        {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500), // Limit log size
        }
      )
      
      try {
        errorData = JSON.parse(errorText)
        errorMessage = errorData.ErrorInformation?.message || errorData.message || errorMessage
        fortnoxErrorCode = errorData.ErrorInformation?.code
        
        console.error(
          `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - Parsed error data:`,
          {
            errorMessage,
            fortnoxErrorCode,
            fullErrorData: errorData,
          }
        )
      } catch (e) {
        if (errorText) {
          errorMessage = errorText
        }
        console.error(
          `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - Could not parse error as JSON:`,
          e.message
        )
      }
      
      // Handle permission errors
      if (
        response.status === 400 && 
        (errorMessage.includes("behörighet") || 
         errorMessage.includes("permission") ||
         errorMessage.includes("2001538") ||
         fortnoxErrorCode === 2001538)
      ) {
        console.error(
          `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - 🚫 Permission error detected:`,
          {
            errorMessage,
            fortnoxErrorCode,
            responseStatus: response.status,
          }
        )
        return res.status(403).json({ 
          error: "Missing permission to access customer data",
          details: "The Fortnox integration doesn't have permission to access the customer register. Please reconnect your integration and ensure you grant 'customer' permissions during the OAuth authorization. Also verify that the 'customer' scope is enabled in your Fortnox Developer Portal app settings.",
          fortnoxError: errorMessage,
          fortnoxCode: fortnoxErrorCode || 2001538,
          action: "reconnect"
        })
      }
      
      if (response.status === 401 || response.status === 403) {
        return res.status(401).json({ 
          error: "Fortnox authentication failed. Please reconnect your integration.",
          details: errorMessage
        })
      }
      
      return res.status(response.status).json({ 
        error: errorMessage,
        status: response.status,
        statusText: response.statusText,
        fortnoxError: errorMessage,
        fortnoxCode: fortnoxErrorCode
      })
    }

    const data = await response.json()
    const customers = data.Customers || data.customers || []

    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - Success: Found ${customers.length} active customers`
    )

    return res.json({ 
      customers: customers,
      count: customers.length,
      read_only: true,
    })
  } catch (e) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - Unexpected error:`,
      e
    )
    return res.status(500).json({ 
      error: "Unexpected error while fetching customers from Fortnox",
      details: e.message 
    })
  }
}

async function getFortnoxCompanyInfo(req, res) {
  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/company - 🚀 Request received - Fetching Company Information`
  )

  if (!supabase) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/company - Supabase not configured`
    )
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    console.warn(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/company - Unauthorized: No user in request`
    )
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/company - Error fetching profile:`,
      profileError.message
    )
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    console.warn(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/company - No company linked to profile`
    )
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const companyId = profile.company_id

  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/company - 💾 Fetching integration from database...`
  )

  const { data: integration, error: integrationError } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("tool_name", "Fortnox")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (integrationError || !integration) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/company - Integration not found or error:`,
      integrationError?.message
    )
    return res.status(400).json({ error: "Fortnox integration not configured for this company" })
  }

  const tokens = integration.oauth_data?.tokens

  if (!tokens?.access_token) {
    console.warn(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/company - No access token stored`
    )
    return res
      .status(400)
      .json({ error: "Fortnox is connected but no access token is stored. Please reconnect." })
  }

  // Check if token has companyinformation scope (works with any license)
  const grantedScope = (tokens.scope || "").toLowerCase()
  if (!grantedScope.includes("companyinformation") && !grantedScope.includes("company")) {
    console.warn(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/company - Token missing "companyinformation" scope. Granted scope: "${tokens.scope}".`
    )
    // Don't fail, just warn - some scopes might still work
  }

  // Check if token is expired and refresh if needed
  let expiresAt = tokens.expires_at
  if (typeof expiresAt === 'string') {
    expiresAt = Math.floor(new Date(expiresAt).getTime() / 1000)
  }
  const now = Math.floor(Date.now() / 1000)
  let accessToken = tokens.access_token

  // Refresh if expired or about to expire in the next 5 minutes
  if (expiresAt && now >= (expiresAt - 300)) {
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/company - Access token expired, attempting refresh...`
    )
    
    try {
      const credentials = Buffer.from(`${integration.client_id}:${integration.client_secret || ""}`).toString("base64")
      
      const refreshResponse = await fetch("https://apps.fortnox.se/oauth-v1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokens.refresh_token,
        }).toString(),
      })

      if (!refreshResponse.ok) {
        return res.status(401).json({ 
          error: "Access token expired and could not be refreshed. Please reconnect your integration.",
        })
      }

      const refreshData = await refreshResponse.json()
      const expiresIn = refreshData.expires_in || 3600
      const newExpiresAt = now + expiresIn

      // Update tokens in database
      const updatedOauthData = {
        ...(integration.oauth_data || {}),
        tokens: {
          ...tokens,
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || tokens.refresh_token,
          expires_in: expiresIn,
          expires_at: newExpiresAt,
          scope: refreshData.scope || tokens.scope,
        },
      }

      await supabase
        .from("company_integrations")
        .update({ oauth_data: updatedOauthData })
        .eq("id", integration.id)

      accessToken = refreshData.access_token
    } catch (refreshError) {
      console.error(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/company - Error refreshing token:`,
        refreshError
      )
      return res.status(401).json({ 
        error: "Access token expired and could not be refreshed. Please reconnect your integration.",
      })
    }
  }

  // Check rate limit
  const rateLimitCheck = checkRateLimit(accessToken)
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      details: rateLimitCheck.message,
      retryAfter: rateLimitCheck.resetIn,
    })
  }

  try {
    // Fetch company information from Fortnox (works with any license)
    const apiUrl = "https://api.fortnox.se/3/companyinformation"
    
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/company - 🌐 Fetching company information from Fortnox...`
    )

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": integration.client_id,
        "Client-Secret": integration.client_secret || "",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = "Failed to fetch company information from Fortnox"
      
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.ErrorInformation?.message || errorData.message || errorMessage
      } catch (e) {
        if (errorText) {
          errorMessage = errorText
        }
      }

      console.error(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/company - Fortnox API error:`,
        response.status,
        errorMessage
      )

      return res.status(response.status).json({ 
        error: errorMessage,
        status: response.status,
        statusText: response.statusText,
      })
    }

    const data = await response.json()
    const companyInfo = data.CompanyInformation || data.companyinformation || data

    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/company - ✅ Successfully fetched company information`
    )

    return res.json({ 
      companyInformation: companyInfo,
      read_only: true,
    })
  } catch (e) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/company - Unexpected error:`,
      e
    )
    return res.status(500).json({ error: "Unexpected error while fetching company information" })
  }
}

async function getFortnoxSettings(req, res) {
  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/settings - 🚀 Request received - Fetching Settings`
  )

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.company_id) {
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("tool_name", "Fortnox")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!integration?.oauth_data?.tokens?.access_token) {
    return res.status(400).json({ error: "Fortnox integration not configured or no access token" })
  }

  const tokens = integration.oauth_data.tokens
  
  // Check if the token has the required settings scope
  const grantedScope = (tokens.scope || "").toLowerCase()
  if (!grantedScope.includes("settings")) {
    console.warn(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/settings - Token missing "settings" scope. Granted scope: "${tokens.scope}".`
    )
    // Don't fail immediately - try the API call anyway, but it will likely fail
  }
  
  // Check if token is expired and refresh if needed
  let expiresAt = tokens.expires_at
  if (typeof expiresAt === 'string') {
    expiresAt = Math.floor(new Date(expiresAt).getTime() / 1000)
  }
  const now = Math.floor(Date.now() / 1000)
  let accessToken = tokens.access_token

  // Refresh if expired or about to expire in the next 5 minutes
  if (expiresAt && now >= (expiresAt - 300)) {
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/settings - Access token expired, attempting refresh...`
    )
    
    try {
      const credentials = Buffer.from(`${integration.client_id}:${integration.client_secret || ""}`).toString("base64")
      
      const refreshResponse = await fetch("https://apps.fortnox.se/oauth-v1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokens.refresh_token,
        }).toString(),
      })

      if (!refreshResponse.ok) {
        return res.status(401).json({ 
          error: "Access token expired and could not be refreshed. Please reconnect your integration.",
        })
      }

      const refreshData = await refreshResponse.json()
      const expiresIn = refreshData.expires_in || 3600
      const newExpiresAt = now + expiresIn

      // Update tokens in database
      const updatedOauthData = {
        ...(integration.oauth_data || {}),
        tokens: {
          ...tokens,
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || tokens.refresh_token,
          expires_in: expiresIn,
          expires_at: newExpiresAt,
          scope: refreshData.scope || tokens.scope,
        },
      }

      await supabase
        .from("company_integrations")
        .update({ oauth_data: updatedOauthData })
        .eq("id", integration.id)

      accessToken = refreshData.access_token
    } catch (refreshError) {
      console.error(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/settings - Error refreshing token:`,
        refreshError
      )
      return res.status(401).json({ 
        error: "Access token expired and could not be refreshed. Please reconnect your integration.",
      })
    }
  }

  const rateLimitCheck = checkRateLimit(accessToken)
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({ error: "Rate limit exceeded", details: rateLimitCheck.message })
  }

  try {
    // Use the correct endpoint: /3/settings/company (not /3/settings)
    const response = await fetch("https://api.fortnox.se/3/settings/company", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": integration.client_id,
        "Client-Secret": integration.client_secret || "",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = "Failed to fetch settings"
      let errorData = null
      
      try {
        errorData = JSON.parse(errorText)
        errorMessage = errorData.ErrorInformation?.message || errorData.message || errorMessage
        console.error(
          `[${new Date().toISOString()}] GET /api/integrations/fortnox/settings - Fortnox API error:`,
          {
            status: response.status,
            statusText: response.statusText,
            errorMessage,
            errorCode: errorData.ErrorInformation?.code,
            fullError: errorData
          }
        )
      } catch (e) {
        console.error(
          `[${new Date().toISOString()}] GET /api/integrations/fortnox/settings - Fortnox API error (non-JSON):`,
          {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText.substring(0, 500)
          }
        )
      }
      
      return res.status(response.status).json({ 
        error: errorMessage,
        details: errorText,
        status: response.status,
        statusText: response.statusText
      })
    }

    const data = await response.json()
    // The response structure is: { CompanySettings: { ... } }
    const settingsData = data.CompanySettings || data.Settings || data.settings || data
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/settings - ✅ Successfully fetched settings`
    )
    return res.json({ settings: settingsData, read_only: true })
  } catch (e) {
    console.error(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/settings - Unexpected error:`,
      e
    )
    return res.status(500).json({ error: "Unexpected error while fetching settings" })
  }
}

async function getFortnoxProfile(req, res) {
  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/profile - 🚀 Request received - Fetching Profile`
  )

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.company_id) {
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const { data: integration } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("tool_name", "Fortnox")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!integration?.oauth_data?.tokens?.access_token) {
    return res.status(400).json({ error: "Fortnox integration not configured or no access token" })
  }

  const tokens = integration.oauth_data.tokens
  
  // Check if token is expired and refresh if needed
  let expiresAt = tokens.expires_at
  if (typeof expiresAt === 'string') {
    expiresAt = Math.floor(new Date(expiresAt).getTime() / 1000)
  }
  const now = Math.floor(Date.now() / 1000)
  let accessToken = tokens.access_token

  // Refresh if expired or about to expire in the next 5 minutes
  if (expiresAt && now >= (expiresAt - 300)) {
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/profile - Access token expired, attempting refresh...`
    )
    
    try {
      const credentials = Buffer.from(`${integration.client_id}:${integration.client_secret || ""}`).toString("base64")
      
      const refreshResponse = await fetch("https://apps.fortnox.se/oauth-v1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokens.refresh_token,
        }).toString(),
      })

      if (!refreshResponse.ok) {
        return res.status(401).json({ 
          error: "Access token expired and could not be refreshed. Please reconnect your integration.",
        })
      }

      const refreshData = await refreshResponse.json()
      const expiresIn = refreshData.expires_in || 3600
      const newExpiresAt = now + expiresIn

      // Update tokens in database
      const updatedOauthData = {
        ...(integration.oauth_data || {}),
        tokens: {
          ...tokens,
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || tokens.refresh_token,
          expires_in: expiresIn,
          expires_at: newExpiresAt,
          scope: refreshData.scope || tokens.scope,
        },
      }

      await supabase
        .from("company_integrations")
        .update({ oauth_data: updatedOauthData })
        .eq("id", integration.id)

      accessToken = refreshData.access_token
    } catch (refreshError) {
      console.error(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/profile - Error refreshing token:`,
        refreshError
      )
      return res.status(401).json({ 
        error: "Access token expired and could not be refreshed. Please reconnect your integration.",
      })
    }
  }

  const rateLimitCheck = checkRateLimit(accessToken)
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({ error: "Rate limit exceeded", details: rateLimitCheck.message })
  }

  // NOTE: Fortnox API doesn't have a /3/profile endpoint
  // The "profile" scope is for user profile information during OAuth, not an API endpoint
  // Return an informative error instead
  console.warn(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/profile - ⚠️ Profile endpoint not available in Fortnox API`
  )
  return res.status(404).json({ 
    error: "Profile endpoint not available",
    details: "The Fortnox API does not have a /3/profile endpoint. The 'profile' scope is used for OAuth authorization only, not for fetching profile data via API.",
    read_only: true
  })
}

async function upsertPlans(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/plans - Request received`)

  if (!supabase) {
    console.error(`[${new Date().toISOString()}] POST /api/plans - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    console.warn(`[${new Date().toISOString()}] POST /api/plans - Unauthorized: No user in request`)
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { plans } = req.body || {}

  if (!Array.isArray(plans) || plans.length === 0) {
    console.warn(`[${new Date().toISOString()}] POST /api/plans - Bad request: plans array is required`)
    return res.status(400).json({ error: "plans array is required" })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(`[${new Date().toISOString()}] POST /api/plans - Error fetching profile:`, profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    console.warn(`[${new Date().toISOString()}] POST /api/plans - No company linked to profile`)
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const companyId = profile.company_id

  const rows = plans.map((p) => ({
    company_id: companyId,
    tool_name: p.tool_name,
    current_plan: p.current_plan || null,
    seats: p.seats || null,
    price_per_seat: p.price_per_seat || null,
    billing_cycle: p.billing_cycle || null,
    renewal_date: p.renewal_date || null,
    add_ons: p.add_ons || null,
  }))

  const { data, error } = await supabase
    .from("company_plans")
    .upsert(rows)
    .select()

  if (error) {
    console.error(`[${new Date().toISOString()}] POST /api/plans - Error upserting plans:`, error.message)
    return res.status(500).json({ error: error.message })
  }

  return res.json({ plans: data })
}

async function getPlans(req, res) {
  console.log(`[${new Date().toISOString()}] GET /api/plans - Request received`)

  if (!supabase) {
    console.error(`[${new Date().toISOString()}] GET /api/plans - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    console.warn(`[${new Date().toISOString()}] GET /api/plans - Unauthorized: No user in request`)
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(`[${new Date().toISOString()}] GET /api/plans - Error fetching profile:`, profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    console.log(`[${new Date().toISOString()}] GET /api/plans - No company linked to profile`)
    return res.json({ plans: [] })
  }

  const { data, error } = await supabase
    .from("company_plans")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("tool_name", { ascending: true })

  if (error) {
    console.error(`[${new Date().toISOString()}] GET /api/plans - Error fetching plans:`, error.message)
    return res.status(500).json({ error: error.message })
  }

  return res.json({ plans: data || [] })
}

async function upsertAlerts(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/alerts - Request received`)

  if (!supabase) {
    console.error(`[${new Date().toISOString()}] POST /api/alerts - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    console.warn(`[${new Date().toISOString()}] POST /api/alerts - Unauthorized: No user in request`)
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { email_for_alerts, slack_channel, alert_types, frequency } = req.body || {}

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(`[${new Date().toISOString()}] POST /api/alerts - Error fetching profile:`, profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    console.warn(`[${new Date().toISOString()}] POST /api/alerts - No company linked to profile`)
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const companyId = profile.company_id

  const { data, error } = await supabase
    .from("company_alerts")
    .upsert(
      {
        company_id: companyId,
        email_for_alerts,
        slack_channel,
        alert_types: alert_types || null,
        frequency: frequency || null,
      },
      { onConflict: "company_id" }
    )
    .select()
    .maybeSingle()

  if (error) {
    console.error(`[${new Date().toISOString()}] POST /api/alerts - Error upserting alerts:`, error.message)
    return res.status(500).json({ error: error.message })
  }

  return res.json({ alerts: data })
}

async function getAlerts(req, res) {
  console.log(`[${new Date().toISOString()}] GET /api/alerts - Request received`)

  if (!supabase) {
    console.error(`[${new Date().toISOString()}] GET /api/alerts - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    console.warn(`[${new Date().toISOString()}] GET /api/alerts - Unauthorized: No user in request`)
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(`[${new Date().toISOString()}] GET /api/alerts - Error fetching profile:`, profileError.message)
    return res.status(500).json({ error: profileError.message })
  }

  if (!profile?.company_id) {
    console.log(`[${new Date().toISOString()}] GET /api/alerts - No company linked to profile`)
    return res.json({ alerts: null })
  }

  const { data, error } = await supabase
    .from("company_alerts")
    .select("*")
    .eq("company_id", profile.company_id)
    .maybeSingle()

  if (error) {
    console.error(`[${new Date().toISOString()}] GET /api/alerts - Error fetching alerts:`, error.message)
    return res.status(500).json({ error: error.message })
  }

  return res.json({ alerts: data || null })
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
  completeOnboarding,
  getCustomerDetailsAdmin,
  upsertCompany,
  getCompany,
  upsertIntegrations,
  getIntegrations,
  deleteIntegration,
  // Fortnox OAuth + sync
  startFortnoxOAuth,
  fortnoxOAuthCallback,
  syncFortnoxCustomers,
  getFortnoxCustomers,
  getFortnoxCompanyInfo,
  getFortnoxSettings,
  getFortnoxProfile,
  // Plans & alerts
  upsertPlans,
  getPlans,
  upsertAlerts,
  getAlerts,
}


