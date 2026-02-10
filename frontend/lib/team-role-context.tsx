"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth, getBackendToken } from "@/lib/auth-hooks"

type TeamRole = "owner" | "editor" | "viewer" | null

interface TeamRoleContextType {
  teamRole: TeamRole
  isOwner: boolean
  isEditor: boolean
  isViewer: boolean
  canWrite: boolean
  canManageTeam: boolean
  canManageBilling: boolean
  isLoading: boolean
  refreshTeamRole: () => Promise<void>
}

const TeamRoleContext = createContext<TeamRoleContextType>({
  teamRole: null,
  isOwner: true,
  isEditor: false,
  isViewer: false,
  canWrite: true,
  canManageTeam: true,
  canManageBilling: true,
  isLoading: true,
  refreshTeamRole: async () => {},
})

export function TeamRoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [teamRole, setTeamRole] = useState<TeamRole>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchTeamRole = useCallback(async () => {
    if (!user?.id) {
      setTeamRole(null)
      setIsLoading(false)
      return
    }

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()
      if (!accessToken) {
        setTeamRole("owner")
        setIsLoading(false)
        return
      }

      const res = await fetch(`${apiBase}/api/team/members`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (res.ok) {
        const data = await res.json()
        const me = data.members?.find((m: any) => m.user?.id === user.id)
        setTeamRole((me?.role as TeamRole) || "owner")
      } else {
        // If team endpoint fails, default to owner (solo user)
        setTeamRole("owner")
      }
    } catch {
      // Non-critical, default to owner
      setTeamRole("owner")
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchTeamRole()
  }, [fetchTeamRole])

  const isOwner = !teamRole || teamRole === "owner"
  const isEditor = teamRole === "editor"
  const isViewer = teamRole === "viewer"
  const canWrite = isOwner || isEditor
  const canManageTeam = isOwner
  const canManageBilling = isOwner

  return (
    <TeamRoleContext.Provider
      value={{
        teamRole,
        isOwner,
        isEditor,
        isViewer,
        canWrite,
        canManageTeam,
        canManageBilling,
        isLoading,
        refreshTeamRole: fetchTeamRole,
      }}
    >
      {children}
    </TeamRoleContext.Provider>
  )
}

export function useTeamRole() {
  return useContext(TeamRoleContext)
}
