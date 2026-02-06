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
  // oauth_data inside settings is still encrypted, so decrypt it
  const oauthData = settings.oauth_data
    ? decryptOAuthData(settings.oauth_data)
    : decryptOAuthData(integration.oauth_data || {})
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
      const errorText = await refreshResponse.text()
      throw new Error(`Token refresh failed: ${refreshResponse.status} ${errorText}`)
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

// Get or create a test supplier
async function getOrCreateSupplier(accessToken) {
  console.log("\n📝 Getting or creating test supplier...")
  
  try {
    // Try to fetch existing suppliers
    const suppliers = await fortnoxApiCall(accessToken, "GET", "/suppliers")
    if (suppliers.Suppliers && suppliers.Suppliers.length > 0) {
      const testSupplier = suppliers.Suppliers.find(s => s.Name && s.Name.includes("Test Supplier"))
      if (testSupplier) {
        console.log(`✅ Found existing supplier: ${testSupplier.Name} (Number: ${testSupplier.SupplierNumber})`)
        return testSupplier
      }
      // Use first available supplier if no test supplier found
      console.log(`ℹ️ No test supplier found, using: ${suppliers.Suppliers[0].Name}`)
      return suppliers.Suppliers[0]
    }
  } catch (e) {
    console.log("⚠️ Could not fetch suppliers:", e.message)
  }

  // Try to create a new supplier
  const supplierData = {
    Supplier: {
      Name: "Test Supplier AB",
      Address1: "Leverantörsgatan 456",
      ZipCode: "456 78",
      City: "Göteborg",
      Email: "test@supplier.se",
      Phone1: "+46 987 654 321",
    }
  }

  try {
    const result = await fortnoxApiCall(accessToken, "POST", "/suppliers", supplierData)
    console.log(`✅ Created new supplier: ${result.Supplier?.Name} (Number: ${result.Supplier?.SupplierNumber})`)
    return result.Supplier
  } catch (error) {
    console.error("❌ Failed to create supplier:", error.message)
    console.log("⚠️ Please create a supplier manually in Fortnox first")
    return null
  }
}

// Get expense accounts
async function getExpenseAccounts(accessToken) {
  console.log("\n📝 Fetching expense accounts...")
  
  try {
    const accounts = await fortnoxApiCall(accessToken, "GET", "/accounts")
    if (accounts.Accounts && accounts.Accounts.length > 0) {
      // Find expense accounts (typically 4000-8999)
      const expenseAccounts = accounts.Accounts.filter(acc => 
        acc.Number >= 4000 && acc.Number < 9000 && acc.Active === true
      )
      
      if (expenseAccounts.length > 0) {
        console.log(`✅ Found ${expenseAccounts.length} expense accounts`)
        return expenseAccounts.slice(0, 5) // Return first 5
      }
      
      // If no expense accounts, use any accounts
      console.log("⚠️ No expense accounts found, using any available accounts")
      return accounts.Accounts.slice(0, 5)
    }
  } catch (e) {
    console.log("⚠️ Could not fetch accounts:", e.message)
  }
  
  console.log("⚠️ No accounts available. Please run 'npm run seed:fortnox-accounts' first")
  return []
}

