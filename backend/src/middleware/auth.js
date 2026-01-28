const { jwtVerify } = require("jose")

const secret = new TextEncoder().encode(process.env.AUTH_SECRET)

async function requireAuth(req, res, next) {
  const path = req.path
  const method = req.method

  if (!process.env.AUTH_SECRET) {
    console.error(`[${new Date().toISOString()}] ${method} ${path} - Auth middleware: AUTH_SECRET not configured`)
    return res.status(500).json({ error: "AUTH_SECRET not configured on backend" })
  }

  const authHeader = req.headers.authorization || ""
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null

  if (!token) {
    console.warn(`[${new Date().toISOString()}] ${method} ${path} - Auth middleware: Missing Authorization header`)
    return res.status(401).json({ error: "Missing Authorization header" })
  }

  try {
    const { payload } = await jwtVerify(token, secret)

    // Build user object compatible with existing controllers
    const user = {
      id: payload.sub,
      email: payload.email,
      user_metadata: {
        name: payload.name || "",
        role: payload.role || "customer",
      },
    }

    console.log(`[${new Date().toISOString()}] ${method} ${path} - Auth middleware: Authenticated user ${user.id} (${user.email})`)
    req.user = user
    next()
  } catch (error) {
    console.warn(`[${new Date().toISOString()}] ${method} ${path} - Auth middleware: Invalid or expired token`, error.message)
    return res.status(401).json({ error: "Invalid or expired token" })
  }
}

module.exports = {
  requireAuth,
}
