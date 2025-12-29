/**
 * Admin Controller
 * Handles admin-only operations: employee management, customer management, subscriptions
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

async function getEmployees(req, res) {
  const endpoint = "GET /api/admin/employees"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .eq("role", "admin")
    .range(0, 9)
    .order("created_at", { ascending: false })

  if (error) {
    log("error", endpoint, "Error:", error.message)
    return res.status(500).json({ error: error.message })
  }

  log("log", endpoint, `Success: Found ${data?.length || 0} employees`)
  res.json({ employees: data ?? [] })
}

async function getCustomers(req, res) {
  const endpoint = "GET /api/admin/customers"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  // Fetch profiles - include both 'user' and 'customer' roles (exclude admin)
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, company_id, created_at, onboarding_completed")
    .in("role", ["user", "customer"])
    .range(0, 49)
    .order("created_at", { ascending: false })

  if (profilesError) {
    log("error", endpoint, "Error fetching profiles:", profilesError.message)
    return res.status(500).json({ error: profilesError.message })
  }

  if (!profiles || profiles.length === 0) {
    log("log", endpoint, "No customers found")
    return res.json({ customers: [] })
  }

  // Get unique company IDs
  const companyIds = [...new Set(profiles.map(p => p.company_id).filter(Boolean))]

  // Fetch companies separately
  let companiesMap = new Map()
  if (companyIds.length > 0) {
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name, size, industry")
      .in("id", companyIds)

    if (companiesError) {
      log("warn", endpoint, "Error fetching companies:", companiesError.message)
    } else if (companies) {
      companies.forEach(company => {
        companiesMap.set(company.id, company)
      })
    }
  }

  // Fetch subscriptions with plan catalog for all users
  const userIds = profiles.map(p => p.id)
  let subscriptionsMap = new Map()
  if (userIds.length > 0) {
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select("id, user_id, company_id, plan_tier, status, amount_cents, current_period_start, current_period_end, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false })

    if (subscriptionsError) {
      log("warn", endpoint, "Error fetching subscriptions:", subscriptionsError.message)
    } else if (subscriptions && subscriptions.length > 0) {
      const planTiers = [...new Set(subscriptions.map(s => s.plan_tier).filter(Boolean))]
      let planCatalogMap = new Map()

      if (planTiers.length > 0) {
        const { data: plans, error: plansError } = await supabase
          .from("plan_catalog")
          .select("tier, name, price_monthly_cents, price_annual_cents, included_tokens, max_integrations, features")
          .in("tier", planTiers)

        if (plansError) {
          log("warn", endpoint, "Error fetching plan catalog:", plansError.message)
        } else if (plans) {
          plans.forEach(plan => {
            planCatalogMap.set(plan.tier, plan)
          })
        }
      }

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

  log("log", endpoint, `Success: Found ${customers.length} customers`)
  res.json({ customers })
}

async function getAllSubscriptions(req, res) {
  const endpoint = "GET /api/admin/subscriptions"
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

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    log("error", endpoint, "Error checking user role:", profileError.message)
    return res.status(500).json({ error: "Failed to verify user permissions" })
  }

  if (!profile || profile.role !== "admin") {
    log("warn", endpoint, `Forbidden: User ${user.id} is not an admin`)
    return res.status(403).json({ error: "Forbidden: Admin access required" })
  }

  try {
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select("id, user_id, company_id, plan_tier, status, amount_cents, currency, current_period_start, current_period_end, created_at, updated_at")
      .order("created_at", { ascending: false })

    if (subscriptionsError) {
      log("error", endpoint, "Error fetching subscriptions:", subscriptionsError)
      return res.status(500).json({
        error: "Failed to fetch subscriptions",
        details: subscriptionsError.message,
        code: subscriptionsError.code
      })
    }

    if (!subscriptions || subscriptions.length === 0) {
      log("log", endpoint, "No subscriptions found")
      return res.json({ subscriptions: [] })
    }

    const userIds = [...new Set(subscriptions.map(s => s.user_id).filter(Boolean))]
    const companyIds = [...new Set(subscriptions.map(s => s.company_id).filter(Boolean))]
    const planTiers = [...new Set(subscriptions.map(s => s.plan_tier).filter(Boolean))]

    let usersMap = new Map()
    if (userIds && userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, company_id")
        .in("id", userIds)

      if (!profilesError && profiles) {
        profiles.forEach(profile => {
          usersMap.set(profile.id, profile)
        })
      }
    }

    let companiesMap = new Map()
    if (companyIds && companyIds.length > 0) {
      const { data: companies, error: companiesError } = await supabase
        .from("companies")
        .select("id, name")
        .in("id", companyIds)

      if (!companiesError && companies) {
        companies.forEach(company => {
          companiesMap.set(company.id, company)
        })
      }
    }

    let planCatalogMap = new Map()
    if (planTiers && planTiers.length > 0) {
      const { data: plans, error: plansError } = await supabase
        .from("plan_catalog")
        .select("tier, name, price_monthly_cents")
        .in("tier", planTiers)

      if (!plansError && plans) {
        plans.forEach(plan => {
          planCatalogMap.set(plan.tier, plan)
        })
      }
    }

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

    log("log", endpoint, `Success: Found ${subscriptionsWithDetails.length} subscriptions`)
    return res.json({ subscriptions: subscriptionsWithDetails })
  } catch (error) {
    log("error", endpoint, "Unexpected error:", error)
    return res.status(500).json({
      error: "Internal server error",
      details: error.message || "An unexpected error occurred"
    })
  }
}

async function approveProfile(req, res) {
  const endpoint = "POST /api/admin/profiles/approve"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const requester = req.user
  const requesterRole = requester?.user_metadata?.role

  if (requesterRole !== "admin") {
    log("warn", endpoint, `Forbidden: User ${requester?.id} is not an admin`)
    return res.status(403).json({ error: "Only admins can approve profiles" })
  }

  const { userId, role } = req.body || {}

  if (!userId) {
    log("warn", endpoint, "Bad request: userId is required")
    return res.status(400).json({ error: "userId is required" })
  }

  log("log", endpoint, `Admin ${requester?.id} approving user: ${userId}`)

  const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(userId)

  if (userError || !userResult?.user) {
    log("error", endpoint, "Error fetching user:", userError?.message || "User not found")
    return res.status(404).json({ error: "Auth user not found" })
  }

  const u = userResult.user
  let profileRole = role || u.user_metadata?.role || "customer"
  if (!["user", "admin", "customer"].includes(profileRole)) {
    profileRole = "customer"
  }

  log("log", endpoint, `Approving profile for user: ${u.email} with role: ${profileRole}`)

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
    log("error", endpoint, "Error upserting profile:", upsertError.message)
    return res.status(500).json({ error: upsertError.message })
  }

  log("log", endpoint, `Profile approved successfully for user: ${u.id}`)
  return res.json({ profile: upserted })
}

async function getCustomerDetailsAdmin(req, res) {
  const endpoint = "GET /api/admin/customers/:id"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const requester = req.user
  const requesterRole = requester?.user_metadata?.role

  if (requesterRole !== "admin") {
    log("warn", endpoint, `Forbidden: User ${requester?.id} is not an admin`)
    return res.status(403).json({ error: "Only admins can view customer details" })
  }

  const { id } = req.params

  if (!id) {
    return res.status(400).json({ error: "Customer id is required" })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at, company_id, onboarding_completed")
    .eq("id", id)
    .maybeSingle()

  if (profileError) {
    log("error", endpoint, "Error fetching profile:", profileError.message)
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

module.exports = {
  getEmployees,
  getCustomers,
  getAllSubscriptions,
  approveProfile,
  getCustomerDetailsAdmin,
}
