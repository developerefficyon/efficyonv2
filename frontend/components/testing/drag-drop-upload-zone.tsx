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
  FolderOpen,
} from "lucide-react"
import { toast } from "sonner"
import { getBackendToken } from "@/lib/auth-hooks"
import { SchemaValidationReport } from "./schema-validation-report"

interface Props {
  workspaceId: string
  onUploadComplete: () => void
}

type UploadState = "idle" | "hover" | "uploading" | "success" | "error"

interface FileResult {
  file: File
  status: "pending" | "uploading" | "success" | "error"
  result?: any
  error?: string
}

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls", ".pdf", ".jpeg", ".jpg", ".png", ".json"]
const ACCEPT_STRING = ".csv,.xlsx,.xls,.pdf,.jpeg,.jpg,.png,.json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf,image/jpeg,image/png,application/json"

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

function getFileIcon(name: string, size?: "sm" | "md") {
  const cls = size === "sm" ? "w-4 h-4" : "w-8 h-8"
  const ext = name.substring(name.lastIndexOf(".")).toLowerCase()
  if ([".csv", ".xlsx", ".xls"].includes(ext))
    return <FileSpreadsheet className={`${cls} text-green-400`} />
  if (ext === ".pdf") return <FileText className={`${cls} text-red-400`} />
  if ([".jpeg", ".jpg", ".png"].includes(ext))
    return <FileImage className={`${cls} text-purple-400`} />
  if (ext === ".json") return <FileText className={`${cls} text-cyan-400`} />
  return <File className={`${cls} text-gray-400`} />
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Recursively read all files from a dropped directory entry */
async function readAllEntries(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file((f) => resolve([f]))
    })
  }
  if (entry.isDirectory) {
    const dirReader = (entry as FileSystemDirectoryEntry).createReader()
    const files: File[] = []
    // readEntries may return partial results, so loop until empty
    const readBatch = (): Promise<FileSystemEntry[]> =>
      new Promise((resolve) => dirReader.readEntries((entries) => resolve(entries)))
    let batch = await readBatch()
    while (batch.length > 0) {
      for (const child of batch) {
        const childFiles = await readAllEntries(child)
        files.push(...childFiles)
      }
      batch = await readBatch()
    }
    return files
  }
  return []
}

function isAcceptedFile(file: File): boolean {
  const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase()
  return ACCEPTED_EXTENSIONS.includes(ext) && file.size <= 15 * 1024 * 1024
}

