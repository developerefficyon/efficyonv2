require("dotenv").config()
const { createClient } = require("@supabase/supabase-js")

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

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

// Helper function to delete Fortnox resources
async function deleteFortnoxResource(accessToken, endpoint, resourceId) {
  const url = `https://api.fortnox.se/3${endpoint}/${resourceId}`
  
  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    })
    
    if (!response.ok && response.status !== 404) {
      const errorText = await response.text()
      throw new Error(`Fortnox API error (${response.status}): ${errorText}`)
    }
    
    return true
  } catch (error) {
    // Ignore 404 errors (resource already deleted)
    if (error.message.includes("404")) {
      return true
    }
    throw error
  }
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

// Helper function to delete Fortnox resources
async function deleteFortnoxResource(accessToken, endpoint, resourceId) {
  const url = `https://api.fortnox.se/3${endpoint}/${resourceId}`
  
  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    })
    
    if (!response.ok && response.status !== 404) {
      const errorText = await response.text()
      throw new Error(`Fortnox API error (${response.status}): ${errorText}`)
    }
    
    return true
  } catch (error) {
    // Ignore 404 errors (resource already deleted)
    if (error.message.includes("404")) {
      return true
    }
    throw error
  }
}

// Clear existing test data
async function clearTestData(accessToken) {
  console.log("\n🧹 Clearing existing test data...")
  
  try {
    // Clear test customers
    console.log("   Clearing test customers...")
    try {
      const customers = await fortnoxApiCall(accessToken, "GET", "/customers")
      if (customers.Customers) {
        for (const customer of customers.Customers) {
          if (customer.Name && customer.Name.includes("Test Customer")) {
            await deleteFortnoxResource(accessToken, "/customers", customer.CustomerNumber)
            console.log(`   ✅ Deleted customer: ${customer.Name}`)
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        }
      }
    } catch (e) {
      console.log("   ℹ️ Could not clear customers (may require 'customer' scope)")
    }

    // Clear test suppliers
    console.log("   Clearing test suppliers...")
    try {
      const suppliers = await fortnoxApiCall(accessToken, "GET", "/suppliers")
      if (suppliers.Suppliers) {
        for (const supplier of suppliers.Suppliers) {
          if (supplier.Name && supplier.Name.includes("Test Supplier")) {
            await deleteFortnoxResource(accessToken, "/suppliers", supplier.SupplierNumber)
            console.log(`   ✅ Deleted supplier: ${supplier.Name}`)
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        }
      }
    } catch (e) {
      console.log("   ℹ️ Could not clear suppliers (may require 'supplier' scope)")
    }

    // Clear test articles
    console.log("   Clearing test articles...")
    try {
      const articles = await fortnoxApiCall(accessToken, "GET", "/articles")
      if (articles.Articles) {
        for (const article of articles.Articles) {
          if (article.ArticleNumber && article.ArticleNumber.startsWith("TEST-ART-")) {
            await deleteFortnoxResource(accessToken, "/articles", article.ArticleNumber)
            console.log(`   ✅ Deleted article: ${article.ArticleNumber}`)
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        }
      }
    } catch (e) {
      console.log("   ℹ️ Could not clear articles")
    }

    // Clear test invoices
    console.log("   Clearing test invoices...")
    try {
      const invoices = await fortnoxApiCall(accessToken, "GET", "/invoices")
      if (invoices.Invoices) {
        for (const invoice of invoices.Invoices) {
          // Check if invoice is for a test customer or has test description
          if (invoice.CustomerName && invoice.CustomerName.includes("Test Customer")) {
            await deleteFortnoxResource(accessToken, "/invoices", invoice.DocumentNumber)
            console.log(`   ✅ Deleted invoice: ${invoice.DocumentNumber}`)
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        }
      }
    } catch (e) {
      console.log("   ℹ️ Could not clear invoices")
    }

    // Clear test supplier invoices
    console.log("   Clearing test supplier invoices...")
    try {
      const supplierInvoices = await fortnoxApiCall(accessToken, "GET", "/supplierinvoices")
      if (supplierInvoices.SupplierInvoices) {
        for (const invoice of supplierInvoices.SupplierInvoices) {
          if (invoice.SupplierName && invoice.SupplierName.includes("Test Supplier")) {
            await deleteFortnoxResource(accessToken, "/supplierinvoices", invoice.DocumentNumber)
            console.log(`   ✅ Deleted supplier invoice: ${invoice.DocumentNumber}`)
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        }
      }
    } catch (e) {
      console.log("   ℹ️ Could not clear supplier invoices")
    }


    console.log("✅ Test data cleared\n")
  } catch (error) {
    console.log("⚠️ Error clearing test data (continuing anyway):", error.message)
  }
}

// Create a test customer
async function createCustomer(accessToken) {
  console.log("\n📝 Creating test customer...")
  
  const customerData = {
    Customer: {
      Name: "Test Customer AB",
      Type: "COMPANY",
      Address1: "Testgatan 123",
      ZipCode: "123 45",
      City: "Stockholm",
      // Country is read-only in Fortnox API, so we don't set it
      Email: "test@customer.se",
      Phone1: "+46 123 456 789", // Use Phone1 instead of Phone
    }
  }

  try {
    const result = await fortnoxApiCall(accessToken, "POST", "/customers", customerData)
    console.log("✅ Customer created:", result.Customer?.CustomerNumber || result.Customer?.Name)
    return result.Customer
  } catch (error) {
    if (error.message.includes("behörighet") || error.message.includes("scope") || error.message.includes("permission")) {
      console.log("ℹ️ Customer creation requires 'customer' scope. Trying to fetch existing customers...")
    } else {
      console.error("❌ Failed to create customer:", error.message)
    }
    // Try to get existing customer
    try {
      const customers = await fortnoxApiCall(accessToken, "GET", "/customers?limit=1")
      if (customers.Customers && customers.Customers.length > 0) {
        console.log("✅ Using existing customer:", customers.Customers[0].Name)
        return customers.Customers[0]
      }
    } catch (e) {
      console.log("ℹ️ Could not fetch existing customers (may require 'customer' scope)")
    }
    return null
  }
}

// Create test articles
async function createArticles(accessToken, count = 5) {
  console.log(`\n📦 Creating ${count} test articles...`)
  const articles = []
  const timestamp = Date.now()

  for (let i = 1; i <= count; i++) {
    // Use timestamp to make article numbers unique
    const articleNumber = `TEST-ART-${timestamp}-${i}`
    
    // Note: SalesPrice is read-only in Fortnox API, so we only set PurchasePrice
    const articleData = {
      Article: {
        ArticleNumber: articleNumber,
        Description: `Test Article ${i}`,
        Type: "STOCK",
        PurchasePrice: 100 * i,
        Unit: "st",
      }
    }

    try {
      const result = await fortnoxApiCall(accessToken, "POST", "/articles", articleData)
      articles.push(result.Article)
      console.log(`✅ Article ${i}/${count} created: ${result.Article?.ArticleNumber}`)
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (error) {
      if (error.message.includes("används redan") || error.message.includes("already exists")) {
        console.log(`ℹ️ Article ${i}/${count} already exists, trying with different number...`)
        // Try with a different number
        try {
          const altArticleNumber = `TEST-ART-${timestamp}-${i}-${Math.random().toString(36).substring(7)}`
          articleData.Article.ArticleNumber = altArticleNumber
          const result = await fortnoxApiCall(accessToken, "POST", "/articles", articleData)
          articles.push(result.Article)
          console.log(`✅ Article ${i}/${count} created with alt number: ${result.Article?.ArticleNumber}`)
        } catch (e) {
          console.error(`❌ Failed to create article ${i} (alt):`, e.message)
        }
      } else {
        console.error(`❌ Failed to create article ${i}:`, error.message)
      }
    }
  }

  return articles
}

// Create test invoices
async function createInvoices(accessToken, customer, articles, count = 3) {
  console.log(`\n🧾 Creating ${count} test invoices...`)
  
  if (!customer) {
    console.log("⚠️ No customer available, skipping invoices")
    return []
  }

  const invoices = []
  const today = new Date()

  for (let i = 1; i <= count; i++) {
    const invoiceDate = new Date(today)
    invoiceDate.setDate(today.getDate() - (i * 10)) // Different dates
    
    const dueDate = new Date(invoiceDate)
    dueDate.setDate(invoiceDate.getDate() + 30)

    const invoiceData = {
      Invoice: {
        CustomerNumber: customer.CustomerNumber,
        InvoiceDate: invoiceDate.toISOString().split('T')[0],
        DueDate: dueDate.toISOString().split('T')[0],
        InvoiceRows: [
          {
            ArticleNumber: articles[0]?.ArticleNumber || "TEST-ART-1",
            Description: `Test Invoice Item ${i}`,
            DeliveredQuantity: i.toString(), // Use DeliveredQuantity instead of Quantity
            Price: 1000 * i,
            // Account field is not needed when using ArticleNumber - Fortnox will use the article's account
          }
        ],
      }
    }

    try {
      const result = await fortnoxApiCall(accessToken, "POST", "/invoices", invoiceData)
      invoices.push(result.Invoice)
      console.log(`✅ Invoice ${i}/${count} created: ${result.Invoice?.DocumentNumber || result.Invoice?.GivenNumber}`)
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (error) {
      console.error(`❌ Failed to create invoice ${i}:`, error.message)
    }
  }

  return invoices
}

// Create a test supplier
async function createSupplier(accessToken) {
  console.log("\n📝 Creating test supplier...")
  
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
    console.log("✅ Supplier created:", result.Supplier?.SupplierNumber || result.Supplier?.Name)
    return result.Supplier
  } catch (error) {
    if (error.message.includes("behörighet") || error.message.includes("scope") || error.message.includes("permission")) {
      console.log("ℹ️ Supplier creation requires 'supplier' scope. Trying to fetch existing suppliers...")
    } else {
      console.error("❌ Failed to create supplier:", error.message)
    }
    // Try to get existing supplier
    try {
      const suppliers = await fortnoxApiCall(accessToken, "GET", "/suppliers?limit=1")
      if (suppliers.Suppliers && suppliers.Suppliers.length > 0) {
        console.log("✅ Using existing supplier:", suppliers.Suppliers[0].Name)
        return suppliers.Suppliers[0]
      }
    } catch (e) {
      console.log("ℹ️ Could not fetch existing suppliers (may require 'supplier' scope)")
    }
    return null
  }
}

// Supplier invoice creation moved to separate script: seed-fortnox-invoices.js


// Main seeding function
async function seedFortnox() {
  console.log("🌱 Starting Fortnox data seeding...\n")

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

    // Clear existing test data first
    await clearTestData(accessToken)

    // Create test data
    console.log("\n4️⃣ Creating test data in Fortnox...")
    
    // Create customer (needed for invoices)
    const customer = await createCustomer(accessToken)
    
    // Create supplier (needed for supplier invoices)
    const supplier = await createSupplier(accessToken)
    
    // Create articles
    const articles = await createArticles(accessToken, 5)
    
    // Create invoices
    const invoices = await createInvoices(accessToken, customer, articles, 3)
    
    // Supplier invoices are created separately - run 'npm run seed:fortnox-invoices'

    // Summary
    console.log("\n" + "=".repeat(50))
    console.log("✅ Fortnox seeding completed!")
    console.log("=".repeat(50))
    console.log(`📊 Summary:`)
    console.log(`   - Customer: ${customer ? "✅ Created" : "❌ Failed"}`)
    console.log(`   - Supplier: ${supplier ? "✅ Created" : "❌ Failed"}`)
    console.log(`   - Articles: ${articles.length} created`)
    console.log(`   - Invoices: ${invoices.length} created`)
    console.log("\n💡 Next steps:")
    console.log("   1. Run 'npm run seed:fortnox-accounts' to create expense accounts")
    console.log("   2. Run 'npm run seed:fortnox-invoices' to create supplier invoices")
    console.log("\n💡 You can now view this data in your app by clicking 'View Information' on your Fortnox integration.")

  } catch (error) {
    console.error("\n❌ Seeding failed:", error)
    process.exit(1)
  }
}

// Run the seeding
seedFortnox()

