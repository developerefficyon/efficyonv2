"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "./supabaseClient"
import { clearSessionCache } from "./auth-helpers"

type UserRole = "admin" | "user" | "customer"

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  onboardingCompleted?: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<User | null>
  logout: () => Promise<void>
  isLoading: boolean
  sessionExpiryWarning: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionExpiryWarning, setSessionExpiryWarning] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const initSession = async () => {
      // Reduce retries and backoff for faster initialization
      let retries = 0
      const maxRetries = 2 // Reduced from 3

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
            
            // Fetch profile in parallel to reduce wait time
            const profilePromise = supabase
              .from("profiles")
              .select("onboarding_completed")
              .eq("id", u.id)
              .maybeSingle()
            
            const { data: profile } = await profilePromise
            
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
            
            // Try to refresh session only once
            if (retries === 0) {
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
            // Reduced backoff: 300ms, 600ms (instead of 1s, 2s, 4s)
            await new Promise(resolve => setTimeout(resolve, 300 * retries))
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

    void initSession()

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

    // Add proactive token refresh
    let refreshTimeout: NodeJS.Timeout | null = null

    const setupTokenRefresh = async () => {
      if (!isMounted) return
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !session.expires_at) return

      const expiresAt = session.expires_at
      const now = Math.floor(Date.now() / 1000)
      const timeUntilExpiry = expiresAt - now
      
      // Refresh 5 minutes before expiration (300 seconds)
      const refreshTime = Math.max(0, (timeUntilExpiry - 300) * 1000)
      
      if (refreshTime > 0) {
        refreshTimeout = setTimeout(async () => {
          if (!isMounted) return
          console.log('[Auth] Refreshing token proactively before expiration')
          try {
            await supabase.auth.refreshSession()
            // Schedule next refresh
            setupTokenRefresh()
          } catch (error) {
            console.error('[Auth] Proactive token refresh failed:', error)
          }
        }, refreshTime)
      } else if (timeUntilExpiry > 0) {
        // Less than 5 minutes but still valid - refresh immediately
        console.log('[Auth] Token expiring soon, refreshing immediately')
        try {
          await supabase.auth.refreshSession()
          setupTokenRefresh()
        } catch (error) {
          console.error('[Auth] Immediate token refresh failed:', error)
        }
      }
    }

    // Setup token refresh and expiry monitoring when user is loaded
    if (user) {
      setupTokenRefresh()
      
      // Monitor session expiry and show warning
      const checkExpiry = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.expires_at) return
        
        const expiresAt = session.expires_at
        const now = Math.floor(Date.now() / 1000)
        const timeUntilExpiry = expiresAt - now
        
        // Show warning 2 minutes before expiry
        if (timeUntilExpiry > 0 && timeUntilExpiry < 120 && !sessionExpiryWarning) {
          setSessionExpiryWarning(true)
          console.warn('[Auth] Session expiring in less than 2 minutes')
        }
        
        // Clear warning if we have more than 5 minutes left
        if (timeUntilExpiry > 300) {
          setSessionExpiryWarning(false)
        }
      }
      
      const expiryCheckInterval = setInterval(checkExpiry, 30000) // Check every 30 seconds
      
      return () => {
        if (expiryCheckInterval) clearInterval(expiryCheckInterval)
      }
    }

    // Listen for storage changes (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('sb-') && e.key.includes('-auth-token')) {
        console.log('[Auth] Storage changed in another tab, refreshing session')
        supabase.auth.getSession().then((result: { data?: { session?: any } }) => {
          if (!isMounted) return
          
          const session = result.data?.session
          if (session?.user) {
            // Session exists - update user state
            const u = session.user
            const role = (u.user_metadata?.role as UserRole) || "user"
            const name = (u.user_metadata?.name as string) || ""
            
            supabase
              .from("profiles")
              .select("onboarding_completed")
              .eq("id", u.id)
              .maybeSingle()
              .then((profileResult: { data?: { onboarding_completed?: boolean } | null }) => {
                const profile = profileResult.data
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

    return () => {
      isMounted = false
      subscription.unsubscribe()
      if (refreshTimeout) clearTimeout(refreshTimeout)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [user])

  const login = async (email: string, password: string): Promise<User | null> => {
    console.log('[Auth] Login attempt for:', email)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('[Auth] Login error:', {
        message: error.message,
        status: error.status,
        name: error.name,
        fullError: error
      })
      
      // Provide more specific error messages
      if (error.message?.includes('Invalid login credentials') || error.message?.includes('Email not confirmed')) {
        throw new Error("INVALID_CREDENTIALS")
      } else if (error.message?.includes('Email not confirmed')) {
        throw new Error("EMAIL_NOT_CONFIRMED")
      } else {
        throw new Error("INVALID_CREDENTIALS")
      }
    }

    if (!data.session?.user) {
      console.error('[Auth] No user in session after login')
      throw new Error("INVALID_CREDENTIALS")
    }

    const u = data.session.user
    console.log('[Auth] User signed in:', u.id, 'Email confirmed:', !!u.email_confirmed_at)

    // Require email confirmation from auth.users
    if (!u.email_confirmed_at) {
      console.warn('[Auth] Email not confirmed, signing out')
      await supabase.auth.signOut()
      throw new Error("EMAIL_NOT_CONFIRMED")
    }

    // Fetch profile to check role / onboarding_completed
    // In the new schema, email verification is handled by Supabase auth (email_confirmed_at)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role, onboarding_completed")
      .eq("id", u.id)
      .maybeSingle()

    if (profileError) {
      console.error('[Auth] Profile fetch error:', profileError.message)
      // If we can't read profile for some reason, treat as invalid login
      await supabase.auth.signOut()
      throw new Error("PROFILE_NOT_FOUND")
    }

    console.log('[Auth] Profile found:', {
      id: profile?.id,
      role: profile?.role,
      full_name: profile?.full_name,
      onboarding_completed: profile?.onboarding_completed
    })

    // Email verification is handled by Supabase auth - we already checked email_confirmed_at above
    // In the new schema, we don't track email_verified, admin_approved, or status in profiles
    // All users with confirmed emails can log in (no admin approval required)

    const role =
      (profile?.role as UserRole | undefined) ||
      (u.user_metadata?.role as UserRole | undefined) ||
      "user"
    const name =
      (profile?.full_name as string | undefined) ||
      (u.user_metadata?.name as string | undefined) ||
      ""

    console.log('[Auth] Final user data:', { id: u.id, email: u.email, role, name })

    const userData: User = {
      id: u.id,
      email: u.email || "",
      name,
      role,
      onboardingCompleted: profile?.onboarding_completed ?? false,
    }
    setUser(userData)
    return userData
  }

  const logout = async () => {
    try {
      console.log('[Auth] Logging out...')
      
      // Clear user state immediately (optimistic update)
      setUser(null)

      // Sign out from Supabase - this should clear the session
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("[Auth] Error signing out:", error)
        // Continue with logout even if there's an error
      } else {
        console.log('[Auth] Successfully signed out from Supabase')
      }

      // Clear all stored session data comprehensively
      if (typeof window !== 'undefined') {
        // Clear ALL Supabase-related localStorage items (not just auth-token)
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key)
            console.log('[Auth] Cleared localStorage key:', key)
          }
        })
        
        // Also clear sessionStorage (Supabase might use it)
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            sessionStorage.removeItem(key)
            console.log('[Auth] Cleared sessionStorage key:', key)
          }
        })
        
        // Clear session token cache
        clearSessionCache()
      }

      // Wait a brief moment to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify session is cleared
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.warn('[Auth] Session still exists after logout, forcing clear')
        // Force clear by removing all Supabase keys again
        if (typeof window !== 'undefined') {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) {
              localStorage.removeItem(key)
            }
          })
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('sb-')) {
              sessionStorage.removeItem(key)
            }
          })
        }
      }

      // Redirect to login page
      router.replace("/login")
      console.log('[Auth] Redirected to login page')
    } catch (error) {
      console.error("[Auth] Logout error:", error)
      // Still clear user and redirect even on error
      setUser(null)
      if (typeof window !== 'undefined') {
        // Clear all Supabase-related storage on error too
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key)
          }
        })
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            sessionStorage.removeItem(key)
          }
        })
      }
      router.replace("/login")
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, sessionExpiryWarning }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

