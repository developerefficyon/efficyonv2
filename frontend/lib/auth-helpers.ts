import { supabase } from "./supabaseClient"

// Cache session token briefly to avoid multiple getSession calls
let cachedToken: string | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5000 // 5 seconds

/**
 * Validates and refreshes session if needed before API calls
 * @returns Valid access token or null if session invalid
 */
export async function getValidSessionToken(): Promise<string | null> {
  try {
    // Return cached token if still valid (within 5 seconds)
    const now = Date.now()
    if (cachedToken && (now - cacheTimestamp) < CACHE_DURATION) {
      return cachedToken
    }

    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.warn('[Auth] Session error:', error.message)
      // Try to refresh even if there's an error
      try {
        const { data: { session: refreshed }, error: refreshError } = 
          await supabase.auth.refreshSession()
        
        if (refreshError || !refreshed) {
          console.error('[Auth] Failed to refresh session:', refreshError?.message || 'Unknown error')
          cachedToken = null
          return null
        }
        
        console.log('[Auth] Session refreshed successfully after error')
        cachedToken = refreshed.access_token
        cacheTimestamp = Date.now()
        return cachedToken
      } catch (refreshErr: any) {
        console.error('[Auth] Exception during refresh:', refreshErr?.message || refreshErr)
        cachedToken = null
        return null
      }
    }
    
    if (!session) {
      console.warn('[Auth] No session found, attempting refresh...')
      try {
        const { data: { session: refreshed }, error: refreshError } = 
          await supabase.auth.refreshSession()
        
        if (refreshError || !refreshed) {
          console.error('[Auth] Failed to refresh session:', refreshError?.message || 'Unknown error')
          cachedToken = null
          return null
        }
        
        console.log('[Auth] Session refreshed successfully')
        cachedToken = refreshed.access_token
        cacheTimestamp = Date.now()
        return cachedToken
      } catch (refreshErr: any) {
        console.error('[Auth] Exception during refresh:', refreshErr?.message || refreshErr)
        cachedToken = null
        return null
      }
    }

    // Check if token is expiring soon (within 2 minutes instead of 5 to reduce unnecessary refreshes)
    const expiresAt = session.expires_at || 0
    const nowSeconds = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = expiresAt - nowSeconds

    // Only refresh if expiring within 2 minutes (not 5) to avoid unnecessary refreshes after login
    if (timeUntilExpiry < 120 && timeUntilExpiry > 0) {
      // Less than 2 minutes left but still valid - refresh proactively
      console.log('[Auth] Token expiring soon, refreshing proactively...')
      try {
        const { data: { session: refreshed }, error: refreshError } = 
          await supabase.auth.refreshSession()
        
        if (refreshError || !refreshed) {
          console.warn('[Auth] Proactive refresh failed, using current token:', refreshError?.message)
          cachedToken = session.access_token
          cacheTimestamp = Date.now()
          return cachedToken // Use current token even if refresh failed
        }
        
        console.log('[Auth] Token refreshed proactively')
        cachedToken = refreshed.access_token
        cacheTimestamp = Date.now()
        return cachedToken
      } catch (refreshErr: any) {
        console.warn('[Auth] Exception during proactive refresh, using current token:', refreshErr?.message)
        cachedToken = session.access_token
        cacheTimestamp = Date.now()
        return cachedToken // Use current token on exception
      }
    }

    // Token is expired
    if (timeUntilExpiry <= 0) {
      console.warn('[Auth] Token already expired, attempting refresh...')
      try {
        const { data: { session: refreshed }, error: refreshError } = 
          await supabase.auth.refreshSession()
        
        if (refreshError || !refreshed) {
          console.error('[Auth] Failed to refresh expired token:', refreshError?.message)
          cachedToken = null
          return null
        }
        
        cachedToken = refreshed.access_token
        cacheTimestamp = Date.now()
        return cachedToken
      } catch (refreshErr: any) {
        console.error('[Auth] Exception refreshing expired token:', refreshErr?.message)
        cachedToken = null
        return null
      }
    }

    // Token is still valid - cache it
    cachedToken = session.access_token
    cacheTimestamp = Date.now()
    return cachedToken
  } catch (error: any) {
    console.error('[Auth] Unexpected error validating session:', error?.message || error)
    cachedToken = null
    return null
  }
}

/**
 * Clear the cached token (useful after logout)
 */
export function clearSessionCache() {
  cachedToken = null
  cacheTimestamp = 0
}