// Create supplier invoices with various scenarios
async function createSupplierInvoicesScenarios(accessToken, supplier, accounts) {
  console.log("\n📄 Creating supplier invoices with cost leak scenarios...\n")
  
  if (!supplier) {
    console.log("⚠️ No supplier available, cannot create invoices")
    return []
  }

  if (!accounts || accounts.length === 0) {
    console.log("⚠️ No accounts available, cannot create invoices")
    return []
  }

  const invoices = []
  const today = new Date()
  const account = accounts[0].Number || 4000 // Use first expense account

  console.log(`   Using account: ${account} (${accounts[0].Description || 'No description'})`)
  console.log(`   Supplier: ${supplier.Name} (${supplier.SupplierNumber})\n`)

  // Scenario 1: Duplicate payments (same amount, close dates)
  console.log("📌 Scenario 1: Duplicate Payments Detection")
  for (let i = 1; i <= 2; i++) {
    const invoiceDate = new Date(today)
    invoiceDate.setDate(today.getDate() - (30 - i * 3)) // 27 days ago and 24 days ago
    
    const invoiceData = {
      SupplierInvoice: {
        SupplierNumber: supplier.SupplierNumber,
        InvoiceDate: invoiceDate.toISOString().split('T')[0],
        DueDate: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        SupplierInvoiceRows: [
          {
            Account: account,
            Debit: 2500, // Same amount for duplicate detection
          }
        ],
      }
    }
    
    try {
      const result = await fortnoxApiCall(accessToken, "POST", "/supplierinvoices", invoiceData)
      invoices.push(result.SupplierInvoice)
      console.log(`   ✅ Duplicate ${i}/2 created: Invoice ${result.SupplierInvoice?.GivenNumber || result.SupplierInvoice?.DocumentNumber} - 2500 SEK`)
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`)
    }
  }

  // Scenario 2: Recurring subscription (same amount, regular intervals)
  console.log("\n📌 Scenario 2: Recurring Subscription Detection")
  for (let i = 1; i <= 3; i++) {
    const invoiceDate = new Date(today)
    invoiceDate.setDate(today.getDate() - (90 - i * 30)) // 60, 30, and 0 days ago (monthly)
    
    const invoiceData = {
      SupplierInvoice: {
        SupplierNumber: supplier.SupplierNumber,
        InvoiceDate: invoiceDate.toISOString().split('T')[0],
        DueDate: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        SupplierInvoiceRows: [
          {
            Account: account,
            Debit: 899, // Monthly subscription amount
          }
        ],
      }
    }
    
    try {
      const result = await fortnoxApiCall(accessToken, "POST", "/supplierinvoices", invoiceData)
      invoices.push(result.SupplierInvoice)
      console.log(`   ✅ Recurring ${i}/3 created: Invoice ${result.SupplierInvoice?.GivenNumber || result.SupplierInvoice?.DocumentNumber} - 899 SEK (${invoiceDate.toISOString().split('T')[0]})`)
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`)
    }
  }

  // Scenario 3: Price increases
  console.log("\n📌 Scenario 3: Price Increase Detection")
  const priceIncreaseAmounts = [1000, 1200, 1500] // 20% then 25% increase
  for (let i = 0; i < 3; i++) {
    const invoiceDate = new Date(today)
    invoiceDate.setDate(today.getDate() - (60 - i * 20)) // 60, 40, 20 days ago
    
    const invoiceData = {
      SupplierInvoice: {
        SupplierNumber: supplier.SupplierNumber,
        InvoiceDate: invoiceDate.toISOString().split('T')[0],
        DueDate: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        SupplierInvoiceRows: [
          {
            Account: account,
            Debit: priceIncreaseAmounts[i],
          }
        ],
      }
    }
    
    try {
      const result = await fortnoxApiCall(accessToken, "POST", "/supplierinvoices", invoiceData)
      invoices.push(result.SupplierInvoice)
      const increase = i > 0 ? `(+${((priceIncreaseAmounts[i] - priceIncreaseAmounts[0]) / priceIncreaseAmounts[0] * 100).toFixed(0)}%)` : ""
      console.log(`   ✅ Price ${i + 1}/3 created: Invoice ${result.SupplierInvoice?.GivenNumber || result.SupplierInvoice?.DocumentNumber} - ${priceIncreaseAmounts[i]} SEK ${increase}`)
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`)
    }
  }

  // Scenario 4: Unusual amounts (outliers)
  console.log("\n📌 Scenario 4: Unusual Amount Detection")
  const unusualAmounts = [500, 600, 550, 8500] // Last one is unusually high
  for (let i = 0; i < 4; i++) {
    const invoiceDate = new Date(today)
    invoiceDate.setDate(today.getDate() - (40 - i * 10))
    
    const invoiceData = {
      SupplierInvoice: {
        SupplierNumber: supplier.SupplierNumber,
        InvoiceDate: invoiceDate.toISOString().split('T')[0],
        DueDate: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        SupplierInvoiceRows: [
          {
            Account: account,
            Debit: unusualAmounts[i],
          }
        ],
      }
    }
    
    try {
      const result = await fortnoxApiCall(accessToken, "POST", "/supplierinvoices", invoiceData)
      invoices.push(result.SupplierInvoice)
      const isOutlier = i === 3 ? " ⚠️ OUTLIER" : ""
      console.log(`   ✅ Amount ${i + 1}/4 created: Invoice ${result.SupplierInvoice?.GivenNumber || result.SupplierInvoice?.DocumentNumber} - ${unusualAmounts[i]} SEK${isOutlier}`)
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`)
    }
  }

  // Scenario 5: Overdue invoices
  console.log("\n📌 Scenario 5: Overdue Invoice Detection")
  const overdueDate = new Date(today)
  overdueDate.setDate(today.getDate() - 60) // Invoice from 60 days ago
  const overdueDueDate = new Date(overdueDate)
  overdueDueDate.setDate(overdueDate.getDate() + 30) // Due 30 days ago
  
  const overdueData = {
    SupplierInvoice: {
      SupplierNumber: supplier.SupplierNumber,
      InvoiceDate: overdueDate.toISOString().split('T')[0],
      DueDate: overdueDueDate.toISOString().split('T')[0],
      SupplierInvoiceRows: [
        {
          Account: account,
          Debit: 3500,
        }
      ],
    }
  }
  
  try {
    const result = await fortnoxApiCall(accessToken, "POST", "/supplierinvoices", overdueData)
    invoices.push(result.SupplierInvoice)
    const daysOverdue = Math.floor((today - overdueDueDate) / (1000 * 60 * 60 * 24))
    console.log(`   ✅ Overdue created: Invoice ${result.SupplierInvoice?.GivenNumber || result.SupplierInvoice?.DocumentNumber} - 3500 SEK (${daysOverdue} days overdue)`)
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`)
  }

  // Scenario 6: Normal invoices (for baseline)
  console.log("\n📌 Scenario 6: Normal Invoices (Baseline)")
  const normalAmounts = [750, 1100, 950]
  for (let i = 0; i < 3; i++) {
    const invoiceDate = new Date(today)
    invoiceDate.setDate(today.getDate() - (20 - i * 5))
    
    const invoiceData = {
      SupplierInvoice: {
        SupplierNumber: supplier.SupplierNumber,
        InvoiceDate: invoiceDate.toISOString().split('T')[0],
        DueDate: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        SupplierInvoiceRows: [
          {
            Account: account,
            Debit: normalAmounts[i],
          }
        ],
      }
    }
    
    try {
      const result = await fortnoxApiCall(accessToken, "POST", "/supplierinvoices", invoiceData)
      invoices.push(result.SupplierInvoice)
      console.log(`   ✅ Normal ${i + 1}/3 created: Invoice ${result.SupplierInvoice?.GivenNumber || result.SupplierInvoice?.DocumentNumber} - ${normalAmounts[i]} SEK`)
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`)
    }
  }

  return invoices
}

