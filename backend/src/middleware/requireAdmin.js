/**
 * Middleware to require admin role for internal testing routes.
 * Must be used after requireAuth middleware.
 */
function requireAdmin(req, res, next) {
  const role = req.user?.user_metadata?.role
  if (role !== "admin") {
    return res.status(403).json({ error: "Admin access required" })
  }
  next()
}

module.exports = { requireAdmin }
