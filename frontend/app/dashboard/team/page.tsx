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
  owner: { label: "Owner", icon: Crown, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  editor: { label: "Editor", icon: Pencil, color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  viewer: { label: "View Only", icon: Eye, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
}

export default function TeamPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [limits, setLimits] = useState<TeamLimits | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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

  // Remove confirmation
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)

  useEffect(() => {
    fetchTeamData()
  }, [user])

  async function fetchTeamData() {
    setIsLoading(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/team/members`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setMembers(data.members || [])
        setInvitations(data.pendingInvitations || [])
        setLimits(data.limits || null)

        const me = (data.members || []).find((m: TeamMember) => m.user?.id === user?.id)
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
    }
  }

  async function handleRemoveMember() {
    if (!memberToRemove) return

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
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
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
    }
  }

  async function handleResendInvitation(invitationId: string) {
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
      <div className="space-y-6 w-full max-w-full overflow-x-hidden">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Team Management</h2>
          <p className="text-sm sm:text-base text-gray-400">Manage team members and permissions</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white/5 rounded-xl h-24 border border-white/10" />
          ))}
        </div>
        <div className="animate-pulse bg-white/5 rounded-xl h-64 border border-white/10" />
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Team Management</h2>
          <p className="text-sm sm:text-base text-gray-400">Manage team members and permissions</p>
        </div>
        {isOwner && (
          <Button
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white w-full sm:w-auto"
            onClick={() => setIsInviteModalOpen(true)}
            disabled={!limits?.canAddMore}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Team Member
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                <Users className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Members</p>
                <p className="text-2xl font-bold text-white">{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Pending Invitations</p>
                <p className="text-2xl font-bold text-amber-400">{invitations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                <Shield className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Seats Used</p>
                <p className="text-2xl font-bold text-white">
                  {limits ? `${limits.current}` : "0"}
                  <span className="text-sm font-normal text-gray-400"> / {limits?.max || 0}</span>
                </p>
              </div>
            </div>
            {limits && limits.max < 999 && (
              <div className="mt-2">
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (limits.current / limits.max) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardContent className="p-4">
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search team members..."
              className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Team Members Table */}
      <Card className="bg-black/80 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No team members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-gray-400 font-medium">Member</TableHead>
                    <TableHead className="text-gray-400 font-medium">Role</TableHead>
                    <TableHead className="text-gray-400 font-medium hidden md:table-cell">Joined</TableHead>
                    {isOwner && (
                      <TableHead className="text-gray-400 font-medium text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => {
                    const roleConfig = ROLE_CONFIG[member.role]
                    const RoleIcon = roleConfig.icon
                    return (
                      <TableRow key={member.id} className="border-white/10 hover:bg-white/5">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-sm font-bold">
                                {(member.user?.full_name || member.user?.email || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">
                                {member.user?.full_name || "Unknown"}
                                {member.user?.id === user?.id && (
                                  <span className="text-xs text-gray-500 ml-1">(you)</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-400 truncate">{member.user?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1", roleConfig.color)}>
                            <RoleIcon className="w-3 h-3" />
                            {roleConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-gray-400">{formatDate(member.joined_at)}</span>
                        </TableCell>
                        {isOwner && (
                          <TableCell className="text-right">
                            {member.role !== "owner" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/5">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-black border-white/10">
                                  <DropdownMenuItem
                                    className="text-gray-300 hover:text-white focus:text-white focus:bg-white/10"
                                    onClick={() => {
                                      setSelectedMember(member)
                                      setNewRole(member.role)
                                      setIsRoleModalOpen(true)
                                    }}
                                  >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Change Role
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-500/10"
                                    onClick={() => {
                                      setMemberToRemove(member)
                                      setIsRemoveDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
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

      {/* Pending Invitations */}
      {isOwner && invitations.length > 0 && (
        <Card className="bg-black/80 backdrop-blur-xl border-white/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-400" />
              <CardTitle className="text-white">Pending Invitations</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{inv.email}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Badge className={cn("text-[10px]", ROLE_CONFIG[inv.role as keyof typeof ROLE_CONFIG]?.color || "bg-gray-500/20 text-gray-400")}>
                          {ROLE_CONFIG[inv.role as keyof typeof ROLE_CONFIG]?.label || inv.role}
                        </Badge>
                        <span>Expires {formatDate(inv.expires_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-white/5 text-xs"
                      onClick={() => handleResendInvitation(inv.id)}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                      onClick={() => handleRevokeInvitation(inv.id)}
                    >
                      <X className="w-3 h-3 mr-1" />
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
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="bg-black border-white/10 sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-white">Invite Team Member</DialogTitle>
            <DialogDescription className="text-gray-400">
              Send an invitation email. They'll need to accept to join your team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-gray-300">Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                className="bg-black/50 border-white/10 text-white"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-black/50 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10 z-[200]">
                  <SelectItem value="editor" className="text-gray-300 focus:text-white focus:bg-white/10">
                    Editor — Can run analyses & manage integrations
                  </SelectItem>
                  <SelectItem value="viewer" className="text-gray-300 focus:text-white focus:bg-white/10">
                    View Only — Can view dashboards & reports
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {limits && (
              <p className="text-xs text-gray-500">
                {seatsRemaining > 0
                  ? `${seatsRemaining} seat(s) remaining on your ${limits.planName} plan`
                  : `No seats remaining. Upgrade your plan to invite more members.`}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInviteModalOpen(false)}
              className="border-white/10 bg-black/50 text-white hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={isSending || !inviteEmail || seatsRemaining <= 0}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Modal */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="bg-black border-white/10 sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-white">Change Role</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update the role for {selectedMember?.user?.full_name || selectedMember?.user?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="bg-black/50 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10 z-[200]">
                <SelectItem value="editor" className="text-gray-300 focus:text-white focus:bg-white/10">
                  Editor
                </SelectItem>
                <SelectItem value="viewer" className="text-gray-300 focus:text-white focus:bg-white/10">
                  View Only
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleModalOpen(false)}
              className="border-white/10 bg-black/50 text-white hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRoleChange}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent className="bg-black border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to remove{" "}
              <span className="text-white font-medium">
                {memberToRemove?.user?.full_name || memberToRemove?.user?.email}
              </span>{" "}
              from the team? They will lose access to the company workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-black/50 text-white hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
