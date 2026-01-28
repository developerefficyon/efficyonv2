const { supabase, supabaseAuth } = require("../config/supabase")

function log(level, endpoint, ...args) {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${endpoint}]`
  console[level](prefix, ...args)
}

async function loginHandler(req, res) {
  const endpoint = "POST /api/auth/login"
  log("log", endpoint, "Request received")

  if (!supabaseAuth || !supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const { email, password } = req.body

  if (!email || !password) {
    log("warn", endpoint, "Missing required fields")
    return res.status(400).json({ error: "Email and password are required" })
  }

  try {
    // Verify credentials using anon client (no session persistence)
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      log("warn", endpoint, "Login failed:", error.message)

      if (error.message?.includes("Email not confirmed")) {
        return res.status(401).json({ error: "EMAIL_NOT_CONFIRMED" })
      }
      return res.status(401).json({ error: "INVALID_CREDENTIALS" })
    }

    if (!data.user) {
      log("warn", endpoint, "No user returned after login")
      return res.status(401).json({ error: "INVALID_CREDENTIALS" })
    }

    const user = data.user

    // Check email confirmation
    if (!user.email_confirmed_at) {
      log("warn", endpoint, "Email not confirmed for:", email)
      return res.status(401).json({ error: "EMAIL_NOT_CONFIRMED" })
    }

    // Fetch profile using admin client (bypasses RLS)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      log("error", endpoint, "Error fetching profile:", profileError.message)
      return res.status(500).json({ error: "Failed to fetch user profile" })
    }

    if (!profile) {
      log("warn", endpoint, "Profile not found for user:", user.id)
      return res.status(404).json({ error: "PROFILE_NOT_FOUND" })
    }

    const role = profile.role || user.user_metadata?.role || "customer"
    const name = profile.full_name || user.user_metadata?.name || ""

    log("log", endpoint, `Login successful for ${email} (role: ${role})`)

    return res.json({
      id: user.id,
      email: user.email,
      name,
      role,
      onboardingCompleted: profile.onboarding_completed ?? false,
    })
  } catch (error) {
    log("error", endpoint, "Unexpected error:", error.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = {
  loginHandler,
}
