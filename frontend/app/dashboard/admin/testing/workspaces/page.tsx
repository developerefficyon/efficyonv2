"use client"

import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FolderOpen,
  Plus,
  Loader2,
  Upload,
  FileBarChart,
  ArrowLeft,
  Trash2,
} from "lucide-react"

interface Workspace {
  id: string
  name: string
  description: string | null
  scenario_profile: string
  status: string
  metadata: Record<string, any>
  upload_count: number
  analysis_count: number
  created_at: string
}

const scenarioLabels: Record<string, string> = {
  startup_60: "60-Person Startup",
  agency_25: "25-Person Agency",
  scaleup_200: "200-Person Scale-up",
  custom: "Custom",
}

export default function WorkspacesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newScenario, setNewScenario] = useState("custom")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/dashboard")
    }
  }, [user, authLoading, router])

  async function fetchWorkspaces() {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/workspaces`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setWorkspaces(data.workspaces)
      }
    } catch (err) {
      console.error("Failed to fetch workspaces:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === "admin") {
      fetchWorkspaces()
    }
  }, [user])

  async function createWorkspace() {
    if (!newName.trim()) return
    setCreating(true)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/workspaces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
          scenario_profile: newScenario,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setDialogOpen(false)
        setNewName("")
        setNewDescription("")
        setNewScenario("custom")
        router.push(`/dashboard/admin/testing/workspaces/${data.workspace.id}`)
      }
    } catch (err) {
      console.error("Failed to create workspace:", err)
    } finally {
      setCreating(false)
    }
  }

  async function archiveWorkspace(id: string) {
    setDeleting(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/workspaces/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const deletedName = workspaces.find((w) => w.id === id)?.name || "Workspace"
        setWorkspaces((prev) => prev.filter((w) => w.id !== id))
        setConfirmDeleteId(null)
        toast.success(`"${deletedName}" has been deleted`)
      } else {
        const err = await res.json()
        toast.error(`Failed to delete: ${err.error}`)
      }
    } catch (err) {
      console.error("Failed to archive workspace:", err)
      toast.error("Network error while deleting workspace")
    } finally {
      setDeleting(false)
    }
  }

  if (authLoading || !user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-cyan-400/60 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/admin/testing">
            <Button size="sm" className="bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.06] rounded-lg h-8 text-[12px] mt-1">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <p className="text-[13px] text-white/30 font-medium mb-1">Sandbox Environment</p>
            <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight">
              Test <span className="italic text-cyan-400/90">Workspaces</span>
            </h2>
            <p className="text-[14px] text-white/35 mt-1">
              Each workspace simulates one company scenario
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white/80 rounded-lg h-9 text-[12px]">
              <Plus className="w-3.5 h-3.5 mr-2" />
              New Workspace
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0a0a0a] border-white/[0.08] text-white">
            <DialogHeader>
              <DialogTitle className="text-[15px] font-medium text-white/80">Create Workspace</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-[12px] text-white/40">Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Q1 2025 Startup Test"
                  className="mt-1.5 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 h-9 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[12px] text-white/40">Description</label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                  className="mt-1.5 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 h-9 text-[13px]"
                />
              </div>
              <div>
                <label className="text-[12px] text-white/40">Scenario Profile</label>
                <Select value={newScenario} onValueChange={setNewScenario}>
                  <SelectTrigger className="mt-1.5 bg-white/[0.03] border-white/[0.06] text-white h-9 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0a] border-white/[0.08] z-[200]">
                    <SelectItem value="custom" className="text-white/60 focus:bg-white/[0.06] focus:text-white text-[13px]">Custom</SelectItem>
                    <SelectItem value="startup_60" className="text-white/60 focus:bg-white/[0.06] focus:text-white text-[13px]">60-Person Startup</SelectItem>
                    <SelectItem value="agency_25" className="text-white/60 focus:bg-white/[0.06] focus:text-white text-[13px]">25-Person Agency</SelectItem>
                    <SelectItem value="scaleup_200" className="text-white/60 focus:bg-white/[0.06] focus:text-white text-[13px]">200-Person Scale-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={createWorkspace}
                disabled={creating || !newName.trim()}
                className="w-full bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg h-9 text-[13px]"
              >
                {creating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                ) : null}
                Create Workspace
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workspace List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-3 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="h-4 w-32 bg-white/[0.06] rounded" />
                <div className="h-5 w-20 bg-white/[0.04] rounded-full" />
              </div>
              <div className="h-3 w-48 bg-white/[0.04] rounded" />
              <div className="flex gap-4">
                <div className="h-3 w-16 bg-white/[0.04] rounded" />
                <div className="h-3 w-16 bg-white/[0.04] rounded" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="h-3 w-20 bg-white/[0.03] rounded" />
                <div className="h-7 w-14 bg-white/[0.04] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <div className="p-12 text-center">
            <FolderOpen className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-[14px] text-white/25">No workspaces yet. Create one to get started.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="bg-white/[0.02] border border-white/[0.06] rounded-xl card-hover-lift transition-all duration-300"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Link href={`/dashboard/admin/testing/workspaces/${ws.id}`}>
                    <h3 className="text-[14px] font-medium text-white/80 hover:text-emerald-400/90 transition-colors cursor-pointer">
                      {ws.name}
                    </h3>
                  </Link>
                  <Badge
                    variant="outline"
                    className="border-white/[0.06] text-white/30 text-[10px] font-normal"
                  >
                    {scenarioLabels[ws.scenario_profile] || ws.scenario_profile}
                  </Badge>
                </div>

                {ws.description && (
                  <p className="text-[12px] text-white/25 mb-3 line-clamp-2">
                    {ws.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-[12px] text-white/30 mb-4">
                  <span className="flex items-center gap-1.5">
                    <Upload className="w-3 h-3" />
                    {ws.upload_count} uploads
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileBarChart className="w-3 h-3" />
                    {ws.analysis_count} analyses
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/20">
                    {new Date(ws.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/admin/testing/workspaces/${ws.id}`}>
                      <Button size="sm" className="bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white/80 rounded-md h-7 text-[11px] px-3">
                        Open
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="bg-transparent text-white/20 hover:text-red-400/80 hover:bg-red-500/10 h-7 w-7 p-0 rounded-md"
                      onClick={() => setConfirmDeleteId(ws.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDeleteId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null) }}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08] text-white">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-medium text-white/80">Delete Workspace</DialogTitle>
            <DialogDescription className="text-[13px] text-white/35 mt-2">
              Are you sure you want to delete{" "}
              <span className="text-white/70 font-medium">
                {workspaces.find((w) => w.id === confirmDeleteId)?.name}
              </span>
              ? This will remove all uploads, analyses, and logs associated with this workspace. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              className="bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white/80 rounded-lg h-9 text-[12px]"
              onClick={() => setConfirmDeleteId(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-500/20 border border-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg h-9 text-[12px]"
              onClick={() => confirmDeleteId && archiveWorkspace(confirmDeleteId)}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 mr-2" />
              )}
              {deleting ? "Deleting..." : "Delete Workspace"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
