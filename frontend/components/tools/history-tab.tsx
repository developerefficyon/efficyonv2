"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Loader2, RefreshCw, FileText } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"
import { getBackendToken } from "@/lib/auth-hooks"
import type { Integration, UnifiedToolConfig } from "@/lib/tools/types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface HistoryTabProps {
  integration: Integration
  config: UnifiedToolConfig
}

interface HistoryItem {
  id: string
  created_at: string
  summary_text?: string
  summary?: any
  ai_summary?: string
  provider?: string
}

export function HistoryTab({ integration, config }: HistoryTabProps) {
  const router = useRouter()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selected, setSelected] = useState<HistoryItem | null>(null)

  const providerName = integration.provider || integration.tool_name
  const endpoint =
    config.analysisType === "usage"
      ? `/api/integrations/${integration.id}/usage-summaries`
      : `/api/analysis-history?integrationId=${integration.id}&provider=${providerName}`

  const load = async () => {
    setIsLoading(true)
    try {
      const token = await getBackendToken()
      if (!token) {
        router.push("/login")
        return
      }
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const list = config.analysisType === "usage"
        ? (data.summaries || [])
        : (data.analyses || [])
      setItems(list)
    } catch (err: any) {
      toast.error("Failed to load history", { description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration.id, config.analysisType])

  return (
    <div className="space-y-6">
      <Card className="bg-white/[0.02] border-white/[0.06]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-500/10 rounded-xl">
                <Clock className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-white">Analysis History</CardTitle>
                <p className="text-gray-400 text-sm">Past {config.analysisType === "usage" ? "usage summaries" : "cost-leak analyses"}</p>
              </div>
            </div>
            <Button
              onClick={load}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.06]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">No history yet. Run an analysis to start building your history.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selected?.id === item.id
                      ? "bg-white/10 border-white/20"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                      {item.summary && (
                        <p className="text-gray-400 text-xs mt-0.5">
                          {item.summary.totalFindings || 0} findings · ${(item.summary.totalPotentialSavings || 0).toLocaleString()} potential savings
                        </p>
                      )}
                    </div>
                    <FileText className="w-4 h-4 text-gray-500" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (selected.summary_text || selected.ai_summary) && (
        <Card className="bg-white/[0.02] border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-white text-sm">
              Summary from {new Date(selected.created_at).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert prose-sm max-w-none
              [&_p]:text-gray-300 [&_p]:text-sm
              [&_h1]:text-white [&_h1]:text-base [&_h1]:font-semibold
              [&_h2]:text-white [&_h2]:text-sm [&_h2]:font-semibold
              [&_strong]:text-white
              [&_ul]:text-gray-300 [&_ol]:text-gray-300
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {selected.summary_text || selected.ai_summary || ""}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
