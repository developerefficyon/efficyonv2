"use client"

import React, { useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"

// Chart color palette matching the app theme
const CHART_COLORS = [
  "#06b6d4", // cyan-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#ef4444", // red-500
  "#6366f1", // indigo-500
]

// Type definitions for chart data
export type ChartType = "bar" | "line" | "pie"

export interface ChartData {
  type: ChartType
  title?: string
  data: Record<string, string | number>[]
  xKey?: string
  yKeys?: string[]
  colors?: string[]
}

export interface TableData {
  headers: string[]
  rows: (string | number)[][]
}

export interface RichContent {
  type: "text" | "chart" | "table"
  content?: string
  chartData?: ChartData
  tableData?: TableData
}

interface ChatMessageRendererProps {
  content: string
  richContent?: RichContent[]
  className?: string
}

// Custom components for markdown rendering
const MarkdownComponents = {
  // Headings
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-xl font-bold text-white mt-4 mb-2 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-lg font-semibold text-white mt-3 mb-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-base font-semibold text-cyan-400 mt-3 mb-1 first:mt-0">{children}</h3>
  ),

  // Paragraphs
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="text-sm text-gray-100 mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),

  // Lists
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc list-inside text-sm text-gray-100 mb-2 space-y-1 ml-2">{children}</ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal list-inside text-sm text-gray-100 mb-2 space-y-1 ml-2">{children}</ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="text-gray-100">{children}</li>
  ),

  // Strong/Bold
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),

  // Emphasis/Italic
  em: ({ children }: { children: React.ReactNode }) => (
    <em className="italic text-gray-200">{children}</em>
  ),

  // Code blocks
  code: ({ inline, children }: { inline?: boolean; children: React.ReactNode }) => {
    if (inline) {
      return (
        <code className="bg-white/10 text-cyan-300 px-1.5 py-0.5 rounded text-xs font-mono">
          {children}
        </code>
      )
    }
    return (
      <pre className="bg-black/50 border border-white/10 rounded-lg p-3 overflow-x-auto my-2">
        <code className="text-xs font-mono text-gray-100">{children}</code>
      </pre>
    )
  },

  // Blockquotes
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-2 border-cyan-500 pl-3 my-2 text-gray-300 italic">
      {children}
    </blockquote>
  ),

  // Links
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-cyan-400 hover:text-cyan-300 underline"
    >
      {children}
    </a>
  ),

  // Tables
  table: ({ children }: { children: React.ReactNode }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: { children: React.ReactNode }) => (
    <thead className="bg-white/5 border-b border-white/10">{children}</thead>
  ),
  tbody: ({ children }: { children: React.ReactNode }) => (
    <tbody className="divide-y divide-white/5">{children}</tbody>
  ),
  tr: ({ children }: { children: React.ReactNode }) => (
    <tr className="hover:bg-white/5 transition-colors">{children}</tr>
  ),
  th: ({ children }: { children: React.ReactNode }) => (
    <th className="text-left px-3 py-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }: { children: React.ReactNode }) => (
    <td className="px-3 py-2 text-gray-100">{children}</td>
  ),

  // Horizontal rule
  hr: () => <hr className="border-white/10 my-4" />,
}