export function DragDropUploadZone({ workspaceId, onUploadComplete }: Props) {
  const [state, setState] = useState<UploadState>("idle")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [statusText, setStatusText] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Single-file result (legacy)
  const [result, setResult] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Multi-file batch state
  const [fileResults, setFileResults] = useState<FileResult[]>([])
  const [isBatchMode, setIsBatchMode] = useState(false)
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(0)

  // Pre-upload tool hint
  const [hintIntegration, setHintIntegration] = useState("")
  const [hintDataType, setHintDataType] = useState("")

  // Override controls (post-upload)
  const [overrideIntegration, setOverrideIntegration] = useState("")
  const [overrideDataType, setOverrideDataType] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
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

  const uploadSingleFile = async (
    file: File,
    integrationHint?: string,
    dataTypeHint?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      const base64 = await fileToBase64(file)
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

      if (res.ok) {
        const data = await res.json()
        return { success: true, data }
      } else {
        const err = await res.json().catch(() => ({}))
        return { success: false, error: err.error || "Upload failed" }
      }
    } catch (err: any) {
      return { success: false, error: err.message || "Upload failed" }
    }
  }

  const processFile = useCallback(
    async (file: File, integrationHint?: string, dataTypeHint?: string) => {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase()
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setError(`Unsupported file type: ${ext}. Allowed: ${ACCEPTED_EXTENSIONS.join(", ")}`)
        setState("error")
        return
      }
      if (file.size > 15 * 1024 * 1024) {
        setError("File too large. Maximum: 15MB")
        setState("error")
        return
      }

      setSelectedFile(file)
      setIsBatchMode(false)
      setState("uploading")
      setUploadProgress(10)
      setStatusText("Reading file...")
      setError(null)
      setResult(null)

      setUploadProgress(25)
      setStatusText("Encoding file...")
      setUploadProgress(45)
      setStatusText("Uploading and parsing...")
      setUploadProgress(60)
      setStatusText("Detecting schema...")

      const res = await uploadSingleFile(file, integrationHint, dataTypeHint)

      if (res.success) {
        setResult(res.data)
        setState("success")
        setUploadProgress(100)
        setStatusText("")
        toast.success("File uploaded successfully", {
          description: `${res.data.detection.schema} detected (${(res.data.detection.confidence * 100).toFixed(0)}% confidence, ${res.data.detection.rowCount} rows)`,
        })
        onUploadComplete()
      } else {
        setError(res.error || "Upload failed")
        setState("error")
        setUploadProgress(0)
        setStatusText("")
      }
    },
    [workspaceId, onUploadComplete]
  )

  const processBatch = useCallback(
    async (files: File[]) => {
      const accepted = files.filter(isAcceptedFile)
      if (accepted.length === 0) {
        setError("No supported files found in folder. Allowed: " + ACCEPTED_EXTENSIONS.join(", "))
        setState("error")
        return
      }

      setIsBatchMode(true)
      setState("uploading")
      setError(null)
      setResult(null)

      const initial: FileResult[] = accepted.map((f) => ({
        file: f,
        status: "pending" as const,
      }))
      setFileResults(initial)

      const integration = hintIntegration && hintIntegration !== "auto" ? hintIntegration : undefined
      const dataType = hintDataType && hintDataType !== "auto" ? hintDataType : undefined

      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < accepted.length; i++) {
        setBatchCurrentIndex(i)
        setUploadProgress(Math.round(((i) / accepted.length) * 100))
        setStatusText(`Uploading ${i + 1} of ${accepted.length}: ${accepted[i].name}`)

        // Mark current file as uploading
        setFileResults((prev) =>
          prev.map((fr, idx) => (idx === i ? { ...fr, status: "uploading" } : fr))
        )

        const res = await uploadSingleFile(accepted[i], integration, dataType)

        if (res.success) {
          successCount++
          setFileResults((prev) =>
            prev.map((fr, idx) =>
              idx === i ? { ...fr, status: "success", result: res.data } : fr
            )
          )
        } else {
          errorCount++
          setFileResults((prev) =>
            prev.map((fr, idx) =>
              idx === i ? { ...fr, status: "error", error: res.error } : fr
            )
          )
        }
      }

      setUploadProgress(100)
      setStatusText("")
      setState("success")
      onUploadComplete()

      if (errorCount === 0) {
        toast.success(`All ${successCount} files uploaded successfully`)
      } else {
        toast.warning(`${successCount} uploaded, ${errorCount} failed`)
      }
    },
    [workspaceId, onUploadComplete, hintIntegration, hintDataType]
  )

  const handleFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return
      if (files.length === 1) {
        const integration = hintIntegration && hintIntegration !== "auto" ? hintIntegration : undefined
        const dataType = hintDataType && hintDataType !== "auto" ? hintDataType : undefined
        processFile(files[0], integration, dataType)
      } else {
        processBatch(files)
      }
    },
    [processFile, processBatch, hintIntegration, hintDataType]
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const items = e.dataTransfer.items
    const allFiles: File[] = []

    if (items && items.length > 0) {
      // Check if any item is a directory
      const entries: FileSystemEntry[] = []
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.()
        if (entry) entries.push(entry)
      }

      if (entries.length > 0) {
        setState("uploading")
        setStatusText("Scanning folder...")
        setUploadProgress(5)

        for (const entry of entries) {
          const files = await readAllEntries(entry)
          allFiles.push(...files)
        }

        handleFiles(allFiles)
        return
      }
    }

    // Fallback: plain file list
    const fileList = Array.from(e.dataTransfer.files)
    handleFiles(fileList)
  }

  const handleReset = () => {
    setState("idle")
    setResult(null)
    setError(null)
    setSelectedFile(null)
    setUploadProgress(0)
    setStatusText("")
    setHintIntegration("")
    setHintDataType("")
    setOverrideIntegration("")
    setOverrideDataType("")
    setFileResults([])
    setIsBatchMode(false)
    setBatchCurrentIndex(0)
  }

  const handleReuploadWithOverride = () => {
    if (!selectedFile) return
    processFile(selectedFile, overrideIntegration || undefined, overrideDataType || undefined)
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
          <div className="space-y-3">
            {/* Tool selector */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Tool / Integration</label>
                <Select
                  value={hintIntegration}
                  onValueChange={(val) => {
                    setHintIntegration(val)
                    setHintDataType("")
                  }}
                >
                  <SelectTrigger className="h-9 text-sm bg-black/50 border-white/10 text-white">
                    <SelectValue placeholder="Auto-detect" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10">
                    <SelectItem value="auto" className="text-white focus:bg-white/10 focus:text-white">Auto-detect</SelectItem>
                    {Object.entries(DATA_TYPES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key} className="text-white focus:bg-white/10 focus:text-white">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Data Type</label>
                <Select
                  value={hintDataType}
                  onValueChange={setHintDataType}
                  disabled={!hintIntegration || hintIntegration === "auto"}
                >
                  <SelectTrigger className="h-9 text-sm bg-black/50 border-white/10 text-white">
                    <SelectValue placeholder="Auto-detect" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10">
                    <SelectItem value="auto" className="text-white focus:bg-white/10 focus:text-white">Auto-detect</SelectItem>
                    {hintIntegration && hintIntegration !== "auto" &&
                      DATA_TYPES[hintIntegration]?.types.map((t) => (
                        <SelectItem key={t.value} value={t.value} className="text-white focus:bg-white/10 focus:text-white">{t.label}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Drop zone */}
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
                multiple
                onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                className="hidden"
              />
              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore - webkitdirectory is valid but not in TS types
                webkitdirectory=""
                directory=""
                multiple
                onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                className="hidden"
              />
              <FileUp className="w-10 h-10 text-gray-500 mx-auto mb-3" />
              <p className="text-sm text-white mb-1">
                Drop files or a folder here
              </p>
              <p className="text-xs text-gray-500 mb-3">
                or click to browse &middot; Max 15MB per file
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400">.csv</Badge>
                <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400">.xlsx</Badge>
                <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400">.json</Badge>
                <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400">.pdf</Badge>
                <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400">.jpeg</Badge>
              </div>
            </div>

            {/* Browse folder button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                folderInputRef.current?.click()
              }}
              className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-cyan-400 transition-colors py-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Browse folder instead
            </button>
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
        {state === "uploading" && !isBatchMode && (
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

        {/* BATCH UPLOADING STATE */}
        {state === "uploading" && isBatchMode && (
          <div className="border border-white/10 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white font-medium">Uploading files...</p>
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            </div>
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-gray-400 text-center">{statusText}</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {fileResults.map((fr, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                    fr.status === "uploading"
                      ? "bg-cyan-500/10"
                      : fr.status === "success"
                      ? "bg-green-500/5"
                      : fr.status === "error"
                      ? "bg-red-500/5"
                      : "bg-white/5"
                  }`}
                >
                  {fr.status === "uploading" && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin shrink-0" />}
                  {fr.status === "success" && <CheckCircle className="w-3 h-3 text-green-400 shrink-0" />}
                  {fr.status === "error" && <XCircle className="w-3 h-3 text-red-400 shrink-0" />}
                  {fr.status === "pending" && <div className="w-3 h-3 rounded-full border border-white/20 shrink-0" />}
                  <span className="text-gray-300 truncate flex-1">{fr.file.name}</span>
                  <span className="text-gray-500 shrink-0">{formatFileSize(fr.file.size)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BATCH SUCCESS STATE */}
        {state === "success" && isBatchMode && (
          <div className="border border-green-500/30 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm text-white font-medium">
                    Batch upload complete
                  </p>
                  <p className="text-xs text-gray-400">
                    {fileResults.filter((f) => f.status === "success").length} succeeded,{" "}
                    {fileResults.filter((f) => f.status === "error").length} failed
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-xs border-white/10 text-gray-400 hover:text-white"
              >
                Upload More
              </Button>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {fileResults.map((fr, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 ${
                    fr.status === "success"
                      ? "border-green-500/20 bg-green-500/5"
                      : "border-red-500/20 bg-red-500/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getFileIcon(fr.file.name, "sm")}
                    {fr.status === "success" ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                    <span className="text-sm text-white truncate flex-1">{fr.file.name}</span>
                    {fr.result && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className="text-[10px] bg-white/5 text-gray-300 border-white/10">
                          {schemaLabels[fr.result.detection.schema] || fr.result.detection.schema}
                        </Badge>
                        <span className={`text-[10px] font-medium ${confidenceColor(fr.result.detection.confidence)}`}>
                          {(fr.result.detection.confidence * 100).toFixed(0)}%
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {fr.result.detection.rowCount} rows
                        </span>
                      </div>
                    )}
                  </div>
                  {fr.error && (
                    <p className="text-xs text-red-400 mt-1 ml-6">{fr.error}</p>
                  )}
                  {fr.result && (
                    <div className="flex items-center gap-2 mt-1.5 ml-6">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          fr.result.upload.validation_status === "valid"
                            ? "border-green-500/30 text-green-400"
                            : fr.result.upload.validation_status === "partial"
                            ? "border-yellow-500/30 text-yellow-400"
                            : "border-red-500/30 text-red-400"
                        }`}
                      >
                        {fr.result.upload.validation_status}
                      </Badge>
                      <span className="text-[10px] text-gray-500">
                        {fr.result.upload.integration_label} &mdash; {fr.result.upload.data_type}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SINGLE FILE SUCCESS STATE */}
        {state === "success" && !isBatchMode && result && (
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
