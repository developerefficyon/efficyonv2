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
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isMounted) return

      if (session?.user) {
        const u = session.user
        const role = (u.user_metadata?.role as UserRole) || "user"
        const name = (u.user_metadata?.name as string) || ""
        setUser({
          id: u.id,
          email: u.email || "",
          name,
          role,
        })
      }

      setIsLoading(false)
    }

    void initSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null)
        return
      }
      const u = session.user
      const role = (u.user_metadata?.role as UserRole) || "user"
      const name = (u.user_metadata?.name as string) || ""
      setUser({
        id: u.id,
        email: u.email || "",
        name,
        role,
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

    // Fetch profile to check email_verified / admin_approved / role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role, email_verified, admin_approved, status")
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
    }
    setUser(userData)
    return userData
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push("/login")
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

