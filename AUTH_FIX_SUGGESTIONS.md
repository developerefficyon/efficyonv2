# Authentication Persistence - Code Fix Suggestions

## 🔧 **Quick Fixes to Implement**

### **1. Add Proactive Token Refresh**

**Location:** `frontend/lib/auth-context.tsx`

Add this after session initialization:

```typescript
// Add token refresh interval
useEffect(() => {
  let refreshInterval: NodeJS.Timeout | null = null

  const setupTokenRefresh = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const expiresAt = session.expires_at || 0
    const now = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = expiresAt - now
    
    // Refresh 5 minutes before expiration (300 seconds)
    const refreshTime = Math.max(0, (timeUntilExpiry - 300) * 1000)
    
    if (refreshTime > 0) {
      refreshInterval = setTimeout(async () => {
        console.log('[Auth] Refreshing token proactively before expiration')
        await supabase.auth.refreshSession()
        setupTokenRefresh() // Schedule next refresh
      }, refreshTime)
    }
  }

  setupTokenRefresh()

  return () => {
    if (refreshInterval) clearTimeout(refreshInterval)
  }
}, [user])
```

### **2. Fix Session Initialization Race Condition**

**Location:** `frontend/lib/auth-context.tsx` - `initSession` function

Replace the current `initSession` with:

```typescript
const initSession = async () => {
  let retries = 0
  const maxRetries = 3

  while (retries < maxRetries) {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (!isMounted) return

      if (session?.user) {
        // Session found - proceed with user setup
        const u = session.user
        const role = (u.user_metadata?.role as UserRole) || "user"
        const name = (u.user_metadata?.name as string) || ""
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", u.id)
          .maybeSingle()
        
        if (isMounted) {
          setUser({
            id: u.id,
            email: u.email || "",
            name,
            role,
            onboardingCompleted: profile?.onboarding_completed ?? false,
          })
        }
        setIsLoading(false)
        return // Success - exit retry loop
      }

      if (sessionError) {
        console.warn(`[Auth] Session error (attempt ${retries + 1}/${maxRetries}):`, sessionError)
        
        // Try to refresh session
        try {
          const { data: { session: refreshedSession }, error: refreshError } = 
            await supabase.auth.refreshSession()
          
          if (refreshedSession?.user && isMounted) {
            const u = refreshedSession.user
            const role = (u.user_metadata?.role as UserRole) || "user"
            const name = (u.user_metadata?.name as string) || ""
            
            const { data: profile } = await supabase
              .from("profiles")
              .select("onboarding_completed")
              .eq("id", u.id)
              .maybeSingle()
            
            if (isMounted) {
              setUser({
                id: u.id,
                email: u.email || "",
                name,
                role,
                onboardingCompleted: profile?.onboarding_completed ?? false,
              })
            }
            setIsLoading(false)
            return // Success after refresh
          }
          
          if (refreshError) {
            console.error('[Auth] Refresh failed:', refreshError)
          }
        } catch (refreshErr) {
          console.error('[Auth] Refresh exception:', refreshErr)
        }
      }

      // If we get here, session is null and no error - user is logged out
      if (isMounted) {
        setUser(null)
        setIsLoading(false)
      }
      return

    } catch (error) {
      retries++
      console.error(`[Auth] Session init error (attempt ${retries}/${maxRetries}):`, error)
      
      if (retries < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)))
        continue // Retry
      } else {
        // Max retries reached
        console.error('[Auth] Failed to initialize session after retries')
        if (isMounted) {
          setUser(null)
          setIsLoading(false)
        }
        return
      }
    }
  }
}
```

### **3. Add Session Validation Helper**

**Location:** Create new file `frontend/lib/auth-helpers.ts`

```typescript
import { supabase } from "./supabaseClient"

/**
 * Validates and refreshes session if needed before API calls
 * @returns Valid access token or null if session invalid
 */
export async function getValidSessionToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      console.warn('[Auth] No session found, attempting refresh...')
      const { data: { session: refreshed }, error: refreshError } = 
        await supabase.auth.refreshSession()
      
      if (refreshError || !refreshed) {
        console.error('[Auth] Failed to refresh session:', refreshError)
        return null
      }
      
      return refreshed.access_token
    }

    // Check if token is expiring soon (within 5 minutes)
    const expiresAt = session.expires_at || 0
    const now = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = expiresAt - now

    if (timeUntilExpiry < 300) {
      // Less than 5 minutes left - refresh proactively
      console.log('[Auth] Token expiring soon, refreshing...')
      const { data: { session: refreshed }, error: refreshError } = 
        await supabase.auth.refreshSession()
      
      if (refreshError || !refreshed) {
        console.warn('[Auth] Refresh failed, using current token:', refreshError)
        return session.access_token // Use current token even if refresh failed
      }
      
      return refreshed.access_token
    }

    return session.access_token
  } catch (error) {
    console.error('[Auth] Error validating session:', error)
    return null
  }
}
```

