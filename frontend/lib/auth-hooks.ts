"use client"

import { useSession, signIn, signOut, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useMemo } from "react"

type UserRole = "admin" | "user" | "customer"

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  onboardingCompleted?: boolean
}

interface AuthHook {
  user: User | null
  login: (email: string, password: string) => Promise<User | null>
  logout: () => Promise<void>
  isLoading: boolean
}

export function useAuth(): AuthHook {
  const { data: session, status } = useSession()
  const router = useRouter()

  const user: User | null = useMemo(() => {
    if (!session?.user) return null
    return {
      id: session.user.id,
      name: session.user.name || "",
      email: session.user.email || "",
      role: (session.user.role as UserRole) || "customer",
      onboardingCompleted: session.user.onboardingCompleted,
    }
  }, [session?.user?.id, session?.user?.name, session?.user?.email, session?.user?.role, session?.user?.onboardingCompleted])

  const login = async (email: string, password: string): Promise<User | null> => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      throw new Error(result.error)
    }

    // After successful signIn, fetch the updated session
    const updatedSession = await getSession()
    if (!updatedSession?.user) {
      throw new Error("INVALID_CREDENTIALS")
    }

    return {
      id: updatedSession.user.id,
      name: updatedSession.user.name || "",
      email: updatedSession.user.email || "",
      role: (updatedSession.user.role as UserRole) || "customer",
      onboardingCompleted: updatedSession.user.onboardingCompleted,
    }
  }

  const logout = async () => {
    _cachedToken = null
    _cacheTimestamp = 0
    _pendingRequest = null
    await signOut({ redirect: false })
    router.replace("/login")
  }

  return {
    user,
    login,
    logout,
    isLoading: status === "loading",
  }
}

/**
 * Get a valid backend token for API calls.
 * Drop-in replacement for getValidSessionToken().
 *
 * Uses caching and request deduplication to avoid flooding
 * /api/auth/session with concurrent requests from multiple components.
 */
let _cachedToken: string | null = null
let _cacheTimestamp = 0
let _pendingRequest: Promise<string | null> | null = null
const TOKEN_CACHE_TTL = 10_000 // 10 seconds

export async function getBackendToken(): Promise<string | null> {
  const now = Date.now()

  // Return cached token if still fresh
  if (_cachedToken && now - _cacheTimestamp < TOKEN_CACHE_TTL) {
    return _cachedToken
  }

  // Deduplicate: if a request is already in-flight, reuse it
  if (_pendingRequest) {
    return _pendingRequest
  }

  _pendingRequest = getSession()
    .then((session) => {
      _cachedToken = session?.backendToken || null
      _cacheTimestamp = Date.now()
      _pendingRequest = null
      return _cachedToken
    })
    .catch(() => {
      _pendingRequest = null
      return _cachedToken // return stale token on error rather than null
    })

  return _pendingRequest
}
