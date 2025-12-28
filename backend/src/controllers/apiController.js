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
    .select("id, email, full_name, role, created_at")
    .eq("role", "admin")
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

  // Fetch profiles first
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, company_id, created_at, onboarding_completed")
    .eq("role", "user")
    .range(0, 49)
    .order("created_at", { ascending: false })

  if (profilesError) {
    console.error(`[${new Date().toISOString()}] GET /api/admin/customers - Error fetching profiles:`, profilesError.message)
    return res.status(500).json({ error: profilesError.message })
  }

  if (!profiles || profiles.length === 0) {
    console.log(`[${new Date().toISOString()}] GET /api/admin/customers - No customers found`)
    return res.json({ customers: [] })
  }

  // Get unique company IDs
  const companyIds = [...new Set(profiles.map(p => p.company_id).filter(Boolean))]
  
  // Fetch companies separately to avoid relationship ambiguity
  let companiesMap = new Map()
  if (companyIds.length > 0) {
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name, size, industry")
      .in("id", companyIds)

    if (companiesError) {
      console.warn(`[${new Date().toISOString()}] GET /api/admin/customers - Error fetching companies:`, companiesError.message)
    } else if (companies) {
      companies.forEach(company => {
        companiesMap.set(company.id, company)
      })
    }
  }

  // Fetch subscriptions with plan catalog for all users
  // Note: Since plan_tier is a text reference (not a UUID FK), we fetch separately
  const userIds = profiles.map(p => p.id)
  let subscriptionsMap = new Map()
  if (userIds.length > 0) {
    // First, fetch all subscriptions for these users
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select("id, user_id, company_id, plan_tier, status, amount_cents, current_period_start, current_period_end, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false })

    if (subscriptionsError) {
      console.warn(`[${new Date().toISOString()}] GET /api/admin/customers - Error fetching subscriptions:`, subscriptionsError.message)
    } else if (subscriptions && subscriptions.length > 0) {
      // Fetch plan catalog data for all unique plan tiers
      const planTiers = [...new Set(subscriptions.map(s => s.plan_tier).filter(Boolean))]
      let planCatalogMap = new Map()
      if (planTiers.length > 0) {
        const { data: plans, error: plansError } = await supabase
          .from("plan_catalog")
          .select("tier, name, price_monthly_cents, price_annual_cents, included_tokens, max_integrations, features")
          .in("tier", planTiers)

        if (plansError) {
          console.warn(`[${new Date().toISOString()}] GET /api/admin/customers - Error fetching plan catalog:`, plansError.message)
        } else if (plans) {
          plans.forEach(plan => {
            planCatalogMap.set(plan.tier, plan)
          })
        }
      }

      // Group by user_id, taking the most recent subscription per user
      // and attach plan catalog data
      subscriptions.forEach(sub => {
        if (!subscriptionsMap.has(sub.user_id)) {
          const planCatalog = planCatalogMap.get(sub.plan_tier) || null
          subscriptionsMap.set(sub.user_id, {
            ...sub,
            plan_catalog: planCatalog
          })
        }
      })
    }
  }

  // Combine profiles with their companies and subscriptions
  const customers = profiles.map(profile => {
    const subscription = subscriptionsMap.get(profile.id) || null
    const planCatalog = subscription?.plan_catalog || null
    
    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      created_at: profile.created_at,
      onboarding_completed: profile.onboarding_completed,
      company: profile.company_id ? companiesMap.get(profile.company_id) || null : null,
      subscription: subscription ? {
        id: subscription.id,
        plan_tier: subscription.plan_tier,
        status: subscription.status,
        amount_cents: subscription.amount_cents,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        plan_name: planCatalog?.name || subscription.plan_tier || "Free",
        plan_price_monthly_cents: planCatalog?.price_monthly_cents || 0,
        plan_price_annual_cents: planCatalog?.price_annual_cents || null,
        plan_included_tokens: planCatalog?.included_tokens || 0,
        plan_max_integrations: planCatalog?.max_integrations || null,
        plan_features: planCatalog?.features || null,
      } : null,
    }
  })

  console.log(`[${new Date().toISOString()}] GET /api/admin/customers - Success: Found ${customers.length} customers`)
  res.json({ customers })
}

