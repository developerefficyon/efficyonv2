"use client"

import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  FlaskConical,
  FolderOpen,
  FileBarChart,
  BookTemplate,
  Plus,
  ArrowRight,
  Clock,
} from "lucide-react"

interface TestingStats {
  workspaceCount: number
  analysisCount: number
  templateCount: number
  scheduleCount: number
  recentAnalyses: {
    id: string
    analysis_type: string
    status: string
    integration_labels: string[]
    duration_ms: number | null
    created_at: string
  }[]
}

export default function TestingDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<TestingStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/dashboard")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function fetchStats() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
        const token = await getBackendToken()
        if (!token) return

        const [wsRes, tmplRes, schedRes] = await Promise.all([
          fetch(`${apiBase}/api/test/workspaces`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${apiBase}/api/test/templates`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${apiBase}/api/test/schedules`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        const wsData = wsRes.ok ? await wsRes.json() : { workspaces: [] }
        const tmplData = tmplRes.ok ? await tmplRes.json() : { templates: [] }
        const schedData = schedRes.ok ? await schedRes.json() : { schedules: [] }

        const totalAnalyses = wsData.workspaces.reduce(
          (sum: number, w: any) => sum + (w.analysis_count || 0),
          0
        )

        setStats({
          workspaceCount: wsData.workspaces.length,
          analysisCount: totalAnalyses,
          templateCount: tmplData.templates.length,
          scheduleCount: schedData.schedules.length,
          recentAnalyses: [],
        })
      } catch (err) {
        console.error("Failed to fetch testing stats:", err)
      } finally {
        setLoading(false)
      }
    }

    if (user?.role === "admin") {
      fetchStats()
    }
  }, [user])

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
      <div className="flex items-center justify-between animate-slide-up delay-0">
        <div>
          <p className="text-[13px] text-white/30 font-medium mb-1">Internal QA</p>
          <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight">
            Testing <span className="italic text-cyan-400/90">System</span>
          </h2>
          <p className="text-[14px] text-white/35 mt-1">Workspaces, templates, and analysis runs</p>
        </div>
        <Link href="/dashboard/admin/testing/workspaces">
          <Button className="bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white/80 rounded-lg h-8 text-[12px] gap-1.5 px-3">
            <Plus className="w-3.5 h-3.5" /> New Workspace
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/dashboard/admin/testing/workspaces">
          <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-1">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-cyan-500/10 flex items-center justify-center">
                  <FolderOpen className="w-3.5 h-3.5 text-cyan-400/70" />
                </div>
                <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Workspaces</span>
              </div>
              <p className="text-3xl font-semibold text-white tracking-tight">
                {loading ? "\u2014" : stats?.workspaceCount || 0}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center">
                <FileBarChart className="w-3.5 h-3.5 text-blue-400/70" />
              </div>
              <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Analyses Run</span>
            </div>
            <p className="text-3xl font-semibold text-white tracking-tight">
              {loading ? "\u2014" : stats?.analysisCount || 0}
            </p>
          </CardContent>
        </Card>

        <Link href="/dashboard/admin/testing/templates">
          <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-3">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-purple-500/10 flex items-center justify-center">
                  <BookTemplate className="w-3.5 h-3.5 text-purple-400/70" />
                </div>
                <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Templates</span>
              </div>
              <p className="text-3xl font-semibold text-white tracking-tight">
                {loading ? "\u2014" : stats?.templateCount || 0}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/testing/schedules">
          <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl card-hover-lift animate-slide-up delay-4">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-amber-400/70" />
                </div>
                <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Schedules</span>
              </div>
              <p className="text-3xl font-semibold text-white tracking-tight">
                {loading ? "\u2014" : stats?.scheduleCount || 0}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[14px] font-medium text-white/80">Workspaces</span>
            </div>
            <p className="text-[12px] text-white/30 mb-4">
              Create test workspaces representing simulated companies. Upload data, run analyses, and evaluate results.
            </p>
            <Link href="/dashboard/admin/testing/workspaces">
              <Button className="bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] rounded-lg h-8 text-[12px] gap-1.5 px-3">
                Manage Workspaces
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[14px] font-medium text-white/80">Analysis Templates</span>
            </div>
            <p className="text-[12px] text-white/30 mb-4">
              Manage and version analysis templates — Cleanup Crew, Compliance Guard, Growth Scaler, Deep-Dive Forensic.
            </p>
            <Link href="/dashboard/admin/testing/templates">
              <Button className="bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] rounded-lg h-8 text-[12px] gap-1.5 px-3">
                Manage Templates
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/[0.06] rounded-xl animate-slide-up delay-5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[14px] font-medium text-white/80">Agent Schedules</span>
            </div>
            <p className="text-[12px] text-white/30 mb-4">
              Schedule automated improvement cycles, analyses, and stress tests to run on a cron schedule.
            </p>
            <Link href="/dashboard/admin/testing/schedules">
              <Button className="bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] rounded-lg h-8 text-[12px] gap-1.5 px-3">
                Manage Schedules
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
