"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react"

interface ValidationReport {
  status: string
  errors: { row: number | null; field: string | null; issue: string }[]
  warnings: { row: number | null; field: string | null; issue: string }[]
  stats: { totalRows: number; validRows: number; invalidRows: number }
}

export function SchemaValidationReport({ report }: { report: ValidationReport }) {
  const statusIcon =
    report.status === "valid" ? (
      <CheckCircle className="w-5 h-5 text-green-400" />
    ) : report.status === "partial" ? (
      <AlertTriangle className="w-5 h-5 text-yellow-400" />
    ) : (
      <XCircle className="w-5 h-5 text-red-400" />
    )

  const statusColor =
    report.status === "valid"
      ? "border-green-500/30 bg-green-500/10"
      : report.status === "partial"
      ? "border-yellow-500/30 bg-yellow-500/10"
      : "border-red-500/30 bg-red-500/10"

  return (
    <div className={`rounded-lg border p-4 ${statusColor}`}>
      <div className="flex items-center gap-2 mb-3">
        {statusIcon}
        <span className="text-white font-medium capitalize">
          Validation: {report.status}
        </span>
        <div className="flex gap-2 ml-auto">
          <Badge variant="outline" className="border-white/20 text-gray-300">
            {report.stats.totalRows} rows
          </Badge>
          <Badge variant="outline" className="border-green-500/30 text-green-400">
            {report.stats.validRows} valid
          </Badge>
          {report.stats.invalidRows > 0 && (
            <Badge variant="outline" className="border-red-500/30 text-red-400">
              {report.stats.invalidRows} invalid
            </Badge>
          )}
        </div>
      </div>

      {report.errors.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-red-400 uppercase tracking-wider mb-1">
            Errors ({report.errors.length})
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {report.errors.slice(0, 10).map((err, i) => (
              <p key={i} className="text-sm text-red-300 font-mono">
                {err.row !== null ? `Row ${err.row}: ` : ""}
                {err.issue}
              </p>
            ))}
            {report.errors.length > 10 && (
              <p className="text-xs text-red-400">
                ...and {report.errors.length - 10} more errors
              </p>
            )}
          </div>
        </div>
      )}

      {report.warnings.length > 0 && (
        <div>
          <p className="text-xs text-yellow-400 uppercase tracking-wider mb-1">
            Warnings ({report.warnings.length})
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {report.warnings.slice(0, 5).map((warn, i) => (
              <p key={i} className="text-sm text-yellow-300 font-mono">
                {warn.row !== null ? `Row ${warn.row}: ` : ""}
                {warn.issue}
              </p>
            ))}
            {report.warnings.length > 5 && (
              <p className="text-xs text-yellow-400">
                ...and {report.warnings.length - 5} more warnings
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
