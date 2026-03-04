"use client"

import React from "react"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "@/components/ui/sonner"
import { PostHogProvider } from "@/components/posthog-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PostHogProvider>
        {children}
      </PostHogProvider>
      <Toaster richColors position="top-right" />
    </SessionProvider>
  )
}

