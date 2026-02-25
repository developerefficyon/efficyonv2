"use client"

import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FlaskConical,
  FolderOpen,
  FileBarChart,
  BookTemplate,
  Loader2,
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
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-cyan-400" />
            Testing System
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Internal AI agent testing — workspaces, templates, and analysis runs
          </p>
        </div>
        <Link href="/dashboard/admin/testing/workspaces">
          <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Workspace
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/dashboard/admin/testing/workspaces">
          <Card className="bg-white/5 border-white/10 hover:border-cyan-500/30 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Workspaces</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {loading ? "—" : stats?.workspaceCount || 0}
                  </p>
                </div>
                <FolderOpen className="w-10 h-10 text-cyan-400/30" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Analyses Run</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {loading ? "—" : stats?.analysisCount || 0}
                </p>
              </div>
              <FileBarChart className="w-10 h-10 text-blue-400/30" />
            </div>
          </CardContent>
        </Card>

        <Link href="/dashboard/admin/testing/templates">
          <Card className="bg-white/5 border-white/10 hover:border-cyan-500/30 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Templates</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {loading ? "—" : stats?.templateCount || 0}
                  </p>
                </div>
                <BookTemplate className="w-10 h-10 text-purple-400/30" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/admin/testing/schedules">
          <Card className="bg-white/5 border-white/10 hover:border-cyan-500/30 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Schedules</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {loading ? "—" : stats?.scheduleCount || 0}
                  </p>
                </div>
                <Clock className="w-10 h-10 text-amber-400/30" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">Workspaces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-400">
              Create test workspaces representing simulated companies. Upload data, run analyses, and evaluate results.
            </p>
            <Link href="/dashboard/admin/testing/workspaces">
              <Button className="border border-white/10 bg-transparent text-white hover:bg-white/10 rounded-md text-sm font-medium">
                Manage Workspaces
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">Analysis Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-400">
              Manage and version analysis templates — Cleanup Crew, Compliance Guard, Growth Scaler, Deep-Dive Forensic.
            </p>
            <Link href="/dashboard/admin/testing/templates">
              <Button className="border border-white/10 bg-transparent text-white hover:bg-white/10 rounded-md text-sm font-medium">
                Manage Templates
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">Agent Schedules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-400">
              Schedule automated improvement cycles, analyses, and stress tests to run on a cron schedule.
            </p>
            <Link href="/dashboard/admin/testing/schedules">
              <Button className="border border-white/10 bg-transparent text-white hover:bg-white/10 rounded-md text-sm font-medium">
                Manage Schedules
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
