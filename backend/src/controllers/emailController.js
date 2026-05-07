const { supabase } = require("../config/supabase")
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  APP_URL,
} = require("../services/emailService")

function log(level, endpoint, ...args) {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${endpoint}]`
  console[level](prefix, ...args)
}

async function sendVerificationEmailHandler(req, res) {
  const endpoint = "POST /api/email/send-verification"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const { email } = req.body

  if (!email) {
    log("warn", endpoint, "Missing email in request")
    return res.status(400).json({ error: "Email is required" })
  }

  try {
    // Generate a verification token using Supabase Admin API
    const { data: userData, error: userError } = await supabase.auth.admin.generateLink({
      type: "signup",
      email: email,
      options: {
        redirectTo: `${APP_URL}/auth/verify`,
      },
    })

    if (userError) {
      log("error", endpoint, "Error generating verification link:", userError.message)
      return res.status(400).json({ error: userError.message || "Failed to generate verification link" })
    }

    if (!userData?.properties?.action_link) {
      log("error", endpoint, "No action link in response")
      return res.status(500).json({ error: "Failed to generate verification link" })
    }

    const verificationUrl = userData.properties.action_link

    // Send email via Resend
    const emailResult = await sendVerificationEmail(email, verificationUrl)

    if (emailResult.error) {
      log("error", endpoint, "Error sending email:", emailResult.error)
      return res.status(500).json({ error: emailResult.error })
    }

    log("log", endpoint, `Verification email sent successfully to ${email}`)
    return res.json({ 
      message: "Verification email sent successfully",
      email: email,
    })
  } catch (error) {
    log("error", endpoint, "Unexpected error:", error.message)
    return res.status(500).json({ error: error.message || "Internal server error" })
  }
}

async function registerUserHandler(req, res) {
  const endpoint = "POST /api/auth/register"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const { email, password, name } = req.body

  if (!email || !password) {
    log("warn", endpoint, "Missing required fields")
    return res.status(400).json({ error: "Email and password are required" })
  }

  try {
    // Create user using Admin API - this does NOT send any emails
    // If user already exists, Supabase will return an error
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: false, // User must verify via Resend email
      user_metadata: {
        name: name || "",
        role: "customer",
      },
    })

    if (createError) {
      // Check if error is due to user already existing
      if (createError.message?.includes("already been registered") ||
          createError.message?.includes("already exists")) {
        log("warn", endpoint, `User already exists: ${email}`)
        return res.status(400).json({ error: "User with this email already exists" })
      }
      log("error", endpoint, "Error creating user:", createError.message)
      return res.status(400).json({ error: createError.message || "Failed to create user" })
    }

    if (!newUser?.user) {
      log("error", endpoint, "No user data returned")
      return res.status(500).json({ error: "Failed to create user" })
    }

    // Update profile with full_name if provided (profile is created by trigger, but may not have name)
    if (name && newUser.user.id) {
      try {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ full_name: name })
          .eq("id", newUser.user.id)

        if (updateError) {
          log("warn", endpoint, "Failed to update profile name:", updateError.message)
          // Non-critical, continue
        }
      } catch (profileError) {
        log("warn", endpoint, "Error updating profile:", profileError.message)
        // Non-critical, continue
      }
    }

    // Generate verification link and send via Resend
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "signup",
      email: email,
      options: {
        redirectTo: `${APP_URL}/auth/verify`,
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      log("error", endpoint, "Error generating verification link:", linkError?.message)
      // User is created, but verification link failed - return success but log error
      return res.status(500).json({ 
        error: "User created but failed to generate verification link. Please request a new verification email.",
        userId: newUser.user.id,
      })
    }

    const verificationUrl = linkData.properties.action_link

    // Send verification email via Resend
    const emailResult = await sendVerificationEmail(email, verificationUrl)

    if (emailResult.error) {
      log("error", endpoint, "Error sending verification email:", emailResult.error)
      // User is created, but email failed - return partial success
      return res.status(500).json({ 
        error: "User created but failed to send verification email. Please request a new verification email.",
        userId: newUser.user.id,
      })
    }

    log("log", endpoint, `User registered successfully: ${email}`)
    return res.json({ 
      message: "User registered successfully. Verification email sent.",
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
      },
    })
  } catch (error) {
    log("error", endpoint, "Unexpected error:", error.message)
    return res.status(500).json({ error: error.message || "Internal server error" })
  }
}

async function sendPasswordResetEmailHandler(req, res) {
  const endpoint = "POST /api/email/send-password-reset"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const { email } = req.body

  if (!email) {
    log("warn", endpoint, "Missing email in request")
    return res.status(400).json({ error: "Email is required" })
  }

  try {
    // Generate a password reset token using Supabase Admin API
    // If user doesn't exist, this will fail and we return a generic message
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: `${APP_URL}/reset-password`,
      },
    })

    if (resetError) {
      log("error", endpoint, "Error generating reset link:", resetError.message)
      // Still return success to prevent email enumeration
      return res.json({ 
        message: "If an account exists with this email, a password reset link has been sent.",
      })
    }

    if (!resetData?.properties?.action_link) {
      log("error", endpoint, "No action link in response")
      // Still return success to prevent email enumeration
      return res.json({ 
        message: "If an account exists with this email, a password reset link has been sent.",
      })
    }

    const resetUrl = resetData.properties.action_link

    // Send email via Resend
    const emailResult = await sendPasswordResetEmail(email, resetUrl)

    if (emailResult.error) {
      log("error", endpoint, "Error sending email:", emailResult.error)
      // Still return success to prevent email enumeration
      return res.json({ 
        message: "If an account exists with this email, a password reset link has been sent.",
      })
    }

    log("log", endpoint, `Password reset email sent successfully to ${email}`)
    return res.json({ 
      message: "If an account exists with this email, a password reset link has been sent.",
    })
  } catch (error) {
    log("error", endpoint, "Unexpected error:", error.message)
    // Still return success to prevent email enumeration
    return res.json({ 
      message: "If an account exists with this email, a password reset link has been sent.",
    })
  }
}

/* ──────────────────────────────────────────────────────────────
   Newsletter subscribe — public, no auth.
   Idempotent: re-subscribing reactivates a previously-unsubscribed row,
   does nothing for an already-active row.
   ────────────────────────────────────────────────────────────── */
async function newsletterSubscribeHandler(req, res) {
  const endpoint = "POST /api/email/newsletter-subscribe"
  log("log", endpoint, "Request received")

  if (!supabase) {
    log("error", endpoint, "Supabase not configured")
    return res.status(500).json({ error: "Newsletter unavailable right now" })
  }

  let { email, source } = req.body || {}

  // Validate + normalize
  if (typeof email !== "string") {
    return res.status(400).json({ error: "Email is required" })
  }
  email = email.trim().toLowerCase()

  // Lightweight email shape check — backend boundary, not a marketing tool.
  // Matches the frontend regex; real validation happens at send time.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email" })
  }

  if (email.length > 320) {
    return res.status(400).json({ error: "Email too long" })
  }

  if (typeof source === "string") {
    source = source.slice(0, 64) // bounded; the frontend self-tags freely
  } else {
    source = null
  }

  // Capture client metadata for audit, but don't leak it back to the caller.
  const ip =
    (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    null
  const userAgent = (req.headers["user-agent"] || "").toString().slice(0, 256) || null

  try {
    // Upsert by email. If the address already exists in `unsubscribed` state,
    // re-activate it. If it's already active, this becomes a no-op write.
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        {
          email,
          source,
          status: "active",
          ip_address: ip,
          user_agent: userAgent,
          unsubscribed_at: null,
        },
        { onConflict: "email" }
      )
      .select("id")
      .single()

    if (error) {
      log("error", endpoint, "Upsert failed:", error.message)
      return res.status(500).json({ error: "Could not subscribe right now" })
    }

    log("log", endpoint, "Subscribed:", email, "id:", data?.id)
    return res.json({ ok: true })
  } catch (err) {
    log("error", endpoint, "Unexpected error:", err?.message || err)
    return res.status(500).json({ error: "Could not subscribe right now" })
  }
}

/* ──────────────────────────────────────────────────────────────
   Newsletter unsubscribe — single-click via token in email footer.
   GET so it works from any email client without forms.
   ────────────────────────────────────────────────────────────── */
async function newsletterUnsubscribeHandler(req, res) {
  const endpoint = "GET /api/email/newsletter-unsubscribe"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Unsubscribe unavailable right now" })
  }

  const token = (req.query?.token || "").toString().trim()
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return res.status(400).json({ error: "Invalid unsubscribe token" })
  }

  try {
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
      .eq("unsubscribe_token", token)
      .select("id")
      .maybeSingle()

    if (error) {
      log("error", endpoint, "Update failed:", error.message)
      return res.status(500).json({ error: "Could not unsubscribe right now" })
    }
    if (!data) {
      // Token didn't match anything — return ok anyway so we don't help token-guessers
      // distinguish valid from invalid tokens.
      return res.json({ ok: true })
    }

    log("log", endpoint, "Unsubscribed id:", data.id)
    return res.json({ ok: true })
  } catch (err) {
    log("error", endpoint, "Unexpected error:", err?.message || err)
    return res.status(500).json({ error: "Could not unsubscribe right now" })
  }
}

module.exports = {
  registerUserHandler,
  sendVerificationEmailHandler,
  sendPasswordResetEmailHandler,
  newsletterSubscribeHandler,
  newsletterUnsubscribeHandler,
}

