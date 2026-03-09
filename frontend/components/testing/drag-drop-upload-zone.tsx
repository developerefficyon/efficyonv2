"use client"

import { useState, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Upload,
  FileUp,
  Loader2,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  FileImage,
  FileText,
  File,
  ChevronRight,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import { getBackendToken } from "@/lib/auth-hooks"
import { SchemaValidationReport } from "./schema-validation-report"

interface Props {
  workspaceId: string
  onUploadComplete: () => void
}

type UploadState = "idle" | "hover" | "uploading" | "success" | "error"

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls", ".pdf", ".jpeg", ".jpg", ".png"]
const ACCEPT_STRING = ".csv,.xlsx,.xls,.pdf,.jpeg,.jpg,.png,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf,image/jpeg,image/png"

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
      { value: "profit_loss", label: "Resultatrapport (P&L)" },
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

function getFileIcon(name: string) {
  const ext = name.substring(name.lastIndexOf(".")).toLowerCase()
  if ([".csv", ".xlsx", ".xls"].includes(ext))
    return <FileSpreadsheet className="w-8 h-8 text-green-400" />
  if (ext === ".pdf") return <FileText className="w-8 h-8 text-red-400" />
  if ([".jpeg", ".jpg", ".png"].includes(ext))
    return <FileImage className="w-8 h-8 text-purple-400" />
  return <File className="w-8 h-8 text-gray-400" />
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DragDropUploadZone({ workspaceId, onUploadComplete }: Props) {
  const [state, setState] = useState<UploadState>("idle")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [statusText, setStatusText] = useState("")
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Override controls
  const [showOverride, setShowOverride] = useState(false)
  const [overrideIntegration, setOverrideIntegration] = useState("")
  const [overrideDataType, setOverrideDataType] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(",")[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const processFile = useCallback(
    async (file: File, integrationHint?: string, dataTypeHint?: string) => {
      // Validate extension
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase()
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setError(`Unsupported file type: ${ext}. Allowed: ${ACCEPTED_EXTENSIONS.join(", ")}`)
        setState("error")
        return
      }

      // Validate size (15MB)
      if (file.size > 15 * 1024 * 1024) {
        setError("File too large. Maximum: 15MB")
        setState("error")
        return
      }

      setSelectedFile(file)
      setState("uploading")
      setUploadProgress(10)
      setStatusText("Reading file...")
      setError(null)
      setResult(null)

      try {
        setUploadProgress(25)
        setStatusText("Encoding file...")
        const base64 = await fileToBase64(file)

        setUploadProgress(45)
        setStatusText("Uploading and parsing...")
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
        const token = await getBackendToken()
        if (!token) throw new Error("Authentication required")

        const body: Record<string, string | undefined> = {
          fileData: base64,
          fileName: file.name,
          mimeType: file.type,
        }
        if (integrationHint) body.integrationHint = integrationHint
        if (dataTypeHint) body.dataTypeHint = dataTypeHint

        setUploadProgress(60)
        setStatusText("Detecting schema...")

        const res = await fetch(
          `${apiBase}/api/test/workspaces/${workspaceId}/upload-file`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          }
        )

        setUploadProgress(85)
        setStatusText("Storing data...")

        if (res.ok) {
          const data = await res.json()
          setResult(data)
          setState("success")
          setUploadProgress(100)
          setStatusText("")
          toast.success("File uploaded successfully", {
            description: `${data.detection.schema} detected (${(data.detection.confidence * 100).toFixed(0)}% confidence, ${data.detection.rowCount} rows)`,
          })
          onUploadComplete()
        } else {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || "Upload failed")
        }
      } catch (err: any) {
        setError(err.message || "Upload failed")
        setState("error")
        setUploadProgress(0)
        setStatusText("")
      }
    },
    [workspaceId, onUploadComplete]
  )

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const file = files[0]
      if (!file) return
      processFile(file)
    },
    [processFile]
  )

  // Drag event handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState("hover")
  }
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      if (state === "hover") setState("idle")
    }
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleFiles(e.dataTransfer.files)
  }

  const handleReset = () => {
    setState("idle")
    setResult(null)
    setError(null)
    setSelectedFile(null)
    setUploadProgress(0)
    setStatusText("")
    setShowOverride(false)
    setOverrideIntegration("")
    setOverrideDataType("")
  }

  const handleReuploadWithOverride = () => {
    if (!selectedFile) return
    processFile(selectedFile, overrideIntegration || undefined, overrideDataType || undefined)
    setShowOverride(false)
  }

  const schemaLabels: Record<string, string> = {
    fortnox: "Fortnox",
    m365: "Microsoft 365",
    hubspot: "HubSpot",
    profit_loss: "Resultatrapport (P&L)",
    generic: "Generic Cost Data",
    unknown: "Unknown",
  }

  const confidenceColor = (c: number) => {
    if (c >= 0.7) return "text-green-400"
    if (c >= 0.4) return "text-yellow-400"
    return "text-red-400"
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-white flex items-center gap-2">
          <Upload className="w-4 h-4 text-cyan-400" />
          File Upload (Drag & Drop)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* IDLE STATE */}
        {state === "idle" && (
          <div
            ref={dropZoneRef}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_STRING}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
            <FileUp className="w-10 h-10 text-gray-500 mx-auto mb-3" />
            <p className="text-sm text-white mb-1">
              Drop CSV, Excel, PDF, or JPEG files here
            </p>
            <p className="text-xs text-gray-500 mb-3">
              or click to browse &middot; Max 15MB
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400">
                .csv
              </Badge>
              <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400">
                .xlsx
              </Badge>
              <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400">
                .pdf
              </Badge>
              <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400">
                .jpeg
              </Badge>
            </div>
          </div>
        )}

        {/* HOVER STATE */}
        {state === "hover" && (
          <div
            ref={dropZoneRef}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="border-2 border-dashed border-cyan-400 rounded-lg p-8 text-center bg-cyan-500/10 transition-all animate-pulse"
          >
            <FileUp className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
            <p className="text-sm text-cyan-300 font-medium">Release to upload</p>
          </div>
        )}

        {/* UPLOADING STATE */}
        {state === "uploading" && (
          <div className="border border-white/10 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              {selectedFile && getFileIcon(selectedFile.name)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{selectedFile?.name}</p>
                <p className="text-xs text-gray-400">
                  {selectedFile && formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            </div>
            <Progress value={uploadProgress} className="h-2 mb-2" />
            <p className="text-xs text-gray-400 text-center">{statusText}</p>
          </div>
        )}

        {/* SUCCESS STATE */}
        {state === "success" && result && (
          <div className="border border-green-500/30 rounded-lg p-4 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">Upload successful</p>
                <p className="text-xs text-gray-400 mt-0.5">{result.upload.filename}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-xs border-white/10 text-gray-400 hover:text-white"
              >
                Upload Another
              </Button>
            </div>

            {/* Detection summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase">Schema</p>
                <p className="text-sm text-white font-medium mt-1">
                  {schemaLabels[result.detection.schema] || result.detection.schema}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase">Confidence</p>
                <p className={`text-sm font-medium mt-1 ${confidenceColor(result.detection.confidence)}`}>
                  {(result.detection.confidence * 100).toFixed(0)}%
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase">Rows</p>
                <p className="text-sm text-white font-medium mt-1">
                  {result.detection.rowCount.toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase">Stored As</p>
                <p className="text-sm text-white font-medium mt-1">
                  {result.upload.integration_label}
                </p>
              </div>
            </div>

            {/* Column mapping */}
            {result.detection.columnMapping && Object.keys(result.detection.columnMapping).length > 0 && (
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase mb-2">Column Mapping</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(result.detection.columnMapping).map(([target, source]) => (
                    <Badge
                      key={target}
                      variant="outline"
                      className="text-[10px] border-white/10 text-gray-300"
                    >
                      {String(source)} &rarr; {target}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Validation report */}
            {result.upload.validation_report && (
              <SchemaValidationReport report={result.upload.validation_report} />
            )}

            {/* Override section */}
            <details className="group">
              <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1.5 transition-colors">
                <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                Wrong detection? Override and re-upload
              </summary>
              <div className="mt-3 space-y-3 pl-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase block mb-1">Integration</label>
                    <Select value={overrideIntegration} onValueChange={setOverrideIntegration}>
                      <SelectTrigger className="h-8 text-xs bg-black/50 border-white/10 text-white">
                        <SelectValue placeholder="Auto-detect" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DATA_TYPES).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase block mb-1">Data Type</label>
                    <Select
                      value={overrideDataType}
                      onValueChange={setOverrideDataType}
                      disabled={!overrideIntegration}
                    >
                      <SelectTrigger className="h-8 text-xs bg-black/50 border-white/10 text-white">
                        <SelectValue placeholder="Auto-detect" />
                      </SelectTrigger>
                      <SelectContent>
                        {overrideIntegration &&
                          DATA_TYPES[overrideIntegration]?.types.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleReuploadWithOverride}
                  disabled={!overrideIntegration}
                  className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  <RotateCcw className="w-3 h-3 mr-1.5" />
                  Re-upload with Override
                </Button>
              </div>
            </details>
          </div>
        )}

        {/* ERROR STATE */}
        {state === "error" && (
          <div className="border border-red-500/30 rounded-lg p-6 text-center">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-300 mb-1">Upload failed</p>
            <p className="text-xs text-gray-400 mb-4">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs border-white/10 text-gray-400 hover:text-white"
            >
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
