"use client"

import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  Play,
  Clock,
  ToggleLeft,
  ToggleRight,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react"

interface Schedule {
  id: string
  name: string
  workspace_id: string
  cron_expression: string
  schedule_type: string
  config: Record<string, any>
  enabled: boolean
  active_in_memory: boolean
  last_run_at: string | null
  last_run_status: string | null
  run_count: number
  created_at: string
}

const CRON_PRESETS = [
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at 2 AM", value: "0 2 * * *" },
  { label: "Weekly Monday", value: "0 2 * * 1" },
  { label: "Every 12 hours", value: "0 */12 * * *" },
]

const SCHEDULE_TYPES = ["improvement_cycle", "analysis_only", "stress_test"]

function getStatusBadge(status: string | null) {
  if (!status) return null

  switch (status) {
    case "completed":
      return (
        <Badge className="bg-green-500/10 text-green-400/80 border-green-500/15">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      )
    case "failed":
      return (
        <Badge className="bg-red-500/10 text-red-400/80 border-red-500/15">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      )
    case "running":
      return (
        <Badge className="bg-amber-500/10 text-amber-400/80 border-amber-500/15">
          <div className="relative w-3 h-3 mr-1">
            <div className="absolute inset-0 rounded-full border border-amber-400/30 border-t-transparent animate-spin" />
          </div>
          Running
        </Badge>
      )
    default:
      return (
        <Badge className="bg-white/[0.04] text-white/40 border-white/[0.06]">
          {status}
        </Badge>
      )
  }
}

