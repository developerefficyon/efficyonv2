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
  { loading: () => <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div> }
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
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/testing">
          <Button size="sm" className="bg-transparent text-gray-400 hover:text-white hover:bg-white/5">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Analysis Templates</h1>
          <p className="text-sm text-gray-400">
            Versioned templates with AI prompts, targeting scope, and KPIs
          </p>
        </div>
      </div>

      {/* Template List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      ) : Object.keys(templatesBySlug).length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <BookTemplate className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              No templates found. Run the seed script to populate initial templates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(templatesBySlug).map(([slug, versions]) => {
            const active = versions.find((v) => v.is_active) || versions[0]
            return (
              <Card key={slug} className="bg-white/5 border-white/10">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold text-lg">
                          {active.name}
                        </h3>
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                          v{active.version}
                        </Badge>
                        {versions.length > 1 && (
                          <Badge variant="outline" className="border-white/20 text-gray-400">
                            <History className="w-3 h-3 mr-1" />
                            {versions.length} versions
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{active.objective}</p>
                    </div>
                    <Button
                      size="sm"
                      className="border border-white/10 bg-transparent text-white hover:bg-white/10 rounded-md"
                      onClick={() => handleEdit(active)}
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Primary KPI</p>
                      <p className="text-sm text-white font-medium mt-1">{active.primary_kpi}</p>
                      {active.kpi_description && (
                        <p className="text-xs text-gray-500 mt-0.5">{active.kpi_description}</p>
                      )}
                    </div>

                    <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Integrations</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {active.applicable_integrations.map((i) => (
                          <Badge key={i} variant="outline" className="border-white/10 text-gray-300 text-xs">
                            {i}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Targets</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {active.targeting_scope?.targets?.slice(0, 3).map((t: string) => (
                          <Badge key={t} variant="outline" className="border-white/10 text-gray-300 text-xs">
                            {t.replace(/_/g, " ")}
                          </Badge>
                        ))}
                        {(active.targeting_scope?.targets?.length || 0) > 3 && (
                          <Badge variant="outline" className="border-white/10 text-gray-500 text-xs">
                            +{active.targeting_scope.targets.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-black/30 rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">AI Prompt</p>
                    <p className="text-sm text-gray-300 line-clamp-3 font-mono">
                      {active.ai_prompt_logic}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
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
