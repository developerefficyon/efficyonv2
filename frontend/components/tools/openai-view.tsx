"use client"

/**
 * OpenAIView
 *
 * Detail-page body for the OpenAI cost analysis tool. Rendered by
 * `dashboard/tools/[id]/page.tsx` when the integration's provider is "OpenAI"
 * (via the unified config in `lib/tools/configs/openai.ts`).
 *
 * Data: the generic `useToolInfo` hook (configured in `lib/tools/configs/openai.ts`)
 * already pulls /api/integrations/openai/usage and /status into a single info
 * object. This component just reads from it and renders charts + KPIs in the
 * same dark aesthetic the rest of the tool detail page uses.
 */

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CalendarClock,
  Sparkles,
  BarChart3,
  Table as TableIcon,
} from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import type { ToolViewProps } from "@/lib/tools/types"

interface UsageSummary {
  total_cost_usd: number
  total_input_tokens: number
  total_output_tokens: number
  mtd_cost_usd: number
  last_month_cost_usd: number
  projected_month_end_usd: number
  mom_delta_pct: number | null
  days: number
}

interface DailyPoint {
  date: string
  cost_usd: number
  input_tokens: number
  output_tokens: number
}

interface ModelPoint {
  model: string
  cost_usd: number
  input_tokens: number
  output_tokens: number
}

interface UsagePayload {
  summary: UsageSummary
  daily: DailyPoint[]
  by_model: ModelPoint[]
}

const fmtUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n || 0)
const fmtInt = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n || 0))
const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0)