async function getAllSubscriptions(req, res) {
  console.log(`[${new Date().toISOString()}] GET /api/admin/subscriptions - Request received`)

  if (!supabase) {
    console.error(`[${new Date().toISOString()}] GET /api/admin/subscriptions - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    console.warn(`[${new Date().toISOString()}] GET /api/admin/subscriptions - Unauthorized: No user in request`)
    return res.status(401).json({ error: "Unauthorized" })
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error(`[${new Date().toISOString()}] GET /api/admin/subscriptions - Error checking user role:`, profileError.message)
    return res.status(500).json({ error: "Failed to verify user permissions" })
  }

  if (!profile || profile.role !== "admin") {
    console.warn(`[${new Date().toISOString()}] GET /api/admin/subscriptions - Forbidden: User ${user.id} is not an admin`)
    return res.status(403).json({ error: "Forbidden: Admin access required" })
  }

  try {
    // Fetch all subscriptions with related data
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select("id, user_id, company_id, plan_tier, status, amount_cents, currency, current_period_start, current_period_end, created_at, updated_at")
      .order("created_at", { ascending: false })

    if (subscriptionsError) {
      console.error(`[${new Date().toISOString()}] GET /api/admin/subscriptions - Error fetching subscriptions:`, subscriptionsError)
      return res.status(500).json({ 
        error: "Failed to fetch subscriptions",
        details: subscriptionsError.message,
        code: subscriptionsError.code
      })
    }

  if (!subscriptions || subscriptions.length === 0) {
    console.log(`[${new Date().toISOString()}] GET /api/admin/subscriptions - No subscriptions found`)
    return res.json({ subscriptions: [] })
  }

  // Get unique user IDs and company IDs
  const userIds = [...new Set(subscriptions.map(s => s.user_id).filter(Boolean))]
  const companyIds = [...new Set(subscriptions.map(s => s.company_id).filter(Boolean))]
  const planTiers = [...new Set(subscriptions.map(s => s.plan_tier).filter(Boolean))]

  // Fetch users/profiles
  let usersMap = new Map()
  if (userIds && userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name, company_id")
      .in("id", userIds)

    if (profilesError) {
      console.warn(`[${new Date().toISOString()}] GET /api/admin/subscriptions - Error fetching profiles:`, profilesError.message)
    } else if (profiles) {
      profiles.forEach(profile => {
        usersMap.set(profile.id, profile)
      })
    }
  }

  // Fetch companies
  let companiesMap = new Map()
  if (companyIds && companyIds.length > 0) {
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", companyIds)

    if (companiesError) {
      console.warn(`[${new Date().toISOString()}] GET /api/admin/subscriptions - Error fetching companies:`, companiesError.message)
    } else if (companies) {
      companies.forEach(company => {
        companiesMap.set(company.id, company)
      })
    }
  }

  // Fetch plan catalog
  let planCatalogMap = new Map()
  if (planTiers && planTiers.length > 0) {
    const { data: plans, error: plansError } = await supabase
      .from("plan_catalog")
      .select("tier, name, price_monthly_cents")
      .in("tier", planTiers)

    if (plansError) {
      console.warn(`[${new Date().toISOString()}] GET /api/admin/subscriptions - Error fetching plan catalog:`, plansError.message)
    } else if (plans) {
      plans.forEach(plan => {
        planCatalogMap.set(plan.tier, plan)
      })
    }
  }

  // Combine subscriptions with related data
  const subscriptionsWithDetails = subscriptions.map(sub => {
    const profile = usersMap.get(sub.user_id)
    const company = sub.company_id ? companiesMap.get(sub.company_id) : null
    const planCatalog = planCatalogMap.get(sub.plan_tier)

    return {
      id: sub.id,
      user_id: sub.user_id,
      company_id: sub.company_id,
      company_name: company?.name || profile?.email || "Unknown",
      user_email: profile?.email || "Unknown",
      user_name: profile?.full_name || null,
      plan_tier: sub.plan_tier,
      plan_name: planCatalog?.name || sub.plan_tier || "Free",
      status: sub.status,
      amount_cents: sub.amount_cents || planCatalog?.price_monthly_cents || 0,
      currency: sub.currency || "usd",
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      created_at: sub.created_at,
      updated_at: sub.updated_at,
    }
  })

    console.log(`[${new Date().toISOString()}] GET /api/admin/subscriptions - Success: Found ${subscriptionsWithDetails.length} subscriptions`)
    return res.json({ subscriptions: subscriptionsWithDetails })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] GET /api/admin/subscriptions - Unexpected error:`, error)
    return res.status(500).json({ 
      error: "Internal server error",
      details: error.message || "An unexpected error occurred"
    })
  }
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
  // Validate role - schema only allows 'user' or 'admin'
  let role = user.user_metadata?.role || "user"
  if (role !== "user" && role !== "admin") {
    role = "user"
  }
  const fullName = user.user_metadata?.name || null

  console.log(`[${new Date().toISOString()}] POST /api/profiles/create - Profile data:`, {
    id: user.id,
    email: user.email,
    full_name: fullName,
    role,
  })

  // Create profile entry (matching new schema: id, email, full_name, role, company_id, onboarding_completed)
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
  // Validate role - schema only allows 'user' or 'admin'
  let role = u.user_metadata?.role || "user"
  if (role !== "user" && role !== "admin") {
    role = "user"
  }
  const fullName = u.user_metadata?.name || null

  console.log(`[${new Date().toISOString()}] POST /api/profiles/create-public - Creating profile with data:`, {
    id: u.id,
    email: u.email,
    full_name: fullName,
    role,
  })

  // Create profile entry (matching new schema: id, email, full_name, role, company_id, onboarding_completed)
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
    console.error(`[${new Date().toISOString()}] POST /api/profiles/create-public - Error creating profile:`, profileError.message)
    console.error(`[${new Date().toISOString()}] POST /api/profiles/create-public - Full error:`, profileError)
    return res.status(500).json({ error: profileError.message })
  }

  console.log(`[${new Date().toISOString()}] POST /api/profiles/create-public - Profile created successfully for user: ${u.id}`)
  console.log(`[${new Date().toISOString()}] POST /api/profiles/create-public - Created profile:`, profile)
  return res.json({ profile, message: "Profile created successfully" })
}

