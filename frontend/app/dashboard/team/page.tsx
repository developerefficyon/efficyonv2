"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Users,
  UserPlus,
  Mail,
  Clock,
  Crown,
  Pencil,
  Eye,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Loader2,
  Send,
  X,
  Shield,
} from "lucide-react"
import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { getCache, setCache } from "@/lib/use-api-cache"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface TeamMember {
  id: string
  role: "owner" | "editor" | "viewer"
  status: string
  joined_at: string
  created_at: string
  user: {
    id: string
    email: string
    full_name: string | null
  }
}

interface PendingInvitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
}

interface TeamLimits {
  current: number
  max: number
  canAddMore: boolean
  planTier: string
  planName: string
  pendingInvitations: number
}

const ROLE_CONFIG = {
  owner: { label: "Owner", icon: Crown, color: "bg-violet-500/10 text-violet-400/80 border-violet-500/15" },
  editor: { label: "Editor", icon: Pencil, color: "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15" },
  viewer: { label: "View Only", icon: Eye, color: "bg-white/[0.04] text-white/40 border-white/[0.06]" },
}

export default function TeamPage() {
  const { user } = useAuth()
  const cachedTeam = getCache<{ members: TeamMember[]; invitations: PendingInvitation[]; limits: TeamLimits | null }>("team-data")
  const [members, setMembers] = useState<TeamMember[]>(cachedTeam?.members || [])
  const [invitations, setInvitations] = useState<PendingInvitation[]>(cachedTeam?.invitations || [])
  const [limits, setLimits] = useState<TeamLimits | null>(cachedTeam?.limits || null)
  const [isLoading, setIsLoading] = useState(!cachedTeam)
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")

  // Invite modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<string>("viewer")
  const [isSending, setIsSending] = useState(false)

  // Role change modal
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [newRole, setNewRole] = useState<string>("")

  // Role change loading
  const [isSavingRole, setIsSavingRole] = useState(false)

  // Remove confirmation
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // Per-invitation loading states
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  // Set currentUserRole from cache on initial render if available
  useEffect(() => {
    if (cachedTeam?.members && user?.id) {
      const me = cachedTeam.members.find((m) => m.user?.id === user.id)
      if (me) setCurrentUserRole(me.role)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTeamData()
  }, [user])

  async function fetchTeamData() {
    // Only show loading spinner if no cached data
    if (!getCache("team-data")) {
      setIsLoading(true)
    }
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/team/members`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        const fetchedMembers = data.members || []
        const fetchedInvitations = data.pendingInvitations || []
        const fetchedLimits = data.limits || null

        setMembers(fetchedMembers)
        setInvitations(fetchedInvitations)
        setLimits(fetchedLimits)

        // Save to module-level cache
        setCache("team-data", { members: fetchedMembers, invitations: fetchedInvitations, limits: fetchedLimits })

        const me = fetchedMembers.find((m: TeamMember) => m.user?.id === user?.id)
        setCurrentUserRole(me?.role || "")
      }
    } catch (error) {
      console.error("Error fetching team data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const isOwner = currentUserRole === "owner"
  const seatsRemaining = limits ? limits.max - limits.current - limits.pendingInvitations : 0

  const filteredMembers = members.filter((m) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (m.user?.full_name || "").toLowerCase().includes(q) ||
      (m.user?.email || "").toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    )
  })

  async function handleInvite() {
    if (!inviteEmail) {
      toast.error("Email is required")
      return
    }

    setIsSending(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()

      const res = await fetch(`${apiBase}/api/team/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })

      if (res.ok) {
        toast.success("Invitation sent successfully")
        setIsInviteModalOpen(false)
        setInviteEmail("")
        setInviteRole("viewer")
        fetchTeamData()
      } else {
        const data = await res.json()
        toast.error(data.message || data.error || "Failed to send invitation")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setIsSending(false)
    }
  }

  async function handleRoleChange() {
    if (!selectedMember || !newRole) return

    setIsSavingRole(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()

      const res = await fetch(`${apiBase}/api/team/members/${selectedMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      })

      if (res.ok) {
        toast.success("Role updated successfully")
        setIsRoleModalOpen(false)
        setSelectedMember(null)
        setNewRole("")
        fetchTeamData()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to update role")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setIsSavingRole(false)
    }
  }

  async function handleRemoveMember() {
    if (!memberToRemove) return

    setIsRemoving(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()

      const res = await fetch(`${apiBase}/api/team/members/${memberToRemove.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success("Team member removed")
        setIsRemoveDialogOpen(false)
        setMemberToRemove(null)
        fetchTeamData()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to remove member")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setIsRemoving(false)
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    setRevokingId(invitationId)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()

      const res = await fetch(`${apiBase}/api/team/invitations/${invitationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success("Invitation revoked")
        fetchTeamData()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to revoke invitation")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setRevokingId(null)
    }
  }

  async function handleResendInvitation(invitationId: string) {
    setResendingId(invitationId)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()

      const res = await fetch(`${apiBase}/api/team/invitations/${invitationId}/resend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success("Invitation resent")
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to resend invitation")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setResendingId(null)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
        <div className="animate-slide-up delay-0">
          <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight mb-1">
            Team <span className="italic text-emerald-400/90">Management</span>
          </h2>
          <p className="text-[14px] text-white/35">Manage team members and permissions</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white/[0.02] rounded-xl h-24 border border-white/[0.06]" />
          ))}
        </div>
        <div className="animate-pulse bg-white/[0.02] rounded-xl h-64 border border-white/[0.06]" />
      </div>
    )
  }

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-slide-up delay-0">
        <div>
          <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight mb-1">
            Team <span className="italic text-emerald-400/90">Management</span>
          </h2>
          <p className="text-[14px] text-white/35">Manage team members and permissions</p>
        </div>
        {isOwner && (
          <Button
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium h-9 px-4 text-[13px] rounded-lg w-full sm:w-auto disabled:opacity-50"
            onClick={() => setIsInviteModalOpen(true)}
            disabled={!limits?.canAddMore}
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Invite Member
          </Button>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-slide-up delay-1">
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-emerald-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Members</span>
            </div>
            <p className="text-3xl font-semibold text-white tracking-tight">{members.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-amber-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Pending</span>
            </div>
            <p className={`text-3xl font-semibold tracking-tight ${invitations.length > 0 ? "text-amber-400" : "text-white/40"}`}>{invitations.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-violet-500/10 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-violet-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Seats</span>
            </div>
            <div>
              <p className="text-3xl font-semibold text-white tracking-tight">
                {limits ? limits.current : 0}
                <span className="text-lg text-white/20 font-normal">/{limits?.max || 0}</span>
              </p>
              {limits && limits.max < 999 && (
                <div className="mt-2 w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400/60 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (limits.current / limits.max) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search ── */}
      <div className="animate-slide-up delay-2">
        <div className="relative">
          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
          <Input
            placeholder="Search team members..."
            className="pl-9 h-9 bg-white/[0.03] border-white/[0.06] text-white/80 placeholder:text-white/20 text-[12px] rounded-lg focus:border-emerald-500/30 focus:bg-white/[0.05] transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── Team Members ── */}
      <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-3">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4 text-white/30" />
            <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Team Members</span>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-8 h-8 mx-auto mb-2 text-white/10" />
              <p className="text-[12px] text-white/25">No team members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.04] hover:bg-transparent">
                    <TableHead className="text-white/30 text-[11px] font-medium uppercase tracking-wider">Member</TableHead>
                    <TableHead className="text-white/30 text-[11px] font-medium uppercase tracking-wider">Role</TableHead>
                    <TableHead className="text-white/30 text-[11px] font-medium uppercase tracking-wider hidden md:table-cell">Joined</TableHead>
                    {isOwner && (
                      <TableHead className="text-white/30 text-[11px] font-medium uppercase tracking-wider text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => {
                    const roleConfig = ROLE_CONFIG[member.role]
                    const RoleIcon = roleConfig.icon
                    return (
                      <TableRow key={member.id} className="border-white/[0.04] hover:bg-white/[0.02] group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400/80 to-teal-600/80 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-[10px] font-semibold">
                                {(member.user?.full_name || member.user?.email || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-white/80 truncate">
                                {member.user?.full_name || "Unknown"}
                                {member.user?.id === user?.id && (
                                  <span className="text-[10px] text-white/20 ml-1">(you)</span>
                                )}
                              </p>
                              <p className="text-[11px] text-white/25 truncate">{member.user?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1 text-[9px] h-[18px] px-1.5 rounded-full font-medium", roleConfig.color)}>
                            <RoleIcon className="w-2.5 h-2.5" />
                            {roleConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-[11px] text-white/25">{formatDate(member.joined_at)}</span>
                        </TableCell>
                        {isOwner && (
                          <TableCell className="text-right">
                            {member.role !== "owner" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-white/20 hover:text-white/60 hover:bg-white/[0.04] h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#141415] border-white/[0.08] rounded-lg">
                                  <DropdownMenuItem
                                    className="text-white/60 focus:text-white focus:bg-white/[0.06] text-[12px]"
                                    onClick={() => {
                                      setSelectedMember(member)
                                      setNewRole(member.role)
                                      setIsRoleModalOpen(true)
                                    }}
                                  >
                                    <Pencil className="w-3.5 h-3.5 mr-2" />
                                    Change Role
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-400/70 focus:text-red-400 focus:bg-red-500/[0.06] text-[12px]"
                                    onClick={() => {
                                      setMemberToRemove(member)
                                      setIsRemoveDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pending Invitations ── */}
      {isOwner && invitations.length > 0 && (
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-4">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <Mail className="w-4 h-4 text-amber-400/50" />
              <span className="text-[12px] text-white/40 font-medium uppercase tracking-wider">Pending Invitations</span>
            </div>
            <div className="space-y-1">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 -mx-1 rounded-lg hover:bg-white/[0.03] transition-colors gap-2 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-3.5 h-3.5 text-amber-400/60" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white/80 truncate">{inv.email}</p>
                      <div className="flex items-center gap-2 text-[11px] text-white/25">
                        <Badge className={cn("text-[9px] h-[16px] px-1 rounded-full font-medium", ROLE_CONFIG[inv.role as keyof typeof ROLE_CONFIG]?.color || "bg-white/[0.04] text-white/35")}>
                          {ROLE_CONFIG[inv.role as keyof typeof ROLE_CONFIG]?.label || inv.role}
                        </Badge>
                        <span>Expires {formatDate(inv.expires_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/25 hover:text-white/60 hover:bg-white/[0.04] h-6 px-2 text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleResendInvitation(inv.id)}
                      disabled={resendingId === inv.id || revokingId === inv.id}
                    >
                      {resendingId === inv.id ? (
                        <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-2.5 h-2.5 mr-0.5" />
                      )}
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/15 hover:text-red-400/70 hover:bg-red-500/[0.05] h-6 px-2 text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRevokeInvitation(inv.id)}
                      disabled={revokingId === inv.id || resendingId === inv.id}
                    >
                      {revokingId === inv.id ? (
                        <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                      ) : (
                        <X className="w-2.5 h-2.5 mr-0.5" />
                      )}
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      {/* ── Invite Modal ── */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="!bg-[#111113] !border-white/[0.08] text-white sm:max-w-md rounded-xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-[16px] font-medium text-white">Invite Team Member</DialogTitle>
            <DialogDescription className="text-[13px] text-white/35">
              Send an invitation email. They'll need to accept to join.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-white/60 text-[13px]">Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg focus:border-emerald-500/30"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/60 text-[13px]">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#141415] border-white/[0.08] rounded-lg z-[200]">
                  <SelectItem value="editor" className="text-white/60 text-[12px] focus:bg-white/[0.06] focus:text-white">
                    Editor — Run analyses & manage integrations
                  </SelectItem>
                  <SelectItem value="viewer" className="text-white/60 text-[12px] focus:bg-white/[0.06] focus:text-white">
                    View Only — View dashboards & reports
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {limits && (
              <p className="text-[11px] text-white/20">
                {seatsRemaining > 0
                  ? `${seatsRemaining} seat(s) remaining on ${limits.planName}`
                  : `No seats remaining. Upgrade to invite more.`}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsInviteModalOpen(false)}
              className="border border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg h-9 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={isSending || !inviteEmail || seatsRemaining <= 0}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium disabled:opacity-50 rounded-lg h-9 text-[13px]"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Role Change Modal ── */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="!bg-[#111113] !border-white/[0.08] text-white sm:max-w-sm rounded-xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-[16px] font-medium text-white">Change Role</DialogTitle>
            <DialogDescription className="text-[13px] text-white/35">
              Update the role for {selectedMember?.user?.full_name || selectedMember?.user?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/80 text-[13px] rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#141415] border-white/[0.08] rounded-lg z-[200]">
                <SelectItem value="editor" className="text-white/60 text-[12px] focus:bg-white/[0.06] focus:text-white">
                  Editor
                </SelectItem>
                <SelectItem value="viewer" className="text-white/60 text-[12px] focus:bg-white/[0.06] focus:text-white">
                  View Only
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsRoleModalOpen(false)}
              disabled={isSavingRole}
              className="border border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg h-9 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={isSavingRole}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium disabled:opacity-50 rounded-lg h-9 text-[13px]"
            >
              {isSavingRole ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Member Confirmation ── */}
      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent className="!bg-[#111113] !border-white/[0.08] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[16px] font-medium text-white">Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-white/35">
              Are you sure you want to remove{" "}
              <span className="text-white/70 font-medium">
                {memberToRemove?.user?.full_name || memberToRemove?.user?.email}
              </span>
              ? They will lose access to the workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isRemoving}
              className="border border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg h-9 text-[13px]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-red-500/90 hover:bg-red-500 text-white font-medium rounded-lg h-9 text-[13px]"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