export function OpenAIView({ integration, info, isLoading, reload }: ToolViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "by-model" | "daily">("overview")
  const usage = info?.usage as UsagePayload | undefined
  const providerLabel = integration.tool_name || integration.provider || "AI"

  const sortedDaily = useMemo(() => {
    if (!usage?.daily) return []
    return [...usage.daily].sort((a, b) => a.date.localeCompare(b.date))
  }, [usage])

  const sortedModels = useMemo(() => {
    if (!usage?.by_model) return []
    return [...usage.by_model].sort((a, b) => b.cost_usd - a.cost_usd)
  }, [usage])

  const totalCost = usage?.summary?.total_cost_usd || 0

  if (isLoading && !usage) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400/60" />
      </div>
    )
  }

  if (!usage) {
    return (
      <Card className="bg-white/[0.02] border-white/[0.06]">
        <CardContent className="py-12 text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-3 text-white/20" />
          <p className="text-white/60 text-[14px] mb-1">No usage data yet</p>
          <p className="text-white/30 text-[12px] mb-4">
            The initial 90-day backfill may still be running.
          </p>
          <Button
            onClick={() => reload()}
            variant="outline"
            size="sm"
            className="bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const summary = usage.summary

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11.5px] text-white/30">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400/60" />
          {providerLabel} cost analysis · last {summary.days} days
        </div>
        <Button
          onClick={() => reload()}
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white h-8 text-[12px]"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          )}
          Sync
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<DollarSign className="w-3.5 h-3.5" />}
          label="Month to date"
          value={fmtUsd(summary.mtd_cost_usd)}
          delta={summary.mom_delta_pct}
          deltaSuffix="vs last month"
        />
        <KpiCard
          icon={<CalendarClock className="w-3.5 h-3.5" />}
          label="Projected month-end"
          value={fmtUsd(summary.projected_month_end_usd)}
          hint="Linear extrapolation"
        />
        <KpiCard
          icon={<DollarSign className="w-3.5 h-3.5" />}
          label="Last month total"
          value={fmtUsd(summary.last_month_cost_usd)}
          hint="Previous full month"
        />
        <KpiCard
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="Tokens"
          value={fmtCompact(summary.total_input_tokens + summary.total_output_tokens)}
          hint={`${fmtCompact(summary.total_input_tokens)} in · ${fmtCompact(summary.total_output_tokens)} out`}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-white/[0.02] border border-white/[0.06] mb-4 rounded-lg p-1">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/40 text-[12px] rounded-md"
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="by-model"
            className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/40 text-[12px] rounded-md"
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            By model
          </TabsTrigger>
          <TabsTrigger
            value="daily"
            className="data-[state=active]:bg-white/[0.06] data-[state=active]:text-white text-white/40 text-[12px] rounded-md"
          >
            <TableIcon className="w-3.5 h-3.5 mr-1.5" />
            Daily
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-0">
          <Panel title="Daily spend (USD)">
            {sortedDaily.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sortedDaily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)" }}
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)" }}
                      tickFormatter={(v) => `$${v.toFixed(2)}`}
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(10,10,10,0.95)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                      formatter={(v: number) => fmtUsd(v)}
                    />
                    <Line
                      type="monotone"
                      dataKey="cost_usd"
                      stroke="#34d399"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyMessage>No daily data in this range</EmptyMessage>
            )}
          </Panel>

          <Panel title="Top models by spend">
            {sortedModels.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedModels.slice(0, 8)} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)" }}
                      tickFormatter={(v) => `$${v.toFixed(0)}`}
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <YAxis
                      dataKey="model"
                      type="category"
                      tick={{ fontSize: 10, fill: "rgba(255,255,255,0.55)" }}
                      width={140}
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(10,10,10,0.95)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                      formatter={(v: number) => fmtUsd(v)}
                    />
                    <Bar dataKey="cost_usd" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyMessage>No model data in this range</EmptyMessage>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="by-model" className="mt-0">
          <Panel title="Spend by model">
            {sortedModels.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-white/40 border-b border-white/[0.06]">
                      <th className="font-medium py-2.5 px-2">Model</th>
                      <th className="font-medium py-2.5 px-2 text-right">Input tokens</th>
                      <th className="font-medium py-2.5 px-2 text-right">Output tokens</th>
                      <th className="font-medium py-2.5 px-2 text-right">Cost</th>
                      <th className="font-medium py-2.5 px-2 text-right">% of total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedModels.map((m) => {
                      const pct = totalCost > 0 ? (m.cost_usd / totalCost) * 100 : 0
                      return (
                        <tr key={m.model} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="py-2.5 px-2 text-white/80 font-mono text-[11.5px]">{m.model}</td>
                          <td className="py-2.5 px-2 text-right text-white/60">{fmtInt(m.input_tokens)}</td>
                          <td className="py-2.5 px-2 text-right text-white/60">{fmtInt(m.output_tokens)}</td>
                          <td className="py-2.5 px-2 text-right text-white/80 font-medium">{fmtUsd(m.cost_usd)}</td>
                          <td className="py-2.5 px-2 text-right text-white/40">{pct.toFixed(1)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyMessage>No model data in this range</EmptyMessage>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="daily" className="mt-0">
          <Panel title="Daily breakdown">
            {sortedDaily.length > 0 ? (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-[#0a0a0a]">
                    <tr className="text-left text-white/40 border-b border-white/[0.06]">
                      <th className="font-medium py-2.5 px-2">Date</th>
                      <th className="font-medium py-2.5 px-2 text-right">Input tokens</th>
                      <th className="font-medium py-2.5 px-2 text-right">Output tokens</th>
                      <th className="font-medium py-2.5 px-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...sortedDaily].reverse().map((d) => (
                      <tr key={d.date} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="py-2.5 px-2 text-white/80 font-mono text-[11.5px]">{d.date}</td>
                        <td className="py-2.5 px-2 text-right text-white/60">{fmtInt(d.input_tokens)}</td>
                        <td className="py-2.5 px-2 text-right text-white/60">{fmtInt(d.output_tokens)}</td>
                        <td className="py-2.5 px-2 text-right text-white/80 font-medium">{fmtUsd(d.cost_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyMessage>No daily data in this range</EmptyMessage>
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  delta,
  deltaSuffix,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  delta?: number | null
  deltaSuffix?: string
  hint?: string
}) {
  const hasDelta = delta != null
  const isUp = hasDelta && delta! >= 0
  return (
    <Card className="bg-white/[0.02] border-white/[0.06]">
      <CardContent className="p-4 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-white/40">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-display text-white tracking-tight">{value}</div>
        {hasDelta && (
          <div
            className={`text-[11px] flex items-center gap-1 ${
              isUp ? "text-rose-400/80" : "text-emerald-400/80"
            }`}
          >
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isUp ? "+" : ""}
            {delta!.toFixed(1)}% {deltaSuffix}
          </div>
        )}
        {!hasDelta && hint && <div className="text-[11px] text-white/30">{hint}</div>}
      </CardContent>
    </Card>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="bg-white/[0.02] border-white/[0.06]">
      <CardContent className="p-5">
        <div className="text-[13px] font-medium text-white/70 mb-4">{title}</div>
        {children}
      </CardContent>
    </Card>
  )
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return <div className="py-10 text-center text-[12px] text-white/30">{children}</div>
}
