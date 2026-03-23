"use client"

import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Loader2,
  ArrowLeft,
  BookTemplate,
  Edit,
  History,
} from "lucide-react"
const TemplateEditor = dynamic(
  () => import("@/components/testing/template-editor").then((m) => m.TemplateEditor),
  { loading: () => <div className="flex justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-violet-400/60 animate-spin" /></div> }
)

interface Template {
  id: string
  slug: string
  name: string
  version: number
  is_active: boolean
  objective: string
  targeting_scope: any
  ai_prompt_logic: string
  primary_kpi: string
  kpi_description: string | null
  applicable_integrations: string[]
  parameters: Record<string, any>
  created_at: string
}

export default function TemplatesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/dashboard")
    }
  }, [user, authLoading, router])

  async function fetchTemplates() {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/templates?include_inactive=true`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates)
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === "admin") {
      fetchTemplates()
    }
  }, [user])

  function handleEdit(template: Template) {
    setEditingTemplate(template)
    setDialogOpen(true)
  }

  async function handleSave(updates: Partial<Template>) {
    if (!editingTemplate) return

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/templates/${editingTemplate.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })

      if (res.ok) {
        setDialogOpen(false)
        setEditingTemplate(null)
        fetchTemplates()
      }
    } catch (err) {
      console.error("Failed to update template:", err)
    }
  }

  // Group templates by slug
  const templatesBySlug: Record<string, Template[]> = {}
  templates.forEach((t) => {
    if (!templatesBySlug[t.slug]) {
      templatesBySlug[t.slug] = []
    }
    templatesBySlug[t.slug].push(t)
  })

  if (authLoading || !user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-violet-400/60 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden relative grain-overlay">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/testing">
          <Button size="sm" className="bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.06] rounded-lg h-8 text-[12px] shadow-none">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <p className="text-[13px] text-white/30 font-medium mb-1">Template Management</p>
          <h2 className="text-3xl sm:text-4xl font-display text-white tracking-tight">
            Analysis <span className="italic text-violet-400/90">Templates</span>
          </h2>
          <p className="text-[14px] text-white/35 mt-1">
            Versioned templates with AI prompts, targeting scope, and KPIs
          </p>
        </div>
      </div>

      {/* Template List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-40 bg-white/[0.06] rounded" />
                    <div className="h-5 w-12 bg-white/[0.04] rounded-full" />
                  </div>
                  <div className="h-4 w-64 bg-white/[0.04] rounded" />
                </div>
                <div className="h-8 w-16 bg-white/[0.04] rounded-lg" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04] h-16" />
                <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04] h-16" />
                <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04] h-16" />
              </div>
              <div className="mt-4 bg-white/[0.02] rounded-lg p-3 border border-white/[0.04] h-20" />
            </div>
          ))}
        </div>
      ) : Object.keys(templatesBySlug).length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <div className="p-12 text-center">
            <BookTemplate className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/25 text-[14px]">
              No templates found. Run the seed script to populate initial templates.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(templatesBySlug).map(([slug, versions], idx) => {
            const active = versions.find((v) => v.is_active) || versions[0]
            return (
              <div
                key={slug}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl animate-slide-up"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-medium text-white/80">
                          {active.name}
                        </h3>
                        <Badge className="bg-cyan-500/10 text-cyan-400/80 border border-cyan-500/15 text-[10px] shadow-none">
                          v{active.version}
                        </Badge>
                        {versions.length > 1 && (
                          <Badge variant="outline" className="border-white/[0.06] text-white/30 text-[10px] shadow-none">
                            <History className="w-3 h-3 mr-1" />
                            {versions.length} versions
                          </Badge>
                        )}
                      </div>
                      <p className="text-[13px] text-white/35 mt-1">{active.objective}</p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white/80 rounded-lg h-8 text-[12px] shadow-none"
                      onClick={() => handleEdit(active)}
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                      <p className="text-[10px] text-white/25 uppercase tracking-wider">Primary KPI</p>
                      <p className="text-[13px] text-white/70 font-medium mt-1">{active.primary_kpi}</p>
                      {active.kpi_description && (
                        <p className="text-[11px] text-white/25 mt-0.5">{active.kpi_description}</p>
                      )}
                    </div>

                    <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                      <p className="text-[10px] text-white/25 uppercase tracking-wider">Integrations</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {active.applicable_integrations.map((i) => (
                          <Badge key={i} variant="outline" className="border-white/[0.06] text-white/40 text-[10px] shadow-none">
                            {i}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                      <p className="text-[10px] text-white/25 uppercase tracking-wider">Targets</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {active.targeting_scope?.targets?.slice(0, 3).map((t: string) => (
                          <Badge key={t} variant="outline" className="border-white/[0.06] text-white/40 text-[10px] shadow-none">
                            {t.replace(/_/g, " ")}
                          </Badge>
                        ))}
                        {(active.targeting_scope?.targets?.length || 0) > 3 && (
                          <Badge variant="outline" className="border-white/[0.06] text-white/25 text-[10px] shadow-none">
                            +{active.targeting_scope.targets.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">AI Prompt</p>
                    <p className="text-[12px] text-white/40 line-clamp-3 font-mono">
                      {active.ai_prompt_logic}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white/80 font-medium">
              Edit Template — {editingTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <TemplateEditor
              template={editingTemplate}
              onSave={handleSave}
              onCancel={() => setDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