### **4. Update API Calls to Use Session Validation**

**Location:** `frontend/app/dashboard/integrations/page.tsx` and other API call locations

Replace:
```typescript
const { data: { session } } = await supabase.auth.getSession()
const accessToken = session?.access_token
```

With:
```typescript
import { getValidSessionToken } from "@/lib/auth-helpers"

const accessToken = await getValidSessionToken()
if (!accessToken) {
  toast.error("Session expired", { description: "Please log in again" })
  router.push("/login")
  return
}
```

### **5. Improve onAuthStateChange Handler**

**Location:** `frontend/lib/auth-context.tsx`

Update the `onAuthStateChange` handler:

```typescript
const {
  data: { subscription },
} = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
  if (!isMounted) return
  
  console.log('[Auth] Auth state changed:', event, session ? 'session exists' : 'no session')
  
  // Handle sign out event
  if (event === "SIGNED_OUT" || !session?.user) {
    console.log('[Auth] User signed out, clearing state')
    setUser(null)
    return
  }
  
  // Handle token refresh
  if (event === "TOKEN_REFRESHED") {
    console.log('[Auth] Token refreshed successfully')
  }
  
  // Handle sign in or session restore
  if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
    const u = session.user
    const role = (u.user_metadata?.role as UserRole) || "user"
    const name = (u.user_metadata?.name as string) || ""
    
    // Fetch profile to get onboarding_completed status
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", u.id)
      .maybeSingle()
    
    if (!isMounted) return
    
    setUser({
      id: u.id,
      email: u.email || "",
      name,
      role,
      onboardingCompleted: profile?.onboarding_completed ?? false,
    })
  }
})
```

### **6. Add Storage Validation**

**Location:** `frontend/lib/supabaseClient.ts`

Update Supabase client creation:

```typescript
// Helper to get storage with fallback
function getStorage() {
  if (typeof window === "undefined") return undefined
  
  try {
    // Test localStorage access
    const test = "__storage_test__"
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return window.localStorage
  } catch (e) {
    console.warn('[Auth] localStorage not available, using memory storage')
    // Fallback to in-memory storage
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    } as Storage
  }
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: getStorage(),
        },
      })
    : (null as any)
```

### **7. Add Cross-Tab Sync**

**Location:** `frontend/lib/auth-context.tsx`

Add after `onAuthStateChange`:

```typescript
// Listen for storage changes (cross-tab sync)
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key?.startsWith('sb-') && e.key.includes('-auth-token')) {
      console.log('[Auth] Storage changed in another tab, refreshing session')
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && isMounted) {
          // Session exists - update user state
          const u = session.user
          const role = (u.user_metadata?.role as UserRole) || "user"
          const name = (u.user_metadata?.name as string) || ""
          
          supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", u.id)
            .maybeSingle()
            .then(({ data: profile }) => {
              if (isMounted) {
                setUser({
                  id: u.id,
                  email: u.email || "",
                  name,
                  role,
                  onboardingCompleted: profile?.onboarding_completed ?? false,
                })
              }
            })
        } else if (!session && isMounted) {
          // Session removed - clear user
          setUser(null)
        }
      })
    }
  }

  window.addEventListener('storage', handleStorageChange)
  return () => window.removeEventListener('storage', handleStorageChange)
}, [])
```

---

## 🎯 **Implementation Order**

1. **First:** Fix session initialization (Fix #2) - Most critical
2. **Second:** Add session validation helper (Fix #3) - Prevents API failures
3. **Third:** Add proactive token refresh (Fix #1) - Prevents unexpected logouts
4. **Fourth:** Update API calls (Fix #4) - Apply validation everywhere
5. **Fifth:** Improve error handling (Fix #5) - Better UX
6. **Sixth:** Add storage validation (Fix #6) - Handle edge cases
7. **Seventh:** Add cross-tab sync (Fix #7) - Nice to have

---

## 🧪 **Testing Steps**

1. Login → Refresh page → Should stay logged in ✅
2. Login → Close browser → Reopen → Should stay logged in ✅
3. Login → Wait 55 minutes → Should auto-refresh token ✅
4. Login → Open second tab → Logout in first tab → Second tab should logout ✅
5. Login → Disable network → Should show offline message, not logout ✅
6. Login → Make API call with expired token → Should auto-refresh and retry ✅



