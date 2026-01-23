/**
 * Migration Script: Encrypt Existing Integration Credentials
 *
 * This script encrypts any plaintext credentials that were stored
 * before encryption was implemented.
 *
 * Usage:
 *   ENCRYPTION_KEY=your-key SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/encrypt-existing-credentials.js
 *
 * IMPORTANT: Run this script ONCE after setting up encryption.
 * Running it multiple times on already-encrypted data is safe (it will skip them).
 */

require("dotenv").config()
const { createClient } = require("@supabase/supabase-js")
const { encrypt, decrypt, encryptOAuthData, isEncryptionEnabled } = require("../src/utils/encryption")

// Initialize Supabase with service key for full access
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
  process.exit(1)
}

if (!isEncryptionEnabled()) {
  console.error("Error: ENCRYPTION_KEY environment variable is not set")
  console.error("Please set ENCRYPTION_KEY before running this migration")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Check if a value is already encrypted (format: iv:authTag:ciphertext)
 */
function isEncrypted(value) {
  if (!value || typeof value !== "string") return false
  const parts = value.split(":")
  if (parts.length !== 3) return false
  // Check if IV and authTag are valid hex strings of correct length
  const [iv, authTag] = parts
  return iv.length === 32 && authTag.length === 32 && /^[0-9a-f]+$/i.test(iv) && /^[0-9a-f]+$/i.test(authTag)
}

/**
 * Encrypt a field only if it's not already encrypted
 */
function encryptIfNeeded(value) {
  if (!value || typeof value !== "string") return value
  if (isEncrypted(value)) {
    console.log("    - Already encrypted, skipping")
    return value
  }
  return encrypt(value)
}

/**
 * Encrypt OAuth data fields if not already encrypted
 */
function encryptOAuthDataIfNeeded(oauthData) {
  if (!oauthData) return oauthData

  const result = { ...oauthData }

  // Handle nested tokens object
  if (result.tokens) {
    if (result.tokens.access_token && !isEncrypted(result.tokens.access_token)) {
      console.log("    - Encrypting tokens.access_token")
      result.tokens = {
        ...result.tokens,
        access_token: encrypt(result.tokens.access_token),
      }
    }
    if (result.tokens.refresh_token && !isEncrypted(result.tokens.refresh_token)) {
      console.log("    - Encrypting tokens.refresh_token")
      result.tokens = {
        ...result.tokens,
        refresh_token: encrypt(result.tokens.refresh_token),
      }
    }
  }

  // Handle top-level tokens
  if (result.access_token && !isEncrypted(result.access_token)) {
    console.log("    - Encrypting access_token")
    result.access_token = encrypt(result.access_token)
  }
  if (result.refresh_token && !isEncrypted(result.refresh_token)) {
    console.log("    - Encrypting refresh_token")
    result.refresh_token = encrypt(result.refresh_token)
  }

  return result
}

async function migrateIntegrations() {
  console.log("\n=== Starting Credential Encryption Migration ===\n")

  // Fetch all integrations
  const { data: integrations, error } = await supabase
    .from("company_integrations")
    .select("id, provider, settings")

  if (error) {
    console.error("Error fetching integrations:", error.message)
    process.exit(1)
  }

  console.log(`Found ${integrations.length} integration(s) to process\n`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const integration of integrations) {
    console.log(`Processing: ${integration.provider} (ID: ${integration.id})`)

    const settings = integration.settings || {}
    let needsUpdate = false
    const newSettings = { ...settings }

    // Check and encrypt client_secret
    if (settings.client_secret) {
      if (!isEncrypted(settings.client_secret)) {
        console.log("  - Encrypting client_secret")
        newSettings.client_secret = encrypt(settings.client_secret)
        needsUpdate = true
      } else {
        console.log("  - client_secret already encrypted")
      }
    }

    // Check and encrypt api_key
    if (settings.api_key) {
      if (!isEncrypted(settings.api_key)) {
        console.log("  - Encrypting api_key")
        newSettings.api_key = encrypt(settings.api_key)
        needsUpdate = true
      } else {
        console.log("  - api_key already encrypted")
      }
    }

    // Check and encrypt oauth_data
    if (settings.oauth_data) {
      const encryptedOauth = encryptOAuthDataIfNeeded(settings.oauth_data)
      if (JSON.stringify(encryptedOauth) !== JSON.stringify(settings.oauth_data)) {
        newSettings.oauth_data = encryptedOauth
        needsUpdate = true
      }
    }

    if (needsUpdate) {
      // Update the integration with encrypted settings
      const { error: updateError } = await supabase
        .from("company_integrations")
        .update({
          settings: newSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id)

      if (updateError) {
        console.error(`  ERROR updating: ${updateError.message}`)
        errors++
      } else {
        console.log("  SUCCESS: Credentials encrypted")
        updated++
      }
    } else {
      console.log("  SKIPPED: No unencrypted credentials found")
      skipped++
    }

    console.log("")
  }

  console.log("=== Migration Complete ===")
  console.log(`  Updated: ${updated}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Errors: ${errors}`)
  console.log("")

  if (errors > 0) {
    console.error("Some integrations failed to update. Please check the errors above.")
    process.exit(1)
  }

  console.log("All credentials have been encrypted successfully!")
}

// Run the migration
migrateIntegrations().catch((error) => {
  console.error("Migration failed:", error)
  process.exit(1)
})