// Main seeding function
async function seedSupplierInvoices() {
  console.log("🌱 Starting comprehensive supplier invoice seeding...\n")
  console.log("=" .repeat(60))

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

    // Get Fortnox integration (newest one, regardless of company)
    console.log("\n2️⃣ Fetching Fortnox integration...")
    const { data: integrations, error: integrationError } = await supabase
      .from("company_integrations")
      .select("*")
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

    // Get or create supplier
    const supplier = await getOrCreateSupplier(accessToken)
    if (!supplier) {
      console.error("❌ Could not get or create supplier")
      process.exit(1)
    }
    
    // Get expense accounts
    const accounts = await getExpenseAccounts(accessToken)
    if (accounts.length === 0) {
      console.error("❌ No accounts available. Run 'npm run seed:fortnox-accounts' first")
      process.exit(1)
    }
    
    // Create supplier invoices with various scenarios
    const supplierInvoices = await createSupplierInvoicesScenarios(accessToken, supplier, accounts)

    // Summary
    console.log("\n" + "=".repeat(60))
    console.log("✅ Supplier invoice seeding completed!")
    console.log("=".repeat(60))
    console.log(`📊 Summary:`)
    console.log(`   - Total invoices created: ${supplierInvoices.length}`)
    console.log(`   - Supplier: ${supplier.Name} (${supplier.SupplierNumber})`)
    console.log(`   - Account used: ${accounts[0].Number} (${accounts[0].Description})`)
    
    console.log(`\n📈 Cost Leak Scenarios Created:`)
    console.log(`   ✓ 2 duplicate payments (same amount, close dates)`)
    console.log(`   ✓ 3 recurring subscriptions (monthly, 899 SEK)`)
    console.log(`   ✓ 3 price increases (50% increase over time)`)
    console.log(`   ✓ 1 unusual amount (outlier detection)`)
    console.log(`   ✓ 1 overdue invoice`)
    console.log(`   ✓ 3 normal invoices (baseline)`)
    
    const withAmounts = supplierInvoices.filter(inv => {
      const total = parseFloat(inv.Total) || 0
      const hasRowAmounts = inv.SupplierInvoiceRows?.some(row => 
        parseFloat(row.Total) > 0 || parseFloat(row.Debit) > 0
      )
      return total > 0 || hasRowAmounts
    }).length
    
    console.log(`\n💰 Invoices with amounts: ${withAmounts}/${supplierInvoices.length}`)
    
    if (withAmounts < supplierInvoices.length) {
      console.log("\n⚠️ Some invoices may show zero totals until booked in Fortnox.")
      console.log("   Our analysis reads row-level amounts, so they will still be analyzed.")
    }

    console.log("\n💡 Next steps:")
    console.log("   1. Go to your app and click 'Analyze Cost Leaks' on the Fortnox integration")
    console.log("   2. You should see all 5 types of cost leaks detected")
    console.log("   3. (Optional) Book the invoices in Fortnox to see totals in the UI")

  } catch (error) {
    console.error("\n❌ Seeding failed:", error)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the seeding
seedSupplierInvoices()







