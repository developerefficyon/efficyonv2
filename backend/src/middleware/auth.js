const { supabase } = require("../config/supabase")

// Simple auth middleware that validates Supabase JWT from the frontend
async function requireAuth(req, res, next) {
  const path = req.path
  const method = req.method
  
  if (!supabase) {
    console.error(`[${new Date().toISOString()}] ${method} ${path} - Auth middleware: Supabase not configured`)
    return res.status(500).json({ error: "Supabase not configured on backend" })
  }

  const authHeader = req.headers.authorization || ""
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null

  if (!token) {
    console.warn(`[${new Date().toISOString()}] ${method} ${path} - Auth middleware: Missing Authorization header`)
    return res.status(401).json({ error: "Missing Authorization header" })
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    console.warn(`[${new Date().toISOString()}] ${method} ${path} - Auth middleware: Invalid or expired token`, error?.message)
    return res.status(401).json({ error: "Invalid or expired token" })
  }

  console.log(`[${new Date().toISOString()}] ${method} ${path} - Auth middleware: Authenticated user ${user.id} (${user.email})`)
  req.user = user
  next()
}

module.exports = {
  requireAuth,
}