async function updateProfilePublic(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-public - Request received`)
  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-public - Request body:`, req.body)
  
  if (!supabase) {
    console.error(`[${new Date().toISOString()}] POST /api/profiles/update-public - Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const { userId, full_name, role } = req.body || {}

  if (!userId) {
    console.warn(`[${new Date().toISOString()}] POST /api/profiles/update-public - Bad request: userId is required`)
    return res.status(400).json({ error: "userId is required" })
  }

  // Build update object with only provided fields
  const updateData = {}
  if (full_name !== undefined) updateData.full_name = full_name || null
  if (role !== undefined) updateData.role = role

  if (Object.keys(updateData).length === 0) {
    console.warn(`[${new Date().toISOString()}] POST /api/profiles/update-public - Bad request: no fields to update`)
    return res.status(400).json({ error: "At least one field (full_name or role) must be provided" })
  }

  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-public - Updating profile for user: ${userId}`, updateData)

  // Update profile (profile should exist via trigger, but handle case where it doesn't)
  const { data: profile, error: updateError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId)
    .select()
    .maybeSingle()

  if (updateError) {
    console.error(`[${new Date().toISOString()}] POST /api/profiles/update-public - Error updating profile:`, updateError.message)
    return res.status(500).json({ error: updateError.message })
  }

  if (!profile) {
    console.warn(`[${new Date().toISOString()}] POST /api/profiles/update-public - Profile not found for user: ${userId}`)
    return res.status(404).json({ error: "Profile not found. It should be created automatically on signup." })
  }

  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-public - Profile updated successfully for user: ${userId}`)
  return res.json({ profile, message: "Profile updated successfully" })
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

  // In the new schema, email verification is handled by Supabase auth
  // Just ensure profile exists and email is synced
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", user.id)
    .maybeSingle()

  if (!existingProfile) {
    console.warn(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - Profile not found for user: ${user.id}`)
    return res.status(404).json({ error: "Profile not found" })
  }

  // Update email if it changed
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
      console.error(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - Error updating profile:`, updateError.message)
      return res.status(500).json({ error: updateError.message })
    }

    console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - Profile email synced for user: ${user.id}`)
    return res.json({ profile, message: "Email verified - profile updated" })
  }

  // Profile exists and email is already synced
  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified - Email verified for user: ${user.id}`)
  return res.json({ profile: existingProfile, message: "Email verified successfully" })
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
    .select("id, email, full_name, role")
    .eq("id", u.id)
    .maybeSingle()

  if (checkError) {
    console.error(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Error checking profile:`, checkError.message)
    return res.status(500).json({ error: checkError.message })
  }

  if (!existingProfile) {
    console.warn(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Profile not found for user: ${u.id}, creating it now`)
    
    // Create profile if it doesn't exist (matching new schema)
    // Validate role - schema only allows 'user' or 'admin'
    let role = u.user_metadata?.role || "user"
    if (role !== "user" && role !== "admin") {
      role = "user"
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
      console.error(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Error creating profile:`, createError.message)
      return res.status(500).json({ error: createError.message })
    }

    console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Profile created for user: ${u.id}`)
    return res.json({ profile: newProfile, message: "Profile created successfully" })
  }

  // Profile exists - email verification is handled by Supabase auth
  // In the new schema, we don't track email_verified in profiles table
  // Just ensure email is synced if it changed
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
      console.error(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Error updating profile:`, updateError.message)
      return res.status(500).json({ error: updateError.message })
    }

    console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Profile email synced for user: ${u.id}`)
    return res.json({ profile, message: "Email verified - profile updated" })
  }

  // Profile exists and email is already synced
  console.log(`[${new Date().toISOString()}] POST /api/profiles/update-email-verified-public - Email verified for user: ${u.id}`)
  return res.json({ profile: existingProfile, message: "Email verified successfully" })
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
  // Validate role - schema only allows 'user' or 'admin'
  let profileRole = role || u.user_metadata?.role || "user"
  if (profileRole !== "user" && profileRole !== "admin") {
    profileRole = "user"
  }

  console.log(`[${new Date().toISOString()}] POST /api/admin/profiles/approve - Approving profile for user: ${u.email} with role: ${profileRole}`)

  const { data: upserted, error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.name || u.email || "",
        role: profileRole,
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
        user_id: user.id,
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
    // Map tool_name to provider (schema uses 'provider' not 'tool_name')
    const provider = i.tool_name || i.provider
    
    if (!provider) {
      throw new Error("Integration must have either 'tool_name' or 'provider' field")
    }

    // Validate Fortnox Client ID if it's a Fortnox integration
    if (provider === "Fortnox" && i.client_id) {
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
    
    // Store all additional fields in settings jsonb
    // Schema: provider (text), settings (jsonb), status (text)
    const settings = {
      connection_type: i.connection_type || "api_key",
      environment: i.environment || "production",
      oauth_data: i.oauth_data || null,
      api_key: i.api_key || null,
      client_id: i.client_id || null,
      client_secret: i.client_secret || null,
      webhook_url: i.webhook_url || null,
      // Preserve any other fields that might be passed
      ...(i.settings || {}),
    }
    
    return {
      company_id: companyId,
      provider: provider,
      settings: settings,
      status: i.status || "connected",
    }
  })

  // Handle each integration separately to avoid schema cache issues
  const results = []
  for (const row of rows) {
    // Check if integration already exists
    const { data: existing, error: checkError } = await supabase
      .from("company_integrations")
      .select("id, settings")
      .eq("company_id", row.company_id)
      .eq("provider", row.provider)
      .maybeSingle()

    if (checkError) {
      console.error(`[${new Date().toISOString()}] POST /api/integrations - Error checking existing integration:`, checkError.message)
      return res.status(500).json({ error: checkError.message })
    }

    let result
    if (existing) {
      // Update existing - merge settings
      const currentSettings = existing.settings || {}
      const mergedSettings = {
        ...currentSettings,
        ...row.settings,
      }
      
      const { data: updated, error: updateError } = await supabase
        .from("company_integrations")
        .update({
          settings: mergedSettings,
          status: row.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id, company_id, provider, settings, status, created_at, updated_at")
        .single()
      
      if (updateError) {
        console.error(`[${new Date().toISOString()}] POST /api/integrations - Error updating integration:`, updateError.message)
        return res.status(500).json({ error: updateError.message })
      }
      result = updated
    } else {
      // Insert new
      const { data: inserted, error: insertError } = await supabase
        .from("company_integrations")
        .insert({
          company_id: row.company_id,
          provider: row.provider,
          settings: row.settings,
          status: row.status,
        })
        .select("id, company_id, provider, settings, status, created_at, updated_at")
        .single()
      
      if (insertError) {
        console.error(`[${new Date().toISOString()}] POST /api/integrations - Error inserting integration:`, insertError.message)
        return res.status(500).json({ error: insertError.message })
      }
      result = inserted
    }
    results.push(result)
  }

  console.log(`[${new Date().toISOString()}] POST /api/integrations - Successfully saved ${results.length} integration(s)`)
  if (results.length > 0) {
    console.log(`[${new Date().toISOString()}] POST /api/integrations - Sample integration:`, {
      id: results[0].id,
      provider: results[0].provider,
      has_settings: !!results[0].settings,
      has_client_id: !!(results[0].settings?.client_id),
    })
  }

  return res.json({ integrations: results })
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

  // Map provider to tool_name for backward compatibility with frontend
  // Also extract settings fields to top level for easier access
  const mappedIntegrations = (data || []).map((integration) => {
    const settings = integration.settings || {}
    return {
      ...integration,
      tool_name: integration.provider, // Map provider to tool_name for backward compatibility
      connection_type: settings.connection_type || "api_key",
      environment: settings.environment || "production",
      oauth_data: settings.oauth_data || null,
      api_key: settings.api_key || null,
      client_id: settings.client_id || null,
      client_secret: settings.client_secret || null,
      webhook_url: settings.webhook_url || null,
    }
  })

  return res.json({ integrations: mappedIntegrations })
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
    .select("id, provider, company_id")
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

  console.log(`[${new Date().toISOString()}] DELETE /api/integrations/:id - Successfully deleted integration: ${integration.provider}`)
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
    .eq("provider", "Fortnox")
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

  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - Integration found:`,
    {
      id: integration?.id,
      provider: integration?.provider,
      has_settings: !!integration?.settings,
      settings_keys: integration?.settings ? Object.keys(integration.settings) : [],
    }
  )

  // Get client_id from settings (new schema) or directly (backward compatibility)
  const settings = integration?.settings || {}
  const clientId = settings.client_id || integration?.client_id
  
  if (!integration) {
    console.warn(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - No Fortnox integration found for company ${companyId}`
    )
    return res.status(400).json({ 
      error: "Fortnox integration not found",
      details: "Please save the Fortnox integration with Client ID and Client Secret first."
    })
  }
  
  if (!clientId) {
    console.warn(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - Fortnox integration found but client_id is missing`,
      {
        integration_id: integration.id,
        has_settings: !!integration.settings,
        settings_keys: integration.settings ? Object.keys(integration.settings) : [],
      }
    )
    return res.status(400).json({ 
      error: "Fortnox Client ID not configured",
      details: "The Fortnox integration exists but Client ID is missing. Please update the integration with your Client ID and Client Secret."
    })
  }
  
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
  
  // Get environment from settings (new schema) or directly (backward compatibility)
  const environment = settings.environment || integration.environment || "sandbox"

  const redirectUri =
    process.env.FORTNOX_REDIRECT_URI ||
    "http://localhost:4000/api/integrations/fortnox/callback"

  // Fortnox OAuth: Scope is required. 
  // NOTE: Scopes must match what's enabled in your Fortnox Developer Portal app settings
  // Valid scope names per Fortnox API: "archive", "companyinformation", "inbox", "profile", "settings", etc.
  // Scopes that work with "Any" license: "archive", "companyinformation", "inbox", "profile", "settings"
  // Scopes that require licenses: "customer" (Kundfaktura/Order), "invoice" (Order/Kundfaktura), "order" (Order), etc.
  // Multiple scopes can be space-separated: "companyinformation settings profile archive inbox"
  // Set FORTNOX_OAUTH_SCOPE env var to override (default includes "Any" license scopes + cost analysis scopes)
  const scopeEnv = process.env.FORTNOX_OAUTH_SCOPE
  let scope = scopeEnv !== undefined ? scopeEnv.trim() : "companyinformation settings profile archive inbox invoice supplierinvoice bookkeeping salary article customer supplier"
  
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
  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - Accept header: "${acceptHeader}"`
  )
  
  if (acceptHeader.includes("application/json")) {
    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - Returning JSON response with URL`
    )
    return res.json({ url: authUrlString })
  }

  // If called directly in browser, redirect
  console.log(
    `[${new Date().toISOString()}] GET /api/integrations/fortnox/oauth/start - Redirecting directly to Fortnox`
  )
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
    .eq("provider", "Fortnox")
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

  // Get client_id and client_secret from settings (new schema) or directly (backward compatibility)
  const settings = integration?.settings || {}
  const clientId = settings.client_id || integration?.client_id
  const clientSecret = settings.client_secret || integration?.client_secret

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
      // Get oauth_data from settings (new schema) or directly (backward compatibility)
      ...(integration.settings?.oauth_data || integration.oauth_data || {}),
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

    // Retry saving tokens to handle transient network glitches (e.g., "gateway error: Network connection lost")
    // Get current settings to merge with oauth_data
    const currentSettings = integration.settings || {}
    const updatedSettings = {
      ...currentSettings,
      oauth_data: newOauthData,
    }
    
    const maxAttempts = 3
    let updateError = null
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const { error } = await supabase
        .from("company_integrations")
        .update({
          settings: updatedSettings,
          status: integrationStatus,
        })
        .eq("id", integration.id)

      if (!error) {
        updateError = null
        break
      }

      updateError = error
      console.error(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - ❌ Token save failed (attempt ${attempt}/${maxAttempts}):`,
        error.message || error
      )

      // Backoff before retrying
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 300))
      }
    }

    console.log(
      `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - 📊 Database update completed, checking for errors...`
    )

    if (updateError) {
      console.error(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/callback - ❌ Error saving tokens to database after retries:`,
        updateError.message || updateError,
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
    .eq("provider", "Fortnox")
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

  // Get oauth_data from settings (new schema) or directly (backward compatibility)
  const oauthData = integration.settings?.oauth_data || integration.oauth_data
  const tokens = oauthData?.tokens

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
      // Get client_id and client_secret from settings (new schema) or directly (backward compatibility)
      const settings = integration.settings || {}
      const clientId = settings.client_id || integration.client_id
      const clientSecret = settings.client_secret || integration.client_secret || ""
      
      if (!clientId) {
        throw new Error("Client ID not found in integration settings")
      }
      
      // Use Basic Auth as per Fortnox OAuth spec: Base64(ClientId:ClientSecret)
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
      
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

      // Get oauth_data from settings (new schema) or directly (backward compatibility)
      const currentOauthData = integration.settings?.oauth_data || integration.oauth_data || {}
      const updatedOauthData = {
        ...currentOauthData,
        tokens: {
          ...(currentOauthData.tokens || {}),
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || currentOauthData.tokens?.refresh_token,
          expires_in: expiresIn,
          expires_at: newExpiresAt,
          scope: refreshedScope, // Preserve/update scope
        },
      }

      // Update integration with new tokens (IMPORTANT: Save refreshed tokens to DB)
      // Store oauth_data in settings jsonb field
      const currentSettings = integration.settings || {}
      const updatedSettings = {
        ...currentSettings,
        oauth_data: updatedOauthData,
      }
      const { error: updateTokenError } = await supabase
        .from("company_integrations")
        .update({ settings: updatedSettings })
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
    
    // Get client_id and client_secret from settings (new schema) or directly (backward compatibility)
    const settings = integration.settings || {}
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        // Fortnox-specific headers – adjust if needed based on your app's configuration
        Authorization: `Bearer ${tokens.access_token}`,
        "Client-Id": settings.client_id || integration.client_id,
        "Client-Secret": settings.client_secret || integration.client_secret || "",
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
      // Get oauth_data from settings (new schema) or directly (backward compatibility)
      ...(integration.settings?.oauth_data || integration.oauth_data || {}),
      usage: {
        // Get oauth_data from settings (new schema) or directly (backward compatibility)
        ...((integration.settings?.oauth_data || integration.oauth_data)?.usage || {}),
        active_customers_count: activeCustomersCount,
        last_synced_at: lastSyncedAt,
      },
    }

    // Store oauth_data in settings jsonb field
    const currentSettings = integration.settings || {}
    const updatedSettings = {
      ...currentSettings,
      oauth_data: newOauthData,
    }
    const { error: updateError } = await supabase
      .from("company_integrations")
      .update({
        settings: updatedSettings,
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
    .eq("provider", "Fortnox")
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
      // Get oauth_data from settings (new schema) or directly (backward compatibility)
      has_oauth_data: !!(integration.settings?.oauth_data || integration.oauth_data),
    }
  )

  // Get oauth_data from settings (new schema) or directly (backward compatibility)
  const oauthData = integration.settings?.oauth_data || integration.oauth_data
  const tokens = oauthData?.tokens
  
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
      // Get client_id and client_secret from settings (new schema) or directly (backward compatibility)
      const settings = integration.settings || {}
      const clientId = settings.client_id || integration.client_id
      const clientSecret = settings.client_secret || integration.client_secret || ""
      
      if (!clientId) {
        throw new Error("Client ID not found in integration settings")
      }
      
      // Use Basic Auth as per Fortnox OAuth spec: Base64(ClientId:ClientSecret)
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
      
      console.log(
        `[${new Date().toISOString()}] GET /api/integrations/fortnox/customers - 🔑 Fetching refreshed tokens from Fortnox...`,
        {
          endpoint: "https://apps.fortnox.se/oauth-v1/token",
          grant_type: "refresh_token",
          client_id: clientId.substring(0, 8) + "...", // Log partial client ID for security
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
      // Get oauth_data from settings (new schema) or directly (backward compatibility)
      const currentOauthData = integration.settings?.oauth_data || integration.oauth_data || {}
      const updatedOauthData = {
        ...currentOauthData,
        tokens: {
          ...(currentOauthData.tokens || {}),
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || currentOauthData.tokens?.refresh_token,
          expires_in: expiresIn,
          expires_at: newExpiresAt,
          scope: refreshedScope,
        },
      }
      
      // Store in settings jsonb field
      const currentSettings = integration.settings || {}
      const updatedSettings = {
        ...currentSettings,
        oauth_data: updatedOauthData,
      }

      const { error: updateTokenError } = await supabase
        .from("company_integrations")
        .update({ settings: updatedSettings })
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
    .eq("provider", "Fortnox")
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

  // Get oauth_data from settings (new schema) or directly (backward compatibility)
  const oauthData = integration.settings?.oauth_data || integration.oauth_data
  const tokens = oauthData?.tokens

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
      // Get oauth_data from settings (new schema) or directly (backward compatibility)
      const currentOauthData = integration.settings?.oauth_data || integration.oauth_data || {}
      const currentTokens = currentOauthData.tokens || {}
      const updatedOauthData = {
        ...currentOauthData,
        tokens: {
          ...currentTokens,
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || currentTokens.refresh_token,
          expires_in: expiresIn,
          expires_at: newExpiresAt,
          scope: refreshData.scope || currentTokens.scope,
        },
      }
      
      // Store in settings jsonb field
      const currentSettings = integration.settings || {}
      const updatedSettings = {
        ...currentSettings,
        oauth_data: updatedOauthData,
      }

      await supabase
        .from("company_integrations")
        .update({ settings: updatedSettings })
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
    .eq("provider", "Fortnox")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!integration?.oauth_data?.tokens?.access_token) {
    return res.status(400).json({ error: "Fortnox integration not configured or no access token" })
  }

  // Get oauth_data from settings (new schema) or directly (backward compatibility)
  const oauthData = integration.settings?.oauth_data || integration.oauth_data
  const tokens = oauthData?.tokens
  
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
      // Get oauth_data from settings (new schema) or directly (backward compatibility)
      const currentOauthData = integration.settings?.oauth_data || integration.oauth_data || {}
      const currentTokens = currentOauthData.tokens || {}
      const updatedOauthData = {
        ...currentOauthData,
        tokens: {
          ...currentTokens,
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || currentTokens.refresh_token,
          expires_in: expiresIn,
          expires_at: newExpiresAt,
          scope: refreshData.scope || currentTokens.scope,
        },
      }
      
      // Store in settings jsonb field
      const currentSettings = integration.settings || {}
      const updatedSettings = {
        ...currentSettings,
        oauth_data: updatedOauthData,
      }

      await supabase
        .from("company_integrations")
        .update({ settings: updatedSettings })
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
    .eq("provider", "Fortnox")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!integration?.oauth_data?.tokens?.access_token) {
    return res.status(400).json({ error: "Fortnox integration not configured or no access token" })
  }

  // Get oauth_data from settings (new schema) or directly (backward compatibility)
  const oauthData = integration.settings?.oauth_data || integration.oauth_data
  const tokens = oauthData?.tokens
  
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
      // Get oauth_data from settings (new schema) or directly (backward compatibility)
      const currentOauthData = integration.settings?.oauth_data || integration.oauth_data || {}
      const currentTokens = currentOauthData.tokens || {}
      const updatedOauthData = {
        ...currentOauthData,
        tokens: {
          ...currentTokens,
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || currentTokens.refresh_token,
          expires_in: expiresIn,
          expires_at: newExpiresAt,
          scope: refreshData.scope || currentTokens.scope,
        },
      }
      
      // Store in settings jsonb field
      const currentSettings = integration.settings || {}
      const updatedSettings = {
        ...currentSettings,
        oauth_data: updatedOauthData,
      }

      await supabase
        .from("company_integrations")
        .update({ settings: updatedSettings })
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

  // Build config object to store in jsonb field
  // The schema has: alert_type (text), config (jsonb), active (boolean)
  // We'll store the alert configuration in the config field
  const config = {
    email_for_alerts: email_for_alerts || null,
    slack_channel: slack_channel || null,
    alert_types: alert_types || null,
    frequency: frequency || null,
  }

  // For each alert type, create a separate record
  // If alert_types is an object with keys like { renewal: true, license_waste: true }
  const alertTypeKeys = alert_types && typeof alert_types === 'object' 
    ? Object.keys(alert_types).filter(key => alert_types[key] === true)
    : []

  // If no specific alert types provided, create a default "general" alert
  if (alertTypeKeys.length === 0) {
    alertTypeKeys.push("general")
  }

  const results = []
  const errors = []

  for (const alertType of alertTypeKeys) {
    // First check if alert already exists
    const { data: existing } = await supabase
      .from("company_alerts")
      .select("id")
      .eq("company_id", companyId)
      .eq("alert_type", alertType)
      .maybeSingle()

    let data, error
    if (existing) {
      // Update existing alert
      const result = await supabase
        .from("company_alerts")
        .update({
          config: config,
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .maybeSingle()
      data = result.data
      error = result.error
    } else {
      // Insert new alert
      const result = await supabase
        .from("company_alerts")
        .insert({
          company_id: companyId,
          alert_type: alertType,
          config: config,
          active: true,
        })
        .select()
        .maybeSingle()
      data = result.data
      error = result.error
    }

    if (error) {
      console.error(`[${new Date().toISOString()}] POST /api/alerts - Error upserting alert ${alertType}:`, error.message)
      errors.push({ alertType, error: error.message })
    } else if (data) {
      results.push(data)
    }
  }

  if (errors.length > 0 && results.length === 0) {
    return res.status(500).json({ error: errors[0].error, errors })
  }

  return res.json({ alerts: results, errors: errors.length > 0 ? errors : undefined })
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

// =====================================
// Fortnox Cost Analysis Endpoints
// =====================================

// Helper function to refresh token and get access token
async function refreshTokenIfNeeded(integration, tokens) {
  let expiresAt = tokens.expires_at
  if (typeof expiresAt === 'string') {
    expiresAt = Math.floor(new Date(expiresAt).getTime() / 1000)
  }
  const now = Math.floor(Date.now() / 1000)
  let accessToken = tokens.access_token

  if (expiresAt && now >= (expiresAt - 300)) {
    console.log(`[${new Date().toISOString()}] Token refresh needed`)
    
    // Get client_id and client_secret from settings (new schema) or directly (backward compatibility)
    const settings = integration.settings || {}
    const clientId = settings.client_id || integration.client_id
    const clientSecret = settings.client_secret || integration.client_secret || ""
    
    if (!clientId) {
      throw new Error("Client ID not found in integration settings")
    }
    
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
    
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
      throw new Error("Token refresh failed")
    }

    const refreshData = await refreshResponse.json()
    const expiresIn = refreshData.expires_in || 3600
    const newExpiresAt = now + expiresIn

    // Get oauth_data from settings (new schema) or directly (backward compatibility)
    const currentOauthData = integration.settings?.oauth_data || integration.oauth_data || {}
    const currentTokens = currentOauthData.tokens || {}
    const updatedOauthData = {
      ...currentOauthData,
      tokens: {
        ...currentTokens,
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token || currentTokens.refresh_token,
        expires_in: expiresIn,
        expires_at: newExpiresAt,
        scope: refreshData.scope || currentTokens.scope,
      },
    }

    // Store in settings jsonb field
    const currentSettings = integration.settings || {}
    const updatedSettings = {
      ...currentSettings,
      oauth_data: updatedOauthData,
    }
    
    await supabase
      .from("company_integrations")
      .update({ settings: updatedSettings })
      .eq("id", integration.id)

    accessToken = refreshData.access_token
  }

  return accessToken
}

// Helper function to fetch Fortnox data
async function fetchFortnoxData(endpoint, accessToken, requiredScope, scopeName) {
  const rateLimitCheck = checkRateLimit(accessToken)
  if (!rateLimitCheck.allowed) {
    throw new Error(`Rate limit exceeded: ${rateLimitCheck.message}`)
  }

  const response = await fetch(`https://api.fortnox.se/3${endpoint}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorData = {}
    try {
      errorData = JSON.parse(errorText)
    } catch (e) {
      // Not JSON
    }

    if (response.status === 403) {
      const errorMessage = errorData.ErrorInformation?.message || errorText || "Access denied"
      if (errorMessage.includes("behörighet") || errorMessage.includes("permission") || errorMessage.includes("scope")) {
        throw new Error(`Missing ${scopeName} scope: ${errorMessage}`)
      }
    }

    // Handle 400 as endpoint not available (might not exist or require different parameters)
    if (response.status === 400) {
      const errorMessage = errorData.ErrorInformation?.message || errorText || "Bad Request"
      // Check if it's a scope/permission issue (check for Swedish "behörighet" and English "permission")
      const lowerMessage = errorMessage.toLowerCase()
      if (lowerMessage.includes("behörighet") || 
          lowerMessage.includes("permission") || 
          lowerMessage.includes("scope") ||
          lowerMessage.includes("saknas") || // Swedish for "missing"
          lowerMessage.includes("missing")) {
        throw new Error(`Missing ${scopeName} scope: ${errorMessage}`)
      }
      // Otherwise, treat as endpoint not available
      throw new Error(`Endpoint not available: ${errorMessage}`)
    }

    throw new Error(`Fortnox API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

// Generic endpoint handler for Fortnox data
function createFortnoxDataHandler(endpoint, requiredScope, scopeName, dataKey) {
  return async (req, res) => {
    const endpointName = endpoint.replace(/^\//, "").replace(/\//g, "-")
    console.log(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - Request received`)

    if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured on backend" })
    }

    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError || !profile?.company_id) {
      return res.status(400).json({ error: "No company associated with this user" })
    }

    const { data: integration, error: integrationError } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("company_id", profile.company_id)
      .eq("provider", "Fortnox")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (integrationError || !integration) {
      return res.status(400).json({ error: "Fortnox integration not configured for this company" })
    }

    // Get oauth_data from settings (new schema) or directly (backward compatibility)
  const oauthData = integration.settings?.oauth_data || integration.oauth_data
  const tokens = oauthData?.tokens
    if (!tokens?.access_token) {
      return res.status(400).json({ error: "Fortnox is connected but no access token is stored. Please reconnect." })
    }

    // Check scope
    const grantedScope = (tokens.scope || "").toLowerCase()
    if (requiredScope && !grantedScope.includes(requiredScope.toLowerCase())) {
      return res.status(403).json({ 
        error: `Missing permission to access ${scopeName} data`,
        details: `The Fortnox integration doesn't have permission to access ${scopeName}. Please reconnect your integration and ensure you grant '${requiredScope}' permissions during the OAuth authorization.`,
        currentScope: tokens.scope || 'none',
        action: "reconnect"
      })
    }

    try {
      let accessToken
      try {
        accessToken = await refreshTokenIfNeeded(integration, tokens)
      } catch (refreshError) {
        console.error(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - Token refresh error:`, refreshError)
        return res.status(401).json({ 
          error: "Token refresh failed. Please reconnect your integration.",
          details: refreshError.message
        })
      }
      
      try {
        const data = await fetchFortnoxData(endpoint, accessToken, requiredScope, scopeName)
        
        // Extract the data array from Fortnox response (usually in a key like "Invoices", "SupplierInvoices", etc.)
        const result = data[dataKey] || data[dataKey.charAt(0).toUpperCase() + dataKey.slice(1)] || data
        
        return res.json({ [dataKey]: Array.isArray(result) ? result : [result] })
      } catch (fetchError) {
        // Handle scope/permission errors gracefully
        if (fetchError.message && (fetchError.message.includes("Missing") && fetchError.message.includes("scope"))) {
          console.log(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - Missing scope (expected): ${fetchError.message}`)
          return res.status(403).json({ 
            error: fetchError.message,
            action: "reconnect",
            scope_required: requiredScope
          })
        }
        // Re-throw other errors to be handled below
        throw fetchError
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - Error:`, error)
      console.error(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - Error message:`, error.message)
      console.error(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - Error stack:`, error.stack)
      
      if (error.message && (error.message.includes("Missing") && error.message.includes("scope"))) {
        return res.status(403).json({ 
          error: error.message,
          action: "reconnect",
          scope_required: requiredScope
        })
      }
      
      if (error.message.includes("Rate limit")) {
        return res.status(429).json({ error: error.message })
      }

      // Handle "endpoint not available" as 404 (not an error, just not supported)
      if (error.message.includes("Endpoint not available")) {
        return res.status(404).json({ 
          error: error.message,
          read_only: true
        })
      }

      return res.status(500).json({ 
        error: error.message || "Failed to fetch data from Fortnox",
        details: error.stack || "No additional details available"
      })
    }
  }
}

// Create endpoints for cost analysis
const getFortnoxInvoices = createFortnoxDataHandler("/invoices", "invoice", "invoice", "Invoices")
const getFortnoxSupplierInvoices = createFortnoxDataHandler("/supplierinvoices", "supplierinvoice", "supplier invoice", "SupplierInvoices")
// Note: Fortnox API may not have a direct /expenses endpoint
// Expenses might be accessed through salary transactions or other endpoints
// For now, we'll try /expenses but handle 404/400 gracefully
const getFortnoxExpenses = createFortnoxDataHandler("/expenses", "salary", "expense", "Expenses")
const getFortnoxVouchers = createFortnoxDataHandler("/vouchers", "bookkeeping", "voucher", "Vouchers")
const getFortnoxAccounts = createFortnoxDataHandler("/accounts", "bookkeeping", "account", "Accounts")
const getFortnoxArticles = createFortnoxDataHandler("/articles", "article", "article", "Articles")
const getFortnoxSuppliers = createFortnoxDataHandler("/suppliers", "supplier", "supplier", "Suppliers")

// Cost leak analysis endpoint
const { analyzeCostLeaks } = require("../services/costLeakAnalysis")

async function analyzeFortnoxCostLeaks(req, res) {
  const endpointName = "cost-leaks"
  console.log(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - Request received`)

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id) {
    return res.status(400).json({ error: "No company associated with this user" })
  }

  const { data: integration, error: integrationError } = await supabase
    .from("company_integrations")
    .select("*")
    .eq("company_id", profile.company_id)
    .eq("provider", "Fortnox")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (integrationError || !integration) {
    console.error(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - Integration not found`)
    return res.status(400).json({ error: "Fortnox integration not configured for this company" })
  }

  console.log(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - ✅ Integration found in database`)

  // Fetch tokens from database
  // Get oauth_data from settings (new schema) or directly (backward compatibility)
  const oauthData = integration.settings?.oauth_data || integration.oauth_data
  const tokens = oauthData?.tokens
  if (!tokens?.access_token) {
    console.error(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - No access token in database`)
    return res.status(400).json({ error: "Fortnox is connected but no access token is stored. Please reconnect." })
  }

  console.log(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - ✅ Tokens retrieved from database`)

  try {
    // Refresh token if needed (tokens are already fetched from DB above)
    const accessToken = await refreshTokenIfNeeded(integration, tokens)
    console.log(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - ✅ Access token ready`)
    
    // Fetch only invoice data (no expenses, vouchers, accounts, articles)
    const [invoicesRes, supplierInvoicesRes] = await Promise.allSettled([
      fetchFortnoxData("/invoices", accessToken, "invoice", "invoice").catch(() => ({ Invoices: [] })),
      fetchFortnoxData("/supplierinvoices", accessToken, "supplierinvoice", "supplier invoice").catch(() => ({ SupplierInvoices: [] })),
    ])

    // Extract data
    const invoices = invoicesRes.status === "fulfilled" ? (invoicesRes.value.Invoices || []) : []
    const supplierInvoices = supplierInvoicesRes.status === "fulfilled" ? (supplierInvoicesRes.value.SupplierInvoices || []) : []

    // Prepare data for analysis - only invoices
    const data = {
      invoices,
      supplierInvoices,
      // Explicitly exclude other data types to ensure only invoices are analyzed
      expenses: [],
      vouchers: [],
      accounts: [],
      articles: [],
    }

    // Run analysis
    const analysis = analyzeCostLeaks(data)
    
    console.log(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - ✅ Basic analysis completed`)
    console.log(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - Found ${analysis.overallSummary?.totalFindings || 0} findings`)

    // Enhance with AI if OpenAI is configured
    const openaiService = require("../services/openaiService")
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    
    if (OPENAI_API_KEY) {
      console.log(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - 🤖 OpenAI API key found, enhancing analysis with AI...`)
      
      try {
        // Generate AI summary
        console.log(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - Generating AI summary...`)
        const aiSummary = await openaiService.generateAnalysisSummary({
          summary: {
            totalInvoices: analysis.supplierInvoiceAnalysis?.summary?.totalInvoices || 0,
            totalAmount: analysis.supplierInvoiceAnalysis?.summary?.totalAmount || 0,
            duplicatePayments: analysis.supplierInvoiceAnalysis?.summary?.duplicatePayments || [],
            unusualAmounts: analysis.supplierInvoiceAnalysis?.summary?.unusualAmounts || [],
            recurringSubscriptions: analysis.supplierInvoiceAnalysis?.summary?.recurringSubscriptions || [],
            overdueInvoices: analysis.supplierInvoiceAnalysis?.summary?.overdueInvoices || [],
            priceIncreases: analysis.supplierInvoiceAnalysis?.summary?.priceIncreases || [],
          },
          findings: analysis.supplierInvoiceAnalysis?.findings || [],
        })
        
        if (aiSummary) {
          analysis.aiSummary = aiSummary
          console.log(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - ✅ AI summary generated`)
        }

        // Enhance findings with AI recommendations - only invoice findings
        const invoiceFindings = analysis.supplierInvoiceAnalysis?.findings || []
        
        if (invoiceFindings.length > 0) {
          console.log(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - Enhancing ${invoiceFindings.length} invoice findings with AI...`)
          const enhancedFindings = await openaiService.enhanceFindingsWithAI(invoiceFindings)
          
          // Update supplier invoice findings with AI enhancements
          if (analysis.supplierInvoiceAnalysis?.findings) {
            analysis.supplierInvoiceAnalysis.findings = enhancedFindings
            console.log(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - ✅ Enhanced ${enhancedFindings.length} invoice findings with AI`)
          }
        } else {
          console.log(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - No invoice findings to enhance`)
        }
        
        analysis.aiEnhanced = true
        analysis.enhancedAt = new Date().toISOString()
      } catch (aiError) {
        console.error(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - ⚠️ AI enhancement failed:`, aiError.message)
        // Continue without AI enhancement - return basic analysis
        analysis.aiError = aiError.message
      }
    } else {
      console.log(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - ⚠️ OpenAI API key not configured, skipping AI enhancement`)
    }

    return res.json(analysis)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] GET /api/integrations/fortnox/${endpointName} - Error:`, error.message)
    return res.status(500).json({ 
      error: error.message || "Failed to analyze cost leaks",
      details: error.stack || "No additional details available"
    })
  }
}

module.exports = {
  getRoot,
  getProfile,
  getEmployees,
  getCustomers,
  getAllSubscriptions,
  createProfile,
  createProfilePublic,
  updateProfilePublic,
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
  // Cost analysis endpoints
  getFortnoxInvoices,
  getFortnoxSupplierInvoices,
  getFortnoxExpenses,
  getFortnoxVouchers,
  getFortnoxAccounts,
  getFortnoxArticles,
  getFortnoxSuppliers,
  analyzeFortnoxCostLeaks,
  // Plans & alerts
  upsertPlans,
  getPlans,
  upsertAlerts,
  getAlerts,
}


