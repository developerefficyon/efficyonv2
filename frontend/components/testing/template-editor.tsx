"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save } from "lucide-react"

interface Template {
  id: string
  slug: string
  name: string
  version: number
  objective: string
  targeting_scope: any
  ai_prompt_logic: string
  primary_kpi: string
  kpi_description: string | null
  applicable_integrations: string[]
  parameters: Record<string, any>
}

interface Props {
  template: Template
  onSave: (updates: Partial<Template>) => Promise<void>
  onCancel: () => void
}

export function TemplateEditor({ template, onSave, onCancel }: Props) {
  const [name, setName] = useState(template.name)
  const [objective, setObjective] = useState(template.objective)
  const [aiPrompt, setAiPrompt] = useState(template.ai_prompt_logic)
  const [kpi, setKpi] = useState(template.primary_kpi)
  const [kpiDesc, setKpiDesc] = useState(template.kpi_description || "")
  const [params, setParams] = useState(JSON.stringify(template.parameters, null, 2))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      let parsedParams = template.parameters
      try {
        parsedParams = JSON.parse(params)
      } catch {
        // Keep original if parsing fails
      }

      await onSave({
        name,
        objective,
        ai_prompt_logic: aiPrompt,
        primary_kpi: kpi,
        kpi_description: kpiDesc || null,
        parameters: parsedParams,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <p className="text-xs text-gray-500">
        Editing creates a new version (v{template.version + 1}). The previous version is preserved.
      </p>

      <div>
        <label className="text-sm text-gray-400">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 bg-black/50 border-white/10 text-white"
        />
      </div>

      <div>
        <label className="text-sm text-gray-400">Objective</label>
        <Textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          className="mt-1 bg-black/50 border-white/10 text-white min-h-[60px]"
        />
      </div>

      <div>
        <label className="text-sm text-gray-400">AI Prompt Logic</label>
        <Textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          className="mt-1 bg-black/50 border-white/10 text-white font-mono text-sm min-h-[120px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-400">Primary KPI</label>
          <Input
            value={kpi}
            onChange={(e) => setKpi(e.target.value)}
            className="mt-1 bg-black/50 border-white/10 text-white"
          />
        </div>
        <div>
          <label className="text-sm text-gray-400">KPI Description</label>
          <Input
            value={kpiDesc}
            onChange={(e) => setKpiDesc(e.target.value)}
            className="mt-1 bg-black/50 border-white/10 text-white"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400">Parameters (JSON)</label>
        <Textarea
          value={params}
          onChange={(e) => setParams(e.target.value)}
          className="mt-1 bg-black/50 border-white/10 text-white font-mono text-sm min-h-[80px]"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          onClick={onCancel}
          className="border border-white/10 bg-transparent text-white hover:bg-white/5 rounded-md"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save as v{template.version + 1}
        </Button>
      </div>
    </div>
  )
}
