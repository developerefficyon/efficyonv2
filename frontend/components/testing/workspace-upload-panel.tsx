"use client"

import { getBackendToken } from "@/lib/auth-hooks"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Upload, CheckCircle, AlertTriangle, XCircle } from "lucide-react"
import { SchemaValidationReport } from "./schema-validation-report"

interface Props {
  workspaceId: string
  onUploadComplete: () => void
}

const DATA_TYPES: Record<string, { label: string; types: { value: string; label: string }[] }> = {
  Fortnox: {
    label: "Fortnox",
    types: [
      { value: "supplier_invoices", label: "Supplier Invoices" },
      { value: "invoices", label: "Customer Invoices" },
      { value: "customers", label: "Customers" },
      { value: "expenses", label: "Expenses" },
      { value: "vouchers", label: "Vouchers" },
      { value: "accounts", label: "Accounts" },
      { value: "articles", label: "Articles" },
    ],
  },
  Microsoft365: {
    label: "Microsoft 365",
    types: [
      { value: "licenses", label: "Licenses" },
      { value: "users", label: "Users" },
      { value: "usage_reports", label: "Usage Reports" },
    ],
  },
  HubSpot: {
    label: "HubSpot",
    types: [
      { value: "hubspot_users", label: "Users" },
      { value: "hubspot_account", label: "Account Info" },
    ],
  },
}

export function WorkspaceUploadPanel({ workspaceId, onUploadComplete }: Props) {
  const [integration, setIntegration] = useState("Fortnox")
  const [dataType, setDataType] = useState("supplier_invoices")
  const [jsonInput, setJsonInput] = useState("")
  const [uploading, setUploading] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload() {
    setError(null)
    setValidationResult(null)

    let parsed: any
    try {
      parsed = JSON.parse(jsonInput)
    } catch {
      setError("Invalid JSON. Please check your input.")
      return
    }

    setUploading(true)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const token = await getBackendToken()
      if (!token) return

      const res = await fetch(`${apiBase}/api/test/workspaces/${workspaceId}/uploads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          integration_label: integration,
          data_type: dataType,
          file_data: parsed,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setValidationResult(data.upload.validation_report)
        setJsonInput("")
        onUploadComplete()
      } else {
        const errData = await res.json()
        setError(errData.error || "Upload failed")
      }
    } catch (err) {
      setError("Network error")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Upload className="w-5 h-5 text-cyan-400" />
          Upload Test Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Integration</label>
            <Select
              value={integration}
              onValueChange={(val) => {
                setIntegration(val)
                setDataType(DATA_TYPES[val].types[0].value)
              }}
            >
              <SelectTrigger className="mt-1 bg-black/50 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                {Object.entries(DATA_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key} className="text-white focus:bg-white/10 focus:text-white">
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-gray-400">Data Type</label>
            <Select value={dataType} onValueChange={setDataType}>
              <SelectTrigger className="mt-1 bg-black/50 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                {DATA_TYPES[integration]?.types.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-white focus:bg-white/10 focus:text-white">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400">JSON Data</label>
          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={`Paste JSON array here, e.g.:\n[\n  { "SupplierNumber": "1001", "InvoiceDate": "2025-01-15", "Total": 5000, ... },\n  ...\n]`}
            className="mt-1 bg-black/50 border-white/10 text-white font-mono text-sm min-h-[200px]"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <XCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={uploading || !jsonInput.trim()}
          className="bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Upload & Validate
        </Button>

        {validationResult && (
          <SchemaValidationReport report={validationResult} />
        )}
      </CardContent>
    </Card>
  )
}
