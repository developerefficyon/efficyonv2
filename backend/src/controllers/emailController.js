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
    // Check if user exists
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email)

    if (userError || !userData?.user) {
      // Don't reveal if user exists or not for security
      log("log", endpoint, `Password reset requested for ${email} (user may not exist)`)
      return res.json({ 
        message: "If an account exists with this email, a password reset link has been sent.",
      })
    }

    // Generate a password reset token using Supabase Admin API
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

module.exports = {
  sendVerificationEmailHandler,
  sendPasswordResetEmailHandler,
}

