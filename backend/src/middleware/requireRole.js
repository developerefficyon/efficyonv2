const { supabase } = require("../config/supabase")

/**
 * Middleware to enforce team role-based access control.
 * Must run after requireAuth (which sets req.user).
 *
 * Usage: requireRole("owner", "editor")
 */
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
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

      // Solo user (no company) — treat as owner-equivalent
      if (!profile?.company_id) {
        req.teamRole = "owner"
        return next()
      }

      const { data: member } = await supabase
        .from("team_members")
        .select("role")
        .eq("company_id", profile.company_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle()

      if (!member) {
        // No team_members row — check if user is the company creator (bootstrap case)
        const { data: company } = await supabase
          .from("companies")
          .select("user_id")
          .eq("id", profile.company_id)
          .maybeSingle()

        if (company?.user_id === user.id) {
          req.teamRole = "owner"
          return next()
        }

        return res.status(403).json({ error: "You do not have team access" })
      }

      req.teamRole = member.role

      if (!allowedRoles.includes(member.role)) {
        return res.status(403).json({
          error: "Insufficient permissions",
          message: `This action requires one of: ${allowedRoles.join(", ")}`,
          yourRole: member.role,
        })
      }

      next()
    } catch (error) {
      console.error("requireRole middleware error:", error.message)
      return res.status(500).json({ error: "Internal server error" })
    }
  }
}

module.exports = { requireRole }
