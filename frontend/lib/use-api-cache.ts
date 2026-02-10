"use client"

import { useState, useEffect, useCallback, useRef } from "react"

// Module-level cache — survives page navigations within SPA
const cache = new Map<string, { data: any; timestamp: number }>()

/**
 * Get cached data for a key (for light-touch usage in complex pages)
 */
export function getCache<T = any>(key: string): T | null {
  const entry = cache.get(key)
  return entry ? (entry.data as T) : null
}

/**
 * Set cached data for a key (for light-touch usage in complex pages)
 */
export function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() })
}

/**
 * Invalidate (remove) a specific cache entry
 */
export function invalidateCache(key: string): void {
  cache.delete(key)
}

/**
 * Clear all cache entries (call on logout)
 */
export function clearAllCache(): void {
  cache.clear()
}

interface UseApiCacheOptions {
  enabled?: boolean
}

interface UseApiCacheResult<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Stale-while-revalidate API cache hook.
 *
 * - Cache hit: returns cached data immediately (isLoading = false), silently revalidates in background
 * - Cache miss: shows loading (isLoading = true), fetches data
 * - refresh(): force refetch without showing loading spinner (keeps current data visible)
 */
export function useApiCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: UseApiCacheOptions
): UseApiCacheResult<T> {
  const enabled = options?.enabled ?? true
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const [data, setData] = useState<T | null>(() => {
    const entry = cache.get(key)
    return entry ? (entry.data as T) : null
  })

  const [isLoading, setIsLoading] = useState(() => {
    return !cache.has(key)
  })

  const [error, setError] = useState<string | null>(null)
  const isFetchingRef = useRef(false)

  const doFetch = useCallback(
    async (showLoading: boolean) => {
      if (isFetchingRef.current) return
      isFetchingRef.current = true

      if (showLoading) setIsLoading(true)

      try {
        const result = await fetcherRef.current()
        cache.set(key, { data: result, timestamp: Date.now() })
        setData(result)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setIsLoading(false)
        isFetchingRef.current = false
      }
    },
    [key]
  )

  // On mount: use cached data if available, always revalidate
  useEffect(() => {
    if (!enabled) return

    const entry = cache.get(key)
    if (entry) {
      // Cache hit — show cached data, silent revalidate
      setData(entry.data as T)
      setIsLoading(false)
      doFetch(false)
    } else {
      // Cache miss — show loading, fetch
      doFetch(true)
    }
  }, [key, enabled, doFetch])

  // Manual refresh — never shows loading spinner
  const refresh = useCallback(async () => {
    isFetchingRef.current = false // reset in case previous fetch is stuck
    await doFetch(false)
  }, [doFetch])

  return { data, isLoading, error, refresh }
}
