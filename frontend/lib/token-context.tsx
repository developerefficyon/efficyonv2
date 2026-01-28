"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth, getBackendToken } from "./auth-hooks"

interface TokenBalance {
  total: number
  used: number
  available: number
  planTier: string
}

interface TokenContextType {
  tokenBalance: TokenBalance | null
  isLoading: boolean
  refreshTokenBalance: () => Promise<void>
  lowTokenWarning: boolean
  noTokens: boolean
}

const TokenContext = createContext<TokenContextType | undefined>(undefined)

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const userId = user?.id

  const refreshTokenBalance = useCallback(async () => {
    if (!userId) {
      setTokenBalance(null)
      setIsLoading(false)
      return
    }

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        console.warn("[Token] No valid session token")
        setIsLoading(false)
        return
      }

      const response = await fetch(`${apiBase}/api/stripe/token-balance`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.tokenBalance) {
          setTokenBalance({
            total: data.tokenBalance.total || 0,
            used: data.tokenBalance.used || 0,
            available: data.tokenBalance.available || 0,
            planTier: data.tokenBalance.planTier || "free",
          })
        }
      } else {
        console.warn("[Token] Failed to fetch token balance:", response.status)
      }
    } catch (error) {
      console.error("[Token] Error fetching token balance:", error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Fetch token balance when user changes
  useEffect(() => {
    refreshTokenBalance()
  }, [refreshTokenBalance])

  // Low token warning: when available <= 2 and total > 0
  const lowTokenWarning = tokenBalance
    ? tokenBalance.available <= 2 && tokenBalance.total > 0
    : false

  // No tokens: when total is 0 (free plan) or available is 0
  const noTokens = tokenBalance
    ? tokenBalance.available === 0
    : false

  return (
    <TokenContext.Provider
      value={{
        tokenBalance,
        isLoading,
        refreshTokenBalance,
        lowTokenWarning,
        noTokens,
      }}
    >
      {children}
    </TokenContext.Provider>
  )
}

export function useTokens() {
  const context = useContext(TokenContext)
  if (context === undefined) {
    throw new Error("useTokens must be used within a TokenProvider")
  }
  return context
}
