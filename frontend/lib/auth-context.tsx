"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "./supabaseClient"

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const initSession = async () => {
      // Get the session from storage (localStorage)
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (!isMounted) return

      // If we have a session, use it
      if (session?.user) {
        const u = session.user
        const role = (u.user_metadata?.role as UserRole) || "user"
        const name = (u.user_metadata?.name as string) || ""
        
        // Fetch profile to get onboarding_completed status
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", u.id)
          .maybeSingle()
        
        setUser({
          id: u.id,
          email: u.email || "",
          name,
          role,
          onboardingCompleted: profile?.onboarding_completed ?? false,
        })
      } else if (sessionError) {
        // If there's an error getting the session, try to refresh it
        console.log("Error getting session, attempting refresh:", sessionError)
        try {
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
          if (refreshedSession?.user && isMounted) {
            const u = refreshedSession.user
            const role = (u.user_metadata?.role as UserRole) || "user"
            const name = (u.user_metadata?.name as string) || ""
            
            const { data: profile } = await supabase
              .from("profiles")
              .select("onboarding_completed")
              .eq("id", u.id)
              .maybeSingle()
            
            setUser({
              id: u.id,
              email: u.email || "",
              name,
              role,
              onboardingCompleted: profile?.onboarding_completed ?? false,
            })
          }
        } catch (refreshError) {
          console.log("Session refresh failed:", refreshError)
        }
      }

      setIsLoading(false)
    }

    void initSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (!isMounted) return
      
      // Handle sign out event
      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null)
        return
      }
      
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
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string): Promise<User | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session?.user) {
      throw new Error("INVALID_CREDENTIALS")
    }

    const u = data.session.user

    // Require email confirmation from auth.users
    if (!u.email_confirmed_at) {
      await supabase.auth.signOut()
      throw new Error("EMAIL_NOT_CONFIRMED")
    }

    // Fetch profile to check email_verified / admin_approved / role / onboarding_completed
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role, email_verified, admin_approved, status, onboarding_completed")
      .eq("id", u.id)
      .maybeSingle()

    if (profileError) {
      // If we can't read profile for some reason, treat as invalid login
      await supabase.auth.signOut()
      throw new Error("PROFILE_NOT_FOUND")
    }

    const emailVerified =
      profile?.email_verified ?? Boolean(u.email_confirmed_at)
    const adminApproved =
      profile?.admin_approved ?? (u.user_metadata?.approved === true)

    if (!emailVerified) {
      await supabase.auth.signOut()
      throw new Error("EMAIL_NOT_CONFIRMED")
    }

    if (!adminApproved && profile?.role !== "admin") {
      await supabase.auth.signOut()
      throw new Error("NOT_APPROVED")
    }

    const role =
      (profile?.role as UserRole | undefined) ||
      (u.user_metadata?.role as UserRole | undefined) ||
      "customer"
    const name =
      (profile?.full_name as string | undefined) ||
      (u.user_metadata?.name as string | undefined) ||
      ""

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
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("Error signing out:", error)
        // Continue with logout even if there's an error
      }
      
      // Clear user state immediately
      setUser(null)
      
      // Redirect to login page
      router.replace("/login")
    } catch (error) {
      console.error("Logout error:", error)
      // Still clear user and redirect even on error
      setUser(null)
      router.replace("/login")
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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

