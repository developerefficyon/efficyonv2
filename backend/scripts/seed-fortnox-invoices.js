require("dotenv").config()
const { createClient } = require("@supabase/supabase-js")
const { decryptOAuthData, decryptIntegrationSettings, encryptOAuthData } = require("../src/utils/encryption")

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env file")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Helper function to get decrypted tokens and settings from integration
function getDecryptedCredentials(integration) {
  // Decrypt settings (contains client_id, client_secret, and oauth_data)
  const settings = decryptIntegrationSettings(integration.settings || {})

  // Get OAuth data from settings (new location) or integration root (legacy)
  const oauthData = settings.oauth_data || decryptOAuthData(integration.oauth_data || {})
  const tokens = oauthData?.tokens

  // Get client credentials from settings (new location) or integration root (legacy)
  const clientId = settings.client_id || integration.client_id
  const clientSecret = settings.client_secret || integration.client_secret

  return { settings, oauthData, tokens, clientId, clientSecret }
}

// Helper function to refresh token if needed
async function refreshTokenIfNeeded(integration, tokens, clientId, clientSecret) {
  let expiresAt = tokens.expires_at
  if (typeof expiresAt === 'string') {
    expiresAt = Math.floor(new Date(expiresAt).getTime() / 1000)
  }
  const now = Math.floor(Date.now() / 1000)
  let accessToken = tokens.access_token

  if (expiresAt && now >= (expiresAt - 300)) {
    console.log("🔄 Token expired, refreshing...")

    const credentials = Buffer.from(`${clientId}:${clientSecret || ""}`).toString("base64")

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

    // Build updated oauth data
    const currentSettings = integration.settings || {}
    const currentOauthData = decryptOAuthData(currentSettings.oauth_data || integration.oauth_data || {})

    const updatedOauthData = {
      ...currentOauthData,
      tokens: {
        ...tokens,
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token || tokens.refresh_token,
        expires_in: expiresIn,
        expires_at: newExpiresAt,
        scope: refreshData.scope || tokens.scope,
      },
    }

    // Encrypt and save to settings.oauth_data
    const encryptedOauthData = encryptOAuthData(updatedOauthData)
    const updatedSettings = { ...currentSettings, oauth_data: encryptedOauthData }

    await supabase
      .from("company_integrations")
      .update({ settings: updatedSettings })
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

// Get supplier
async function getSupplier(accessToken) {
  console.log("\n📝 Fetching test supplier...")
  
  try {
    const suppliers = await fortnoxApiCall(accessToken, "GET", "/suppliers")
    if (suppliers.Suppliers && suppliers.Suppliers.length > 0) {
      const testSupplier = suppliers.Suppliers.find(s => s.Name && s.Name.includes("Test Supplier"))
      if (testSupplier) {
        console.log(`✅ Found supplier: ${testSupplier.Name} (${testSupplier.SupplierNumber})`)
        return testSupplier
      }
    }
    console.log("⚠️ No test supplier found. Please run 'npm run seed:fortnox' first.")
    return null
  } catch (e) {
    console.log("⚠️ Could not fetch suppliers:", e.message)
    return null
  }
}

// Create test supplier invoices
async function createSupplierInvoices(accessToken, supplier, count = 3) {
  console.log(`\n📄 Creating ${count} test supplier invoices...`)
  
  if (!supplier) {
    console.log("⚠️ No supplier available, skipping supplier invoices")
    return []
  }
  
  const invoices = []
  const today = new Date()

  // Get a valid expense account from Fortnox
  let expenseAccount = 4000 // Default
  try {
    const accounts = await fortnoxApiCall(accessToken, "GET", "/accounts")
    if (accounts.Accounts && accounts.Accounts.length > 0) {
      console.log(`   Found ${accounts.Accounts.length} accounts`)
      // Find first expense account (usually 4000-8999 range)
      const expenseAccounts = accounts.Accounts.filter(acc => 
        acc.Account >= 4000 && acc.Account < 9000
      )
      if (expenseAccounts.length > 0) {
        expenseAccount = expenseAccounts[0].Account
        console.log(`   ✅ Using expense account: ${expenseAccount} (${expenseAccounts[0].Description || 'No description'})`)
      } else {
        // Try to find any account in the 3000-9999 range
        const anyAccount = accounts.Accounts.find(acc => acc.Account >= 3000 && acc.Account < 10000)
        if (anyAccount) {
          expenseAccount = anyAccount.Account
          console.log(`   ⚠️ Using account: ${expenseAccount} (${anyAccount.Description || 'No description'}) - may not be an expense account`)
        } else {
          console.log(`   ⚠️ No suitable account found, using default: ${expenseAccount}`)
          console.log(`   💡 Run 'npm run seed:fortnox-accounts' to create expense accounts first`)
        }
      }
    } else {
      console.log(`   ⚠️ No accounts found, using default: ${expenseAccount}`)
      console.log(`   💡 Run 'npm run seed:fortnox-accounts' to create expense accounts first`)
    }
  } catch (e) {
    console.log(`   ⚠️ Could not fetch accounts: ${e.message}, using default: ${expenseAccount}`)
    console.log(`   💡 Run 'npm run seed:fortnox-accounts' to create expense accounts first`)
  }

  for (let i = 1; i <= count; i++) {
    const invoiceDate = new Date(today)
    invoiceDate.setDate(today.getDate() - (i * 7))

    // Calculate total for this invoice
    const rowQuantity = i
    const rowPrice = 500 * i
    const rowTotal = rowQuantity * rowPrice

    const supplierInvoiceData = {
      SupplierInvoice: {
        SupplierNumber: supplier.SupplierNumber,
        InvoiceDate: invoiceDate.toISOString().split('T')[0],
        DueDate: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        SupplierInvoiceRows: [
          {
            Account: expenseAccount.toString(), // Account as string
            Quantity: rowQuantity.toString(), // Quantity as string
            Price: rowPrice.toString(), // Price as string
            // Total is calculated automatically by Fortnox
          }
        ],
      }
    }
    
    console.log(`   📝 Creating invoice ${i} with account ${expenseAccount}, Quantity: ${rowQuantity}, Price: ${rowPrice}, Expected Total: ${rowTotal}`)

    try {
      const result = await fortnoxApiCall(accessToken, "POST", "/supplierinvoices", supplierInvoiceData)
      invoices.push(result.SupplierInvoice)
      const total = result.SupplierInvoice?.Total || "0"
      const rowsCount = result.SupplierInvoice?.SupplierInvoiceRows?.length || 0
      console.log(`✅ Supplier Invoice ${i}/${count} created: ${result.SupplierInvoice?.GivenNumber || result.SupplierInvoice?.DocumentNumber} (Total: ${total}, Rows: ${rowsCount})`)
      if (total === "0" || total === 0) {
        console.log(`   ⚠️ Warning: Invoice has zero total. Check if account ${expenseAccount} exists and rows were saved.`)
        console.log(`   📋 Invoice data sent:`, JSON.stringify(supplierInvoiceData, null, 2))
        console.log(`   📋 Invoice response:`, JSON.stringify(result.SupplierInvoice, null, 2))
      }
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (error) {
      console.error(`❌ Failed to create supplier invoice ${i}:`, error.message)
      console.error(`   📋 Invoice data attempted:`, JSON.stringify(supplierInvoiceData, null, 2))
    }
  }

  return invoices
}

// Main seeding function
async function seedSupplierInvoices() {
  console.log("🌱 Starting Fortnox supplier invoice seeding...\n")

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
      .eq("provider", "Fortnox")
      .order("created_at", { ascending: false })
      .limit(1)

    if (integrationError || !integrations || integrations.length === 0) {
      console.error("❌ Fortnox integration not found. Please connect Fortnox first.")
      process.exit(1)
    }

    const integration = integrations[0]
    console.log("✅ Found Fortnox integration")

    // Get decrypted credentials
    const { tokens, clientId, clientSecret } = getDecryptedCredentials(integration)
    if (!tokens?.access_token) {
      console.error("❌ No access token found. Please reconnect Fortnox integration.")
      console.error("   (Make sure to complete the OAuth flow in the dashboard)")
      process.exit(1)
    }

    console.log("\n3️⃣ Refreshing token if needed...")
    const accessToken = await refreshTokenIfNeeded(integration, tokens, clientId, clientSecret)
    console.log("✅ Access token ready")

    // Get supplier
    const supplier = await getSupplier(accessToken)
    
    // Create supplier invoices
    const supplierInvoices = await createSupplierInvoices(accessToken, supplier, 3)

    // Summary
    console.log("\n" + "=".repeat(50))
    console.log("✅ Supplier invoice seeding completed!")
    console.log("=".repeat(50))
    console.log(`📊 Summary:`)
    console.log(`   - Supplier Invoices: ${supplierInvoices.length} created`)
    const withAmounts = supplierInvoices.filter(inv => inv.Total && inv.Total !== "0" && inv.Total !== 0).length
    console.log(`   - With amounts: ${withAmounts}/${supplierInvoices.length}`)
    if (withAmounts < supplierInvoices.length) {
      console.log("\n⚠️ Some invoices have zero amounts. Make sure:")
      console.log("   1. Expense accounts exist (run 'npm run seed:fortnox-accounts')")
      console.log("   2. Account numbers are correct")
    }

  } catch (error) {
    console.error("\n❌ Seeding failed:", error)
    process.exit(1)
  }
}

// Run the seeding
seedSupplierInvoices()

