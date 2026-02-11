/**
 * Team Controller
 * Handles team member management, invitations, and role assignments
 */

const { supabase } = require("../config/supabase")
const { sendTeamInviteEmail, generateSecureToken, APP_URL } = require("../services/emailService")

const log = (level, endpoint, message, data = null) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${endpoint} - ${message}`
  if (data) {
    console[level](logMessage, data)
  } else {
    console[level](logMessage)
  }
}

/**
 * Get team member limits based on the user's subscription plan
 */
async function getTeamLimits(userId) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle()

  if (!profile?.company_id) {
    return {
      maxTeamMembers: 1,
      currentMembers: 0,
      pendingInvitations: 0,
      canAddMore: false,
      planTier: null,
      planName: null,
      companyId: null,
      error: "No company associated with user",
    }
  }

  // Resolve to company owner for subscription lookup (team members share owner's plan)
  const { data: company } = await supabase
    .from("companies")
    .select("user_id")
    .eq("id", profile.company_id)
    .maybeSingle()

  const billingUserId = company?.user_id || userId

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(`
      plan_tier,
      plan_catalog (
        tier,
        name,
        max_team_members
      )
    `)
    .eq("user_id", billingUserId)
    .in("status", ["active", "trialing", "trial_expired"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const maxTeamMembers = subscription?.plan_catalog?.max_team_members || 1
  const planTier = subscription?.plan_tier || "free"
  const planName = subscription?.plan_catalog?.name || "Free"

  const { data: members } = await supabase
    .from("team_members")
    .select("id")
    .eq("company_id", profile.company_id)
    .eq("status", "active")

  const { data: invitations } = await supabase
    .from("team_invitations")
    .select("id")
    .eq("company_id", profile.company_id)
    .eq("status", "pending")

  const currentMembers = members?.length || 0
  const pendingInvitations = invitations?.length || 0
  const canAddMore = (currentMembers + pendingInvitations) < maxTeamMembers

  return {
    maxTeamMembers,
    currentMembers,
    pendingInvitations,
    canAddMore,
    planTier,
    planName,
    companyId: profile.company_id,
  }
}

/**
 * Ensure the company owner has a team_members row (bootstrap for existing users)
 */
async function ensureOwnerMember(userId, companyId) {
  // Check if any owner exists for this company
  const { data: existingOwner } = await supabase
    .from("team_members")
    .select("id")
    .eq("company_id", companyId)
    .eq("role", "owner")
    .eq("status", "active")
    .maybeSingle()

  if (existingOwner) return

  // Get the company's original creator
  const { data: company } = await supabase
    .from("companies")
    .select("user_id")
    .eq("id", companyId)
    .maybeSingle()

  if (!company?.user_id) return

  const { error } = await supabase.from("team_members").insert({
    company_id: companyId,
    user_id: company.user_id,
    role: "owner",
    status: "active",
  })

  if (error) {
    // Ignore duplicate key errors (race condition safe)
    if (!error.message.includes("duplicate")) {
      console.error("Error bootstrapping owner member:", error.message)
    }
  }
}

/**
 * GET /api/team/members
 * Get all team members and pending invitations for the user's company
 */
async function getTeamMembers(req, res) {
  const endpoint = "GET /api/team/members"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Database not configured" })
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
      return res.json({ members: [], pendingInvitations: [], limits: { current: 0, max: 1, canAddMore: false, planTier: "free", planName: "Free", pendingInvitations: 0 } })
    }

    // Bootstrap owner if needed
    await ensureOwnerMember(user.id, profile.company_id)

    // Fetch members with profile info
    const { data: members, error: membersError } = await supabase
      .from("team_members")
      .select(`
        id, role, status, joined_at, created_at,
        user:profiles!team_members_user_id_fkey (id, email, full_name)
      `)
      .eq("company_id", profile.company_id)
      .eq("status", "active")
      .order("created_at", { ascending: true })

    if (membersError) {
      log("error", endpoint, "Error fetching members", membersError)
      return res.status(500).json({ error: membersError.message })
    }

    // Fetch pending invitations
    const { data: invitations, error: invitationsError } = await supabase
      .from("team_invitations")
      .select("id, email, role, status, created_at, expires_at")
      .eq("company_id", profile.company_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (invitationsError) {
      log("error", endpoint, "Error fetching invitations", invitationsError)
    }

    // Get limits
    const limits = await getTeamLimits(user.id)

    log("log", endpoint, `Found ${members?.length || 0} members, ${invitations?.length || 0} pending invitations`)

    return res.json({
      members: members || [],
      pendingInvitations: invitations || [],
      limits: {
        current: limits.currentMembers,
        max: limits.maxTeamMembers,
        canAddMore: limits.canAddMore,
        planTier: limits.planTier,
        planName: limits.planName,
        pendingInvitations: limits.pendingInvitations,
      },
    })
  } catch (error) {
    log("error", endpoint, "Unexpected error", error)
    return res.status(500).json({ error: error.message })
  }
}

/**
 * POST /api/team/invite
 * Invite a new team member by email
 */
async function inviteTeamMember(req, res) {
  const endpoint = "POST /api/team/invite"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Database not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { email, role } = req.body

  if (!email) {
    return res.status(400).json({ error: "Email is required" })
  }

  if (!role || !["editor", "viewer"].includes(role)) {
    return res.status(400).json({ error: "Role must be 'editor' or 'viewer'" })
  }

  try {
    // Get user's profile and company
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, full_name")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return res.status(400).json({ error: "No company associated with your account" })
    }

    // Verify requester is owner
    const { data: requesterMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("company_id", profile.company_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle()

    if (!requesterMember || requesterMember.role !== "owner") {
      return res.status(403).json({ error: "Only team owners can invite members" })
    }

    // Self-invite check
    if (email.toLowerCase() === user.email.toLowerCase()) {
      return res.status(400).json({ error: "You cannot invite yourself" })
    }

    // Check if already a member
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle()

    if (existingProfile) {
      const { data: existingMember } = await supabase
        .from("team_members")
        .select("id, status")
        .eq("company_id", profile.company_id)
        .eq("user_id", existingProfile.id)
        .eq("status", "active")
        .maybeSingle()

      if (existingMember) {
        return res.status(400).json({ error: "This person is already a team member" })
      }
    }

    // Check for duplicate pending invitation
    const { data: existingInvite } = await supabase
      .from("team_invitations")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .maybeSingle()

    if (existingInvite) {
      return res.status(400).json({ error: "An invitation has already been sent to this email" })
    }

    // Check plan limits
    const limits = await getTeamLimits(user.id)
    if (!limits.canAddMore) {
      return res.status(403).json({
        error: "Team member limit reached",
        message: `Your ${limits.planName} plan allows up to ${limits.maxTeamMembers} team members.`,
        currentMembers: limits.currentMembers,
        maxTeamMembers: limits.maxTeamMembers,
        planTier: limits.planTier,
        planName: limits.planName,
      })
    }

    // Generate invitation token
    const token = generateSecureToken()

    // Get company name
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", profile.company_id)
      .maybeSingle()

    // Insert invitation
    const { data: invitation, error: insertError } = await supabase
      .from("team_invitations")
      .insert({
        company_id: profile.company_id,
        email: email.toLowerCase(),
        role,
        token,
        invited_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      log("error", endpoint, "Error inserting invitation", insertError)
      return res.status(500).json({ error: insertError.message })
    }

    // Send invitation email
    const inviteUrl = `${APP_URL}/invite/accept?token=${token}`
    const emailResult = await sendTeamInviteEmail({
      email: email.toLowerCase(),
      inviterName: profile.full_name || user.email,
      companyName: company?.name || "your team",
      role,
      inviteUrl,
    })

    if (emailResult.error) {
      log("warn", endpoint, "Failed to send invitation email", emailResult.error)
      // Don't fail the request — invitation is created, email can be resent
    }

    log("log", endpoint, `Invitation sent to ${email} as ${role}`)

    return res.json({
      invitation,
      message: "Invitation sent successfully",
    })
  } catch (error) {
    log("error", endpoint, "Unexpected error", error)
    return res.status(500).json({ error: error.message })
  }
}

/**
 * POST /api/team/accept-invitation
 * Accept a team invitation using the token
 */
async function acceptInvitation(req, res) {
  const endpoint = "POST /api/team/accept-invitation"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Database not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { token } = req.body

  if (!token) {
    return res.status(400).json({ error: "Invitation token is required" })
  }

  try {
    // Find the invitation
    const { data: invitation, error: fetchError } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .maybeSingle()

    if (fetchError || !invitation) {
      return res.status(404).json({ error: "Invalid or expired invitation" })
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from("team_invitations")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", invitation.id)

      return res.status(400).json({ error: "This invitation has expired. Please ask the team owner to resend it." })
    }

    // Verify email matches
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(403).json({
        error: "EMAIL_MISMATCH",
        message: "This invitation was sent to a different email address",
        invitedEmail: invitation.email,
      })
    }

    // Re-check plan limits
    const { data: company } = await supabase
      .from("companies")
      .select("user_id")
      .eq("id", invitation.company_id)
      .maybeSingle()

    if (company?.user_id) {
      const limits = await getTeamLimits(company.user_id)
      if (!limits.canAddMore) {
        return res.status(403).json({ error: "The team has reached its member limit. Please ask the team owner to upgrade their plan." })
      }
    }

    // Verify the user has a profile row (required by team_members foreign key)
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle()

    if (!userProfile) {
      log("error", endpoint, `Profile not found for user ${user.id}. Creating profile.`)
      // Create a minimal profile so the foreign key works
      await supabase.from("profiles").insert({
        id: user.id,
        email: user.email,
        role: "customer",
        onboarding_completed: true,
        company_id: invitation.company_id,
      })
    } else {
      // Link user to company and mark onboarding as completed (invited users join an existing company)
      await supabase
        .from("profiles")
        .update({
          company_id: invitation.company_id,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
    }

    // Check if a team_members row already exists (e.g., previously removed member re-invited)
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id, status")
      .eq("company_id", invitation.company_id)
      .eq("user_id", user.id)
      .maybeSingle()

    let member
    if (existingMember) {
      // Reactivate existing member with the new role
      const { data: updated, error: updateError } = await supabase
        .from("team_members")
        .update({
          role: invitation.role,
          status: "active",
          invited_by: invitation.invited_by,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMember.id)
        .select()
        .single()

      if (updateError) {
        log("error", endpoint, "Error reactivating team member", updateError)
        return res.status(500).json({ error: updateError.message })
      }
      member = updated
    } else {
      // Create new team member
      const { data: created, error: memberError } = await supabase
        .from("team_members")
        .insert({
          company_id: invitation.company_id,
          user_id: user.id,
          role: invitation.role,
          invited_by: invitation.invited_by,
        })
        .select()
        .single()

      if (memberError) {
        log("error", endpoint, "Error creating team member", memberError)
        return res.status(500).json({ error: memberError.message })
      }
      member = created
    }

    // Mark invitation as accepted
    await supabase
      .from("team_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitation.id)

    log("log", endpoint, `User ${user.email} accepted invitation and joined company ${invitation.company_id}`)

    return res.json({
      member,
      message: "Successfully joined the team",
    })
  } catch (error) {
    log("error", endpoint, "Unexpected error", error)
    return res.status(500).json({ error: error.message })
  }
}

/**
 * PATCH /api/team/members/:memberId
 * Update a team member's role
 */
async function updateMemberRole(req, res) {
  const endpoint = "PATCH /api/team/members"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Database not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { memberId } = req.params
  const { role } = req.body

  if (!role || !["editor", "viewer"].includes(role)) {
    return res.status(400).json({ error: "Role must be 'editor' or 'viewer'" })
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return res.status(400).json({ error: "No company associated with your account" })
    }

    // Verify requester is owner
    const { data: requesterMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("company_id", profile.company_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle()

    if (!requesterMember || requesterMember.role !== "owner") {
      return res.status(403).json({ error: "Only team owners can change member roles" })
    }

    // Fetch target member
    const { data: targetMember } = await supabase
      .from("team_members")
      .select("id, role, company_id")
      .eq("id", memberId)
      .eq("company_id", profile.company_id)
      .eq("status", "active")
      .maybeSingle()

    if (!targetMember) {
      return res.status(404).json({ error: "Team member not found" })
    }

    if (targetMember.role === "owner") {
      return res.status(400).json({ error: "Cannot change the owner's role" })
    }

    // Update role
    const { data: updated, error: updateError } = await supabase
      .from("team_members")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", memberId)
      .select()
      .single()

    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    log("log", endpoint, `Updated member ${memberId} role to ${role}`)

    return res.json({ member: updated, message: "Role updated successfully" })
  } catch (error) {
    log("error", endpoint, "Unexpected error", error)
    return res.status(500).json({ error: error.message })
  }
}

/**
 * DELETE /api/team/members/:memberId
 * Remove a team member
 */
async function removeMember(req, res) {
  const endpoint = "DELETE /api/team/members"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Database not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { memberId } = req.params

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return res.status(400).json({ error: "No company associated with your account" })
    }

    // Verify requester is owner
    const { data: requesterMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("company_id", profile.company_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle()

    if (!requesterMember || requesterMember.role !== "owner") {
      return res.status(403).json({ error: "Only team owners can remove members" })
    }

    // Fetch target member
    const { data: targetMember } = await supabase
      .from("team_members")
      .select("id, role, user_id, company_id")
      .eq("id", memberId)
      .eq("company_id", profile.company_id)
      .eq("status", "active")
      .maybeSingle()

    if (!targetMember) {
      return res.status(404).json({ error: "Team member not found" })
    }

    if (targetMember.role === "owner") {
      return res.status(400).json({ error: "Cannot remove the team owner" })
    }

    // Soft-delete the member
    const { error: updateError } = await supabase
      .from("team_members")
      .update({ status: "removed", updated_at: new Date().toISOString() })
      .eq("id", memberId)

    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    // Clear the removed member's company_id
    await supabase
      .from("profiles")
      .update({ company_id: null, updated_at: new Date().toISOString() })
      .eq("id", targetMember.user_id)

    log("log", endpoint, `Removed member ${memberId}`)

    return res.json({ message: "Team member removed successfully" })
  } catch (error) {
    log("error", endpoint, "Unexpected error", error)
    return res.status(500).json({ error: error.message })
  }
}

/**
 * DELETE /api/team/invitations/:invitationId
 * Revoke a pending invitation
 */
async function revokeInvitation(req, res) {
  const endpoint = "DELETE /api/team/invitations"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Database not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { invitationId } = req.params

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return res.status(400).json({ error: "No company associated with your account" })
    }

    // Verify requester is owner
    const { data: requesterMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("company_id", profile.company_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle()

    if (!requesterMember || requesterMember.role !== "owner") {
      return res.status(403).json({ error: "Only team owners can revoke invitations" })
    }

    // Fetch invitation
    const { data: invitation } = await supabase
      .from("team_invitations")
      .select("id, company_id, status")
      .eq("id", invitationId)
      .eq("company_id", profile.company_id)
      .eq("status", "pending")
      .maybeSingle()

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" })
    }

    // Revoke
    const { error: updateError } = await supabase
      .from("team_invitations")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", invitationId)

    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    log("log", endpoint, `Revoked invitation ${invitationId}`)

    return res.json({ message: "Invitation revoked successfully" })
  } catch (error) {
    log("error", endpoint, "Unexpected error", error)
    return res.status(500).json({ error: error.message })
  }
}

/**
 * POST /api/team/invitations/:invitationId/resend
 * Resend a pending invitation with a new token
 */
async function resendInvitation(req, res) {
  const endpoint = "POST /api/team/invitations/resend"
  log("log", endpoint, "Request received")

  if (!supabase) {
    return res.status(500).json({ error: "Database not configured" })
  }

  const user = req.user
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { invitationId } = req.params

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, full_name")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return res.status(400).json({ error: "No company associated with your account" })
    }

    // Verify requester is owner
    const { data: requesterMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("company_id", profile.company_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle()

    if (!requesterMember || requesterMember.role !== "owner") {
      return res.status(403).json({ error: "Only team owners can resend invitations" })
    }

    // Fetch invitation
    const { data: invitation } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("id", invitationId)
      .eq("company_id", profile.company_id)
      .eq("status", "pending")
      .maybeSingle()

    if (!invitation) {
      return res.status(404).json({ error: "Invitation not found" })
    }

    // Generate new token and extend expiry
    const newToken = generateSecureToken()
    const { error: updateError } = await supabase
      .from("team_invitations")
      .update({
        token: newToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitationId)

    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    // Get company name
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", profile.company_id)
      .maybeSingle()

    // Resend email
    const inviteUrl = `${APP_URL}/invite/accept?token=${newToken}`
    const emailResult = await sendTeamInviteEmail({
      email: invitation.email,
      inviterName: profile.full_name || user.email,
      companyName: company?.name || "your team",
      role: invitation.role,
      inviteUrl,
    })

    if (emailResult.error) {
      log("warn", endpoint, "Failed to resend invitation email", emailResult.error)
    }

    log("log", endpoint, `Resent invitation ${invitationId} to ${invitation.email}`)

    return res.json({ message: "Invitation resent successfully" })
  } catch (error) {
    log("error", endpoint, "Unexpected error", error)
    return res.status(500).json({ error: error.message })
  }
}

module.exports = {
  getTeamMembers,
  inviteTeamMember,
  acceptInvitation,
  updateMemberRole,
  removeMember,
  revokeInvitation,
  resendInvitation,
}
