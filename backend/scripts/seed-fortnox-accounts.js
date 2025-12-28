require("dotenv").config()
const { createClient } = require("@supabase/supabase-js")

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env file")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Helper function to refresh token if needed
async function refreshTokenIfNeeded(integration, tokens) {
  let expiresAt = tokens.expires_at
  if (typeof expiresAt === 'string') {
    expiresAt = Math.floor(new Date(expiresAt).getTime() / 1000)
  }
  const now = Math.floor(Date.now() / 1000)
  let accessToken = tokens.access_token

  if (expiresAt && now >= (expiresAt - 300)) {
    console.log("🔄 Token expired, refreshing...")
    
    const credentials = Buffer.from(`${integration.client_id}:${integration.client_secret || ""}`).toString("base64")
    
    const refreshResponse = await fetch("https://apps.fortnox.se/oauth-v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
      }).toString(),
    })

    if (!refreshResponse.ok) {
      throw new Error("Token refresh failed")
    }

    const refreshData = await refreshResponse.json()
    const expiresIn = refreshData.expires_in || 3600
    const newExpiresAt = now + expiresIn

    const updatedOauthData = {
      ...(integration.oauth_data || {}),
      tokens: {
        ...tokens,
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token || tokens.refresh_token,
        expires_in: expiresIn,
        expires_at: newExpiresAt,
        scope: refreshData.scope || tokens.scope,
      },
    }

    await supabase
      .from("company_integrations")
      .update({ oauth_data: updatedOauthData })
      .eq("id", integration.id)

    accessToken = refreshData.access_token
    console.log("✅ Token refreshed successfully")
  }

  return accessToken
}

// Helper function to make Fortnox API calls
async function fortnoxApiCall(accessToken, method, endpoint, data = null) {
  const url = `https://api.fortnox.se/3${endpoint}`
  
  const options = {
    method,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  }

  if (data && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(data)
  }

  const response = await fetch(url, options)
  
  if (!response.ok) {
    const errorText = await response.text()
    let errorData = {}
    try {
      errorData = JSON.parse(errorText)
    } catch (e) {
      // Not JSON
    }
    throw new Error(`Fortnox API error (${response.status}): ${errorData.ErrorInformation?.message || errorText}`)
  }

  return await response.json()
}

// Create test accounts
async function createAccounts(accessToken) {
  console.log("\n📊 Creating test accounts...")
  
  const accounts = []
  const accountData = [
    { number: 4000, description: "Test Expense Account 1" },
    { number: 4001, description: "Test Expense Account 2" },
    { number: 4002, description: "Test Expense Account 3" },
  ]

  for (const acc of accountData) {
    const accountPayload = {
      Account: {
        Number: acc.number.toString(),
        Description: acc.description,
        // Type field is not needed - Fortnox determines type from account number range
      }
    }

    try {
      const result = await fortnoxApiCall(accessToken, "POST", "/accounts", accountPayload)
      accounts.push(result.Account)
      console.log(`✅ Account created: ${result.Account?.Number} - ${result.Account?.Description}`)
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (error) {
      if (error.message.includes("already exists") || error.message.includes("används redan")) {
        console.log(`ℹ️ Account ${acc.number} already exists, skipping`)
      } else {
        console.error(`❌ Failed to create account ${acc.number}:`, error.message)
      }
    }
  }

  return accounts
}

// Main seeding function
async function seedAccounts() {
  console.log("🌱 Starting Fortnox account seeding...\n")

  try {
    // Get user email from command line or use default
    const userEmail = process.argv[2] || process.env.ADMIN_EMAIL || "developer@efficyon.com"
    console.log(`📧 Using user email: ${userEmail}`)

    // Get user profile
    console.log("\n1️⃣ Fetching user profile...")
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, company_id")
      .eq("email", userEmail)
      .limit(1)

    if (!profiles || profiles.length === 0) {
      console.error(`❌ User with email ${userEmail} not found`)
      process.exit(1)
    }

    const profile = profiles[0]
    console.log(`✅ Found user: ${profile.email} (Company ID: ${profile.company_id})`)

    // Get Fortnox integration
    console.log("\n2️⃣ Fetching Fortnox integration...")
    const { data: integrations, error: integrationError } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("company_id", profile.company_id)
      .eq("tool_name", "Fortnox")
      .order("created_at", { ascending: false })
      .limit(1)

    if (integrationError || !integrations || integrations.length === 0) {
      console.error("❌ Fortnox integration not found. Please connect Fortnox first.")
      process.exit(1)
    }

    const integration = integrations[0]
    console.log("✅ Found Fortnox integration")

    // Get access token
    const tokens = integration.oauth_data?.tokens
    if (!tokens?.access_token) {
      console.error("❌ No access token found. Please reconnect Fortnox integration.")
      process.exit(1)
    }

    console.log("\n3️⃣ Refreshing token if needed...")
    const accessToken = await refreshTokenIfNeeded(integration, tokens)
    console.log("✅ Access token ready")

    // Create accounts
    const accounts = await createAccounts(accessToken)

    // Summary
    console.log("\n" + "=".repeat(50))
    console.log("✅ Account seeding completed!")
    console.log("=".repeat(50))
    console.log(`📊 Summary:`)
    console.log(`   - Accounts: ${accounts.length} created`)
    console.log("\n💡 You can now run 'npm run seed:fortnox-invoices' to create supplier invoices with these accounts.")

  } catch (error) {
    console.error("\n❌ Seeding failed:", error)
    process.exit(1)
  }
}

// Run the seeding
seedAccounts()

