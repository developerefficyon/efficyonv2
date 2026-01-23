/**
 * Encryption Utility for Sensitive Data
 * Uses AES-256-GCM for authenticated encryption
 */
const crypto = require("crypto")

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16 // 16 bytes for GCM
const AUTH_TAG_LENGTH = 16 // 16 bytes authentication tag
const ENCODING = "hex"

/**
 * Get encryption key from environment
 * Key must be 32 bytes (256 bits) for AES-256
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    console.warn("[Encryption] ENCRYPTION_KEY not set - credentials will not be encrypted!")
    return null
  }

  // If key is hex-encoded (64 characters = 32 bytes)
  if (key.length === 64) {
    return Buffer.from(key, "hex")
  }

  // If key is raw string, hash it to get 32 bytes
  return crypto.createHash("sha256").update(key).digest()
}

/**
 * Encrypt a string value
 * @param {string} plaintext - The text to encrypt
 * @returns {string|null} - Encrypted string in format: iv:authTag:ciphertext (hex encoded), or null if encryption fails
 */
function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== "string") {
    return plaintext
  }

  const key = getEncryptionKey()
  if (!key) {
    // Return plaintext if no key configured (for backwards compatibility)
    return plaintext
  }

  try {
    // Generate random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH)

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    })

    // Encrypt
    let ciphertext = cipher.update(plaintext, "utf8", ENCODING)
    ciphertext += cipher.final(ENCODING)

    // Get authentication tag
    const authTag = cipher.getAuthTag()

    // Return combined: iv:authTag:ciphertext
    return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${ciphertext}`
  } catch (error) {
    console.error("[Encryption] Encrypt error:", error.message)
    return null
  }
}

/**
 * Decrypt an encrypted string
 * @param {string} encryptedData - Encrypted string in format: iv:authTag:ciphertext
 * @returns {string|null} - Decrypted plaintext, or null if decryption fails
 */
function decrypt(encryptedData) {
  if (!encryptedData || typeof encryptedData !== "string") {
    return encryptedData
  }

  // Check if data is in encrypted format (contains two colons)
  const parts = encryptedData.split(":")
  if (parts.length !== 3) {
    // Data is not encrypted (legacy plaintext), return as-is
    return encryptedData
  }

  const key = getEncryptionKey()
  if (!key) {
    console.warn("[Encryption] Cannot decrypt - ENCRYPTION_KEY not set")
    return encryptedData
  }

  try {
    const [ivHex, authTagHex, ciphertext] = parts

    // Convert from hex
    const iv = Buffer.from(ivHex, ENCODING)
    const authTag = Buffer.from(authTagHex, ENCODING)

    // Validate lengths
    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      // Invalid format, might be plaintext that contains colons
      return encryptedData
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    })
    decipher.setAuthTag(authTag)

    // Decrypt
    let plaintext = decipher.update(ciphertext, ENCODING, "utf8")
    plaintext += decipher.final("utf8")

    return plaintext
  } catch (error) {
    // Decryption failed - might be plaintext data
    console.warn("[Encryption] Decrypt failed, returning original:", error.message)
    return encryptedData
  }
}

/**
 * Encrypt sensitive fields in an OAuth data object
 * @param {Object} oauthData - OAuth data object
 * @returns {Object} - OAuth data with sensitive fields encrypted
 */
function encryptOAuthData(oauthData) {
  if (!oauthData) return oauthData

  const encrypted = { ...oauthData }

  // Encrypt tokens if present
  if (encrypted.tokens) {
    encrypted.tokens = {
      ...encrypted.tokens,
      access_token: encrypt(encrypted.tokens.access_token),
      refresh_token: encrypt(encrypted.tokens.refresh_token),
    }
  }

  // Encrypt top-level sensitive fields
  if (encrypted.access_token) {
    encrypted.access_token = encrypt(encrypted.access_token)
  }
  if (encrypted.refresh_token) {
    encrypted.refresh_token = encrypt(encrypted.refresh_token)
  }

  return encrypted
}

/**
 * Decrypt sensitive fields in an OAuth data object
 * @param {Object} oauthData - OAuth data object with encrypted fields
 * @returns {Object} - OAuth data with sensitive fields decrypted
 */
function decryptOAuthData(oauthData) {
  if (!oauthData) return oauthData

  const decrypted = { ...oauthData }

  // Decrypt tokens if present
  if (decrypted.tokens) {
    decrypted.tokens = {
      ...decrypted.tokens,
      access_token: decrypt(decrypted.tokens.access_token),
      refresh_token: decrypt(decrypted.tokens.refresh_token),
    }
  }

  // Decrypt top-level sensitive fields
  if (decrypted.access_token) {
    decrypted.access_token = decrypt(decrypted.access_token)
  }
  if (decrypted.refresh_token) {
    decrypted.refresh_token = decrypt(decrypted.refresh_token)
  }

  return decrypted
}

/**
 * Encrypt sensitive fields in integration settings
 * @param {Object} settings - Integration settings object
 * @returns {Object} - Settings with sensitive fields encrypted
 */
function encryptIntegrationSettings(settings) {
  if (!settings) return settings

  const encrypted = { ...settings }

  // Encrypt sensitive fields
  if (encrypted.client_secret) {
    encrypted.client_secret = encrypt(encrypted.client_secret)
  }
  if (encrypted.api_key) {
    encrypted.api_key = encrypt(encrypted.api_key)
  }

  // Encrypt OAuth data
  if (encrypted.oauth_data) {
    encrypted.oauth_data = encryptOAuthData(encrypted.oauth_data)
  }

  return encrypted
}

/**
 * Decrypt sensitive fields in integration settings
 * @param {Object} settings - Integration settings object with encrypted fields
 * @returns {Object} - Settings with sensitive fields decrypted
 */
function decryptIntegrationSettings(settings) {
  if (!settings) return settings

  const decrypted = { ...settings }

  // Decrypt sensitive fields
  if (decrypted.client_secret) {
    decrypted.client_secret = decrypt(decrypted.client_secret)
  }
  if (decrypted.api_key) {
    decrypted.api_key = decrypt(decrypted.api_key)
  }

  // Decrypt OAuth data
  if (decrypted.oauth_data) {
    decrypted.oauth_data = decryptOAuthData(decrypted.oauth_data)
  }

  return decrypted
}

/**
 * Generate a new encryption key (for setup)
 * @returns {string} - 32-byte hex-encoded key
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Check if encryption is properly configured
 * @returns {boolean}
 */
function isEncryptionEnabled() {
  return !!process.env.ENCRYPTION_KEY
}

module.exports = {
  encrypt,
  decrypt,
  encryptOAuthData,
  decryptOAuthData,
  encryptIntegrationSettings,
  decryptIntegrationSettings,
  generateEncryptionKey,
  isEncryptionEnabled,
}
