const fs = require("fs")
const path = require("path")
const { resend } = require("../config/resend")
const crypto = require("crypto")

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"
const FROM_NAME = process.env.RESEND_FROM_NAME || "Efficyon"
const APP_URL = process.env.FRONTEND_APP_URL || "http://localhost:3000"

function loadTemplate(templateName) {
  const templatePath = path.join(__dirname, "../../email-templates", `${templateName}.html`)
  try {
    return fs.readFileSync(templatePath, "utf8")
  } catch (error) {
    console.error(`Error loading email template ${templateName}:`, error)
    return null
  }
}

function replaceTemplateVariables(template, variables) {
  let html = template
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*\\.${key}\\s*}}`, "g")
    html = html.replace(regex, value || "")
  }
  return html
}

async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.error("Resend not configured. Cannot send email.")
    return { error: "Email service not configured" }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    })

    if (error) {
      console.error("Resend error:", error)
      return { error: error.message || "Failed to send email" }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Error sending email:", error)
    return { error: error.message || "Failed to send email" }
  }
}

async function sendVerificationEmail(email, verificationUrl) {
  let template = loadTemplate("confirm-email")
  if (!template) {
    return { error: "Email template not found" }
  }

  const html = replaceTemplateVariables(template, {
    ConfirmationURL: verificationUrl,
    Email: email,
  })

  return await sendEmail({
    to: email,
    subject: "Verify Your Email - Efficyon",
    html,
  })
}

async function sendPasswordResetEmail(email, resetUrl) {
  let template = loadTemplate("reset-password")
  if (!template) {
    return { error: "Email template not found" }
  }

  const html = replaceTemplateVariables(template, {
    ConfirmationURL: resetUrl,
    Email: email,
  })

  return await sendEmail({
    to: email,
    subject: "Reset Your Password - Efficyon",
    html,
  })
}

async function sendMagicLinkEmail(email, magicLinkUrl) {
  let template = loadTemplate("magic-link")
  if (!template) {
    return { error: "Email template not found" }
  }

  const html = replaceTemplateVariables(template, {
    ConfirmationURL: magicLinkUrl,
    Email: email,
  })

  return await sendEmail({
    to: email,
    subject: "Sign In to Your Account - Efficyon",
    html,
  })
}

async function sendEmailChangeConfirmationEmail(email, newEmail, confirmationUrl) {
  let template = loadTemplate("change-email")
  if (!template) {
    return { error: "Email template not found" }
  }

  const html = replaceTemplateVariables(template, {
    ConfirmationURL: confirmationUrl,
    Email: email,
    NewEmail: newEmail,
  })

  return await sendEmail({
    to: newEmail,
    subject: "Confirm Email Change - Efficyon",
    html,
  })
}

async function sendTeamInviteEmail({ email, inviterName, companyName, role, inviteUrl }) {
  let template = loadTemplate("team-invite")
  if (!template) {
    return { error: "Email template not found" }
  }

  const roleLabels = { editor: "an Editor", viewer: "a Viewer" }
  const html = replaceTemplateVariables(template, {
    InviterName: inviterName,
    CompanyName: companyName,
    RoleLabel: roleLabels[role] || "a team member",
    InviteURL: inviteUrl,
  })

  return await sendEmail({
    to: email,
    subject: `You've been invited to join ${companyName} on Efficyon`,
    html,
  })
}

async function sendMonthlyReport({ email, companyName, reportMonth, aiSummary, recommendedAction, totalWaste, savingsRealized, changesHTML, renewalAlertsHTML, quarterlyCtaHTML }) {
  let template = loadTemplate("monthly-report")
  if (!template) {
    return { error: "Monthly report email template not found" }
  }

  const html = replaceTemplateVariables(template, {
    CompanyName: companyName || "Your Company",
    ReportMonth: reportMonth,
    AiSummary: aiSummary || "No summary available this month.",
    RecommendedAction: recommendedAction || "Log into Efficyon to review your latest analysis.",
    TotalWasteIdentified: `$${Math.round(totalWaste || 0).toLocaleString()}`,
    SavingsRealized: `$${Math.round(savingsRealized || 0).toLocaleString()}`,
    ChangesHTML: changesHTML || "",
    RenewalAlertsHTML: renewalAlertsHTML || "",
    QuarterlyCtaHTML: quarterlyCtaHTML || "",
    DashboardURL: `${APP_URL}/dashboard/reports/monthly`,
  })

  return await sendEmail({
    to: email,
    subject: `Efficyon Monthly Report — ${reportMonth}`,
    html,
  })
}

function generateSecureToken() {
  return crypto.randomBytes(32).toString("hex")
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendMagicLinkEmail,
  sendEmailChangeConfirmationEmail,
  sendTeamInviteEmail,
  sendMonthlyReport,
  generateSecureToken,
  APP_URL,
}

