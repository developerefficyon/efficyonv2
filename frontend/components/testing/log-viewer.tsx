"use client"

import { getBackendToken } from "@/lib/auth-hooks"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, ScrollText } from "lucide-react"

interface LogEntry {
  id: string
  log_level: string
  message: string
  details: any
  created_at: string
}

export function LogViewer({ workspaceId }: { workspaceId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchLogs() {
    setLoading(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/workspaces/${workspaceId}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [workspaceId])

  const levelColors: Record<string, string> = {
    info: "border-blue-500/30 text-blue-400 bg-blue-500/10",
    warn: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
    error: "border-red-500/30 text-red-400 bg-red-500/10",
    debug: "border-gray-500/30 text-gray-400 bg-gray-500/10",
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-cyan-400" />
          Logs
        </CardTitle>
        <Button
          size="sm"
          className="border border-white/10 bg-transparent text-gray-400 hover:text-white hover:bg-white/5 rounded-md"
          onClick={fetchLogs}
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No logs yet. Run an analysis to generate logs.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 p-2.5 bg-black/30 rounded border border-white/5 font-mono text-sm"
              >
                <Badge
                  variant="outline"
                  className={`${levelColors[log.log_level] || levelColors.debug} text-xs shrink-0 mt-0.5`}
                >
                  {log.log_level}
                </Badge>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-500 mr-2">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                  <span className="text-gray-300">{log.message}</span>
                  {log.details && (
                    <pre className="text-xs text-gray-500 mt-1 overflow-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
