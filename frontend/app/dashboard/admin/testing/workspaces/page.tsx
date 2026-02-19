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
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin/testing">
            <Button size="sm" className="bg-transparent text-gray-400 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Test Workspaces</h1>
            <p className="text-sm text-gray-400">
              Each workspace simulates one company scenario
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Workspace
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm text-gray-400">Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Q1 2025 Startup Test"
                  className="mt-1 bg-black/50 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Description</label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                  className="mt-1 bg-black/50 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Scenario Profile</label>
                <Select value={newScenario} onValueChange={setNewScenario}>
                  <SelectTrigger className="mt-1 bg-black/50 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10 z-[200]">
                    <SelectItem value="custom" className="text-white focus:bg-white/10 focus:text-white">Custom</SelectItem>
                    <SelectItem value="startup_60" className="text-white focus:bg-white/10 focus:text-white">60-Person Startup</SelectItem>
                    <SelectItem value="agency_25" className="text-white focus:bg-white/10 focus:text-white">25-Person Agency</SelectItem>
                    <SelectItem value="scaleup_200" className="text-white focus:bg-white/10 focus:text-white">200-Person Scale-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={createWorkspace}
                disabled={creating || !newName.trim()}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Create Workspace
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workspace List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      ) : workspaces.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No workspaces yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <Card
              key={ws.id}
              className="bg-white/5 border-white/10 hover:border-cyan-500/30 transition-colors"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Link href={`/dashboard/admin/testing/workspaces/${ws.id}`}>
                    <h3 className="text-white font-semibold hover:text-cyan-400 transition-colors">
                      {ws.name}
                    </h3>
                  </Link>
                  <Badge
                    variant="outline"
                    className="text-xs border-white/20 text-gray-400"
                  >
                    {scenarioLabels[ws.scenario_profile] || ws.scenario_profile}
                  </Badge>
                </div>

                {ws.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                    {ws.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    {ws.upload_count} uploads
                  </span>
                  <span className="flex items-center gap-1">
                    <FileBarChart className="w-3.5 h-3.5" />
                    {ws.analysis_count} analyses
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {new Date(ws.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/admin/testing/workspaces/${ws.id}`}>
                      <Button size="sm" className="border border-white/10 bg-transparent text-white hover:bg-white/10 rounded-md h-8">
                        Open
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="bg-transparent text-gray-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                      onClick={() => setConfirmDeleteId(ws.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDeleteId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null) }}>
        <DialogContent className="bg-gray-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete{" "}
              <span className="text-white font-medium">
                {workspaces.find((w) => w.id === confirmDeleteId)?.name}
              </span>
              ? This will remove all uploads, analyses, and logs associated with this workspace. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              className="bg-transparent border border-white/10 text-white hover:bg-white/10"
              onClick={() => setConfirmDeleteId(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => confirmDeleteId && archiveWorkspace(confirmDeleteId)}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {deleting ? "Deleting..." : "Delete Workspace"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