export default function SchedulesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  // Create form state
  const [newName, setNewName] = useState("")
  const [newWorkspaceId, setNewWorkspaceId] = useState("")
  const [newCron, setNewCron] = useState("")
  const [newType, setNewType] = useState("improvement_cycle")
  const [newConfig, setNewConfig] = useState("{}")

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/dashboard")
    }
  }, [user, authLoading, router])

  const fetchSchedules = useCallback(async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/schedules`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setSchedules(data.schedules || [])
      }
    } catch (err) {
      console.error("Failed to fetch schedules:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role === "admin") {
      fetchSchedules()
    }
  }, [user, fetchSchedules])

  async function createSchedule() {
    if (!newName.trim() || !newWorkspaceId.trim() || !newCron.trim()) return
    setCreating(true)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      let parsedConfig: Record<string, any> = {}
      try {
        parsedConfig = JSON.parse(newConfig)
      } catch {
        alert("Invalid JSON in config field")
        setCreating(false)
        return
      }

      const res = await fetch(`${apiBase}/api/test/schedules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName.trim(),
          workspace_id: newWorkspaceId.trim(),
          cron_expression: newCron.trim(),
          schedule_type: newType,
          config: parsedConfig,
        }),
      })

      if (res.ok) {
        setShowCreateForm(false)
        setNewName("")
        setNewWorkspaceId("")
        setNewCron("")
        setNewType("improvement_cycle")
        setNewConfig("{}")
        fetchSchedules()
      } else {
        const errData = await res.json().catch(() => null)
        alert(errData?.error || "Failed to create schedule")
      }
    } catch (err) {
      console.error("Failed to create schedule:", err)
    } finally {
      setCreating(false)
    }
  }

  async function toggleSchedule(id: string) {
    setActionLoading((prev) => ({ ...prev, [id]: true }))
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/schedules/${id}/toggle`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        fetchSchedules()
      }
    } catch (err) {
      console.error("Failed to toggle schedule:", err)
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  async function runNow(id: string) {
    setActionLoading((prev) => ({ ...prev, [`run-${id}`]: true }))
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/schedules/${id}/run-now`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        fetchSchedules()
      }
    } catch (err) {
      console.error("Failed to run schedule:", err)
    } finally {
      setActionLoading((prev) => ({ ...prev, [`run-${id}`]: false }))
    }
  }

  async function deleteSchedule(id: string) {
    if (!confirm("Are you sure you want to delete this schedule?")) return

    setActionLoading((prev) => ({ ...prev, [`del-${id}`]: true }))
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/schedules/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setSchedules((prev) => prev.filter((s) => s.id !== id))
      }
    } catch (err) {
      console.error("Failed to delete schedule:", err)
    } finally {
      setActionLoading((prev) => ({ ...prev, [`del-${id}`]: false }))
    }
  }

  function truncateId(id: string, len = 8): string {
    return id.length > len ? id.slice(0, len) + "..." : id
  }

  if (authLoading || !user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
          <div className="absolute inset-0 rounded-full border-2 border-emerald-400/60 border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/testing">
            <Button
              size="sm"
              className="bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.06] rounded-lg h-8 text-[12px]"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <p className="text-[13px] text-white/30 font-medium mb-1">Automation</p>
            <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight">
              Agent <span className="italic text-amber-400/90">Schedules</span>
            </h2>
            <p className="text-[14px] text-white/35 mt-1">
              Manage cron-based automated agent runs
            </p>
          </div>
        </div>

        <Button
          className="bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] rounded-lg"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Schedule
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 space-y-4">
          <h2 className="text-[14px] font-medium text-white/80">New Schedule</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] text-white/40 block mb-1">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Nightly Improvement Cycle"
                className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20"
              />
            </div>

            <div>
              <label className="text-[12px] text-white/40 block mb-1">
                Workspace ID
              </label>
              <Input
                value={newWorkspaceId}
                onChange={(e) => setNewWorkspaceId(e.target.value)}
                placeholder="Enter workspace UUID"
                className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20"
              />
            </div>

            <div>
              <label className="text-[12px] text-white/40 block mb-1">
                Cron Expression
              </label>
              <Input
                value={newCron}
                onChange={(e) => setNewCron(e.target.value)}
                placeholder="0 2 * * *"
                className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {CRON_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setNewCron(preset.value)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      newCron === preset.value
                        ? "bg-white/[0.06] border-white/[0.08] text-white/70"
                        : "bg-white/[0.02] border-white/[0.06] text-white/30 hover:text-white/50"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[12px] text-white/40 block mb-1">
                Schedule Type
              </label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/[0.08] z-[200]">
                  {SCHEDULE_TYPES.map((type) => (
                    <SelectItem
                      key={type}
                      value={type}
                      className="text-white focus:bg-white/10 focus:text-white"
                    >
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-[12px] text-white/40 block mb-1">
              Config (JSON)
            </label>
            <textarea
              value={newConfig}
              onChange={(e) => setNewConfig(e.target.value)}
              placeholder="{}"
              rows={3}
              className="w-full bg-white/[0.03] border border-white/[0.06] text-white/80 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/10"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={createSchedule}
              disabled={
                creating ||
                !newName.trim() ||
                !newWorkspaceId.trim() ||
                !newCron.trim()
              }
              className="bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg"
            >
              {creating && (
                <div className="relative w-4 h-4 mr-2">
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-400/30 border-t-transparent animate-spin" />
                </div>
              )}
              Create Schedule
            </Button>
            <Button
              onClick={() => setShowCreateForm(false)}
              className="bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/60 hover:bg-white/[0.06] rounded-lg"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Schedule List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="h-4 w-32 bg-white/[0.04] rounded animate-pulse" />
                <div className="h-5 w-16 bg-white/[0.04] rounded-full animate-pulse" />
              </div>
              <div className="h-3 w-48 bg-white/[0.03] rounded animate-pulse mt-3" />
            </div>
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-12 text-center">
          <Clock className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/25">
            No schedules found. Create one to automate agent runs.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[15px] font-medium text-white/80">
                      {schedule.name}
                    </h3>
                    <Badge
                      className={
                        schedule.enabled
                          ? "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15"
                          : "bg-white/[0.04] text-white/30 border-white/[0.06]"
                      }
                    >
                      {schedule.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    {schedule.active_in_memory && (
                      <Badge className="bg-cyan-500/10 text-cyan-400/80 border-cyan-500/15">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Active in Memory
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-[12px] text-white/30 flex-wrap">
                    <span
                      className="font-mono"
                      title={schedule.workspace_id}
                    >
                      Workspace: {truncateId(schedule.workspace_id)}
                    </span>
                    <span className="font-mono">
                      Cron: {schedule.cron_expression}
                    </span>
                    <span>
                      Type: {schedule.schedule_type.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => toggleSchedule(schedule.id)}
                    disabled={!!actionLoading[schedule.id]}
                    className={`h-8 rounded-lg text-[12px] ${
                      schedule.enabled
                        ? "bg-transparent border border-amber-500/15 text-amber-400/80 hover:bg-amber-500/10"
                        : "bg-transparent border border-emerald-500/15 text-emerald-400/80 hover:bg-emerald-500/10"
                    }`}
                    title={schedule.enabled ? "Disable" : "Enable"}
                  >
                    {actionLoading[schedule.id] ? (
                      <div className="relative w-3.5 h-3.5">
                        <div className="absolute inset-0 rounded-full border border-white/20 border-t-transparent animate-spin" />
                      </div>
                    ) : schedule.enabled ? (
                      <ToggleRight className="w-3.5 h-3.5 mr-1" />
                    ) : (
                      <ToggleLeft className="w-3.5 h-3.5 mr-1" />
                    )}
                    {schedule.enabled ? "Disable" : "Enable"}
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => runNow(schedule.id)}
                    disabled={!!actionLoading[`run-${schedule.id}`]}
                    className="h-8 rounded-lg text-[12px] bg-transparent border border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
                    title="Run now"
                  >
                    {actionLoading[`run-${schedule.id}`] ? (
                      <div className="relative w-3.5 h-3.5 mr-1">
                        <div className="absolute inset-0 rounded-full border border-white/20 border-t-transparent animate-spin" />
                      </div>
                    ) : (
                      <Play className="w-3.5 h-3.5 mr-1" />
                    )}
                    Run Now
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => deleteSchedule(schedule.id)}
                    disabled={!!actionLoading[`del-${schedule.id}`]}
                    className="h-8 w-8 p-0 rounded-lg bg-transparent text-white/20 hover:text-red-400/80 hover:bg-red-500/10 border border-transparent hover:border-red-500/15"
                    title="Delete schedule"
                  >
                    {actionLoading[`del-${schedule.id}`] ? (
                      <div className="relative w-3.5 h-3.5">
                        <div className="absolute inset-0 rounded-full border border-white/20 border-t-transparent animate-spin" />
                      </div>
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Run stats */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.04] text-[12px] flex-wrap">
                <span className="text-white/30">
                  Runs:{" "}
                  <span className="text-white/60 font-medium">
                    {schedule.run_count}
                  </span>
                </span>

                {schedule.last_run_at && (
                  <span className="text-white/30">
                    Last run:{" "}
                    <span className="text-white/50">
                      {new Date(schedule.last_run_at).toLocaleString()}
                    </span>
                  </span>
                )}

                {schedule.last_run_status &&
                  getStatusBadge(schedule.last_run_status)}

                <span className="text-white/20 text-[11px] ml-auto">
                  Created {new Date(schedule.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
