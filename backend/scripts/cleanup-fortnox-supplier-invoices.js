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
      const errorText = await refreshResponse.text()
      throw new Error(`Token refresh failed: ${refreshResponse.status} ${errorText}`)
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

  // For DELETE requests, response might be empty
  if (method === "DELETE") {
    return { success: true }
  }

  return await response.json()
}

// Fetch all supplier invoices
async function fetchSupplierInvoices(accessToken, supplierFilter = null) {
  console.log("\n📋 Fetching supplier invoices...")
  
  try {
    const endpoint = supplierFilter 
      ? `/supplierinvoices?suppliernumber=${supplierFilter}` 
      : "/supplierinvoices"
    
    const result = await fortnoxApiCall(accessToken, "GET", endpoint)
    const invoices = result.SupplierInvoices || []
    
    console.log(`✅ Found ${invoices.length} supplier invoices`)
    
    if (invoices.length > 0) {
      console.log("\nInvoice Summary:")
      console.log("─".repeat(80))
      console.log("GivenNumber | Supplier                | Amount    | Date       | Status")
      console.log("─".repeat(80))
      
      invoices.forEach(inv => {
        const givenNumber = (inv.GivenNumber || "N/A").toString().padEnd(11)
        const supplier = (inv.SupplierName || "Unknown").substring(0, 23).padEnd(23)
        const amount = (inv.Total || "0").toString().padStart(9)
        const date = inv.InvoiceDate || "N/A"
        const booked = inv.Booked ? "Booked" : "Unbooked"
        console.log(`${givenNumber} | ${supplier} | ${amount} | ${date} | ${booked}`)
      })
      console.log("─".repeat(80))
    }
    
    return invoices
  } catch (error) {
    console.error("❌ Failed to fetch supplier invoices:", error.message)
    return []
  }
}