// Chart renderer component
function ChartRenderer({ chartData }: { chartData: ChartData }) {
  const { type, title, data, xKey = "name", yKeys = ["value"], colors = CHART_COLORS } = chartData

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey={xKey}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
            {yKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )

      case "line":
        return (
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey={xKey}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
            {yKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ fill: colors[index % colors.length], strokeWidth: 0, r: 3 }}
              />
            ))}
          </LineChart>
        )

      case "pie":
        return (
          <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <Pie
              data={data}
              dataKey={yKeys[0]}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: "rgba(255,255,255,0.3)" }}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
          </PieChart>
        )

      default:
        return null
    }
  }

  return (
    <div className="my-4 p-4 bg-black/30 rounded-xl border border-white/10">
      {title && (
        <h4 className="text-sm font-semibold text-white mb-3">{title}</h4>
      )}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Table renderer for structured data
function TableRenderer({ tableData }: { tableData: TableData }) {
  const { headers, rows } = tableData

  return (
    <div className="overflow-x-auto my-3 rounded-lg border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-white/5">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="text-left px-3 py-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider border-b border-white/10"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-white/5 transition-colors">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 text-gray-100">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Parse special blocks from content (charts and tables embedded in markdown)
function parseSpecialBlocks(content: string): { cleanContent: string; charts: ChartData[]; tables: TableData[] } {
  const charts: ChartData[] = []
  const tables: TableData[] = []

  // Parse chart blocks: ```chart:type {...json...} ```
  let cleanContent = content.replace(
    /```chart:(bar|line|pie)\n([\s\S]*?)\n```/g,
    (_, type, jsonStr) => {
      try {
        const chartData = JSON.parse(jsonStr)
        charts.push({ type, ...chartData })
        return `\n[CHART_PLACEHOLDER_${charts.length - 1}]\n`
      } catch {
        return ""
      }
    }
  )

  // Parse table blocks: ```table {...json...} ```
  cleanContent = cleanContent.replace(
    /```table\n([\s\S]*?)\n```/g,
    (_, jsonStr) => {
      try {
        const tableData = JSON.parse(jsonStr)
        tables.push(tableData)
        return `\n[TABLE_PLACEHOLDER_${tables.length - 1}]\n`
      } catch {
        return ""
      }
    }
  )

  return { cleanContent, charts, tables }
}

// Main component
export function ChatMessageRenderer({ content, richContent, className }: ChatMessageRendererProps) {
  // Parse content for embedded charts/tables
  const { cleanContent, charts, tables } = useMemo(() => parseSpecialBlocks(content), [content])

  // Split content by placeholders and render with charts/tables
  const renderContent = () => {
    // If no charts or tables, just render markdown directly
    if (charts.length === 0 && tables.length === 0) {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={MarkdownComponents as any}
        >
          {cleanContent}
        </ReactMarkdown>
      )
    }

    // Split by placeholder pattern and track what each part is
    const placeholderPattern = /\[(CHART_PLACEHOLDER_(\d+)|TABLE_PLACEHOLDER_(\d+))\]/g
    const elements: React.ReactNode[] = []
    let lastIndex = 0
    let match
    let elementKey = 0

    while ((match = placeholderPattern.exec(cleanContent)) !== null) {
      // Add text before the placeholder
      if (match.index > lastIndex) {
        const textBefore = cleanContent.slice(lastIndex, match.index)
        if (textBefore.trim()) {
          elements.push(
            <ReactMarkdown
              key={`md-${elementKey++}`}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={MarkdownComponents as any}
            >
              {textBefore}
            </ReactMarkdown>
          )
        }
      }

      // Add the chart or table
      const chartIndex = match[2] ? parseInt(match[2]) : -1
      const tableIndex = match[3] ? parseInt(match[3]) : -1

      if (chartIndex >= 0 && charts[chartIndex]) {
        elements.push(<ChartRenderer key={`chart-${elementKey++}`} chartData={charts[chartIndex]} />)
      } else if (tableIndex >= 0 && tables[tableIndex]) {
        elements.push(<TableRenderer key={`table-${elementKey++}`} tableData={tables[tableIndex]} />)
      }

      lastIndex = match.index + match[0].length
    }

    // Add remaining text after last placeholder
    if (lastIndex < cleanContent.length) {
      const remainingText = cleanContent.slice(lastIndex)
      if (remainingText.trim()) {
        elements.push(
          <ReactMarkdown
            key={`md-${elementKey++}`}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={MarkdownComponents as any}
          >
            {remainingText}
          </ReactMarkdown>
        )
      }
    }

    return elements.length > 0 ? elements : (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={MarkdownComponents as any}
      >
        {cleanContent}
      </ReactMarkdown>
    )
  }

  return (
    <div className={cn("chat-message-content", className)}>
      {renderContent()}

      {/* Render additional rich content if provided */}
      {richContent?.map((item, index) => {
        switch (item.type) {
          case "chart":
            return item.chartData ? (
              <ChartRenderer key={`rich-chart-${index}`} chartData={item.chartData} />
            ) : null
          case "table":
            return item.tableData ? (
              <TableRenderer key={`rich-table-${index}`} tableData={item.tableData} />
            ) : null
          case "text":
            return item.content ? (
              <ReactMarkdown
                key={`rich-md-${index}`}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={MarkdownComponents as any}
              >
                {item.content}
              </ReactMarkdown>
            ) : null
          default:
            return null
        }
      })}
    </div>
  )
}

export default ChatMessageRenderer