// Delete a supplier invoice (Fortnox expects DocumentNumber in the path)
async function deleteSupplierInvoice(accessToken, docNumber) {
  try {
    await fortnoxApiCall(accessToken, "DELETE", `/supplierinvoices/${docNumber}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Delete supplier invoices with confirmation
async function deleteSupplierInvoices(accessToken, invoices, options = {}) {
  const { onlyUnbooked = true, testSupplierOnly = false, dryRun = false } = options
  
  console.log("\n🗑️  Preparing to delete supplier invoices...")
  console.log(`Options: ${onlyUnbooked ? "Only unbooked" : "All"}, ${testSupplierOnly ? "Test suppliers only" : "All suppliers"}, ${dryRun ? "DRY RUN" : "ACTUAL DELETE"}`)
  
  // Filter invoices based on options
  let invoicesToDelete = invoices
  
  if (onlyUnbooked) {
    invoicesToDelete = invoicesToDelete.filter(inv => !inv.Booked)
    console.log(`\n📌 Filtered to ${invoicesToDelete.length} unbooked invoices (booked invoices cannot be deleted)`)
  }
  
  if (testSupplierOnly) {
    invoicesToDelete = invoicesToDelete.filter(inv => 
      inv.SupplierName && inv.SupplierName.toLowerCase().includes("test")
    )
    console.log(`📌 Filtered to ${invoicesToDelete.length} test supplier invoices`)
  }
  
  if (invoicesToDelete.length === 0) {
    console.log("\n✅ No invoices to delete!")
    return { deleted: 0, failed: 0, skipped: 0 }
  }
  
  console.log(`\n⚠️  About to delete ${invoicesToDelete.length} supplier invoices`)
  
  if (dryRun) {
    console.log("\n🔍 DRY RUN - No invoices will actually be deleted")
    console.log("\nInvoices that would be deleted:")
    invoicesToDelete.forEach(inv => {
      console.log(`   - ${inv.GivenNumber}: ${inv.SupplierName} - ${inv.Total} SEK (${inv.InvoiceDate})`)
    })
    return { deleted: 0, failed: 0, skipped: invoicesToDelete.length }
  }
  
  // Wait 3 seconds for user to cancel if needed
  console.log("\n⏳ Starting deletion in 3 seconds... (Press Ctrl+C to cancel)")
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  console.log("\n🗑️  Deleting invoices...\n")
  
  let deleted = 0
  let failed = 0
  let skipped = 0
  
  for (const invoice of invoicesToDelete) {
    // Fortnox uses DocumentNumber for the DELETE path; fall back to GivenNumber
    const docNumber = invoice.DocumentNumber || invoice.GivenNumber
    
    if (!docNumber) {
      console.log(`   ⚠️  Skipped: Invoice has no DocumentNumber/GivenNumber`)
      skipped++
      continue
    }
    
    const result = await deleteSupplierInvoice(accessToken, docNumber)
    
    if (result.success) {
      console.log(`   ✅ Deleted: ${docNumber} - ${invoice.SupplierName} (${invoice.Total} SEK)`)
      deleted++
    } else {
      console.log(`   ❌ Failed: ${docNumber} - ${result.error}`)
      failed++
    }
    
    // Rate limiting: wait 200ms between deletions
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  return { deleted, failed, skipped }
}

// Main cleanup function
async function cleanupSupplierInvoices() {
  console.log("🧹 Fortnox Supplier Invoice Cleanup Tool")
  console.log("=" .repeat(80))
  
  // Parse command line arguments
  const args = process.argv.slice(2)
  const options = {
    onlyUnbooked: true,
    testSupplierOnly: true,
    dryRun: args.includes("--dry-run"),
    deleteAll: args.includes("--all"),
    deleteAllSuppliers: args.includes("--all-suppliers"),
  }
  
  if (options.deleteAll) {
    options.onlyUnbooked = false
    console.log("\n⚠️  WARNING: --all flag detected. Will attempt to delete ALL invoices (including booked).")
  }
  
  if (options.deleteAllSuppliers) {
    options.testSupplierOnly = false
    console.log("\n⚠️  WARNING: --all-suppliers flag detected. Will delete invoices from ALL suppliers.")
  }
  
  try {
    // Get user email from command line or use default
    const userEmail = args.find(arg => !arg.startsWith("--")) || process.env.ADMIN_EMAIL || "developer@efficyon.com"
    console.log(`\n📧 Using user email: ${userEmail}`)

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
    console.log(`✅ Found user: ${profile.email}`)

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

    // Fetch supplier invoices
    const invoices = await fetchSupplierInvoices(accessToken)
    
    if (invoices.length === 0) {
      console.log("\n✅ No supplier invoices found. Nothing to delete!")
      return
    }
    
    // Delete invoices
    const result = await deleteSupplierInvoices(accessToken, invoices, options)

    // Summary
    console.log("\n" + "=".repeat(80))
    console.log("✅ Cleanup completed!")
    console.log("=".repeat(80))
    console.log(`📊 Summary:`)
    console.log(`   - Total invoices found: ${invoices.length}`)
    console.log(`   - Deleted: ${result.deleted}`)
    console.log(`   - Failed: ${result.failed}`)
    console.log(`   - Skipped: ${result.skipped}`)
    
    if (options.dryRun) {
      console.log("\n💡 This was a DRY RUN. No invoices were actually deleted.")
      console.log("   Run without --dry-run to actually delete invoices.")
    }
    
    if (result.failed > 0) {
      console.log("\n⚠️  Some deletions failed. Common reasons:")
      console.log("   - Invoice is booked (use --all flag, but be careful!)")
      console.log("   - Invoice is locked")
      console.log("   - Insufficient permissions")
    }

  } catch (error) {
    console.error("\n❌ Cleanup failed:", error)
    console.error(error.stack)
    process.exit(1)
  }
}

// Show usage if --help flag
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
Fortnox Supplier Invoice Cleanup Tool

Usage:
  npm run cleanup:fortnox-supplier-invoices [email] [options]

Options:
  --dry-run          Show what would be deleted without actually deleting
  --all              Delete ALL invoices (including booked ones)
  --all-suppliers    Delete from ALL suppliers (not just test suppliers)
  --help, -h         Show this help message

Examples:
  # Dry run - see what would be deleted
  npm run cleanup:fortnox-supplier-invoices -- --dry-run

  # Delete only unbooked test supplier invoices (safe, default)
  npm run cleanup:fortnox-supplier-invoices

  # Delete ALL invoices from test suppliers
  npm run cleanup:fortnox-supplier-invoices -- --all

  # Delete ALL invoices from ALL suppliers (DANGEROUS!)
  npm run cleanup:fortnox-supplier-invoices -- --all --all-suppliers

  # Use specific user email
  npm run cleanup:fortnox-supplier-invoices your-email@example.com

Default behavior:
  - Only deletes UNBOOKED invoices
  - Only deletes from TEST SUPPLIERS
  - Waits 3 seconds before deletion
`)
  process.exit(0)
}

// Run the cleanup
cleanupSupplierInvoices()

