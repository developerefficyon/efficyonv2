"use client"

import { useState, useRef, useEffect, useCallback, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Coins,
  Paperclip,
  FileSpreadsheet,
  X,
  Zap,
  Brain,
  ChevronDown,
  Check,
  PanelLeft,
} from "lucide-react"
import { useAuth, getBackendToken } from "@/lib/auth-hooks"
import { useTokens } from "@/lib/token-context"
import { useTeamRole } from "@/lib/team-role-context"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ChatSidebar, useChatConversations } from "@/components/chat-sidebar"
import { ToolChatTabs, useConnectedTools, getToolDisplayName } from "@/components/tool-chat-tabs"
import { ChatMessageRenderer } from "@/components/chat-message-renderer"
import { useIsMobile } from "@/hooks/use-mobile"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  fileName?: string
}

let messageIdCounter = 0
function generateMessageId(): string {
  return `${Date.now()}-${++messageIdCounter}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Read an SSE stream from a fetch Response and call onChunk for each content delta.
 * Handles metadata events (sent before AI content) and content deltas.
 * Returns { text, metadata }.
 */
async function readSSEStream(
  response: Response,
  onChunk: (text: string) => void
): Promise<{ text: string; metadata: Record<string, unknown> | null }> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let fullText = ""
  let buffer = ""
  let metadata: Record<string, unknown> | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith("data: ")) continue
      const payload = trimmed.slice(6)
      if (payload === "[DONE]") continue
      try {
        const parsed = JSON.parse(payload)
        if (parsed.metadata) {
          metadata = parsed.metadata
        } else if (parsed.content) {
          fullText += parsed.content
          onChunk(fullText)
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }

  return { text: fullText, metadata }
}

const suggestedQuestions = {
  general: [
    "What are my current cost optimization opportunities?",
    "How can I reduce my software subscription costs?",
    "Which tools have unused seats?",
    "Show me my monthly spending trends",
  ],
  fortnox: [
    "Show me all overdue invoices",
    "What's my total outstanding amount?",
    "Analyze my spending patterns",
    "Find potential duplicate payments",
  ],
  microsoft365: [
    "Show license utilization",
    "Which users haven't signed in recently?",
    "How many unused licenses do I have?",
    "What's my license cost optimization potential?",
  ],
  hubspot: [
    "Show HubSpot seat utilization",
    "Which HubSpot users are inactive?",
    "How many unused HubSpot seats do I have?",
    "What's my HubSpot cost optimization potential?",
  ],
  quickbooks: [
    "Show me all overdue customer invoices",
    "Analyze vendor payment patterns",
    "Find potential duplicate vendor payments",
    "Show expense category breakdown",
  ],
  shopify: [
    "Show my top-selling products",
    "Which apps cost the most per month?",
    "Find dead inventory items",
    "Analyze product margins",
  ],
  comparison: [
    "Run a deep analysis across all platforms",
    "Show cost vs. activity gap analysis",
    "What's my cost per active user?",
    "Find combined optimization opportunities",
  ],
  default: [
    "Show me a summary of the data",
    "What insights can you find?",
    "Analyze cost optimization opportunities",
    "What actions do you recommend?",
  ],
  fileUpload: [
    "Analyze this file for cost optimization opportunities",
    "Find duplicate or unusual payments",
    "Show spending trends over time",
    "Which vendors have the highest spend?",
  ],
}

// Model tiers for inline selector
const MODEL_TIERS = [
  { key: "haiku", label: "Haiku", description: "Fast & efficient", multiplier: 1, icon: Zap, color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/40" },
  { key: "sonnet", label: "Sonnet", description: "Balanced", multiplier: 2, icon: Brain, color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/40" },
  { key: "opus", label: "Opus", description: "Most capable", multiplier: 3, icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/40" },
]

function InlineModelSelector() {
  const { aiModel, refreshTokenBalance } = useTokens()
  const { isOwner } = useTeamRole()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = MODEL_TIERS.find((t) => t.key === aiModel?.key) || MODEL_TIERS[0]
  const Icon = current.icon

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectModel = async (key: string) => {
    if (key === aiModel?.key || !isOwner) return
    setSaving(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()
      if (!accessToken) throw new Error("Session expired")
      const res = await fetch(`${apiBase}/api/settings/ai-model`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ model: key }),
      })
      if (!res.ok) throw new Error("Failed to update")
      await refreshTokenBalance()
      const tier = MODEL_TIERS.find((t) => t.key === key)
      toast.success(`Switched to ${tier?.label || key}`)
    } catch {
      toast.error("Failed to switch model")
    } finally {
      setSaving(false)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => isOwner && setOpen(!open)}
        disabled={saving}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border",
          current.border, current.bg, current.color,
          isOwner ? "hover:brightness-125 cursor-pointer" : "cursor-default opacity-80"
        )}
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
        <span>{current.label}</span>
        {isOwner && <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-52 rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl shadow-black/50 z-50 p-1.5">
          {MODEL_TIERS.map((tier) => {
            const TierIcon = tier.icon
            const isActive = tier.key === aiModel?.key
            return (
              <button
                key={tier.key}
                onClick={() => selectModel(tier.key)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150",
                  isActive ? `${tier.bg} ${tier.border} border` : "border border-transparent hover:bg-white/5"
                )}
              >
                <TierIcon className={cn("w-3.5 h-3.5", isActive ? tier.color : "text-gray-400")} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white">{tier.label}</div>
                  <div className="text-[10px] text-gray-500">{tier.description}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-[10px] font-semibold", isActive ? tier.color : "text-gray-500")}>
                    {tier.multiplier}x
                  </span>
                  {isActive && <Check className={cn("w-3 h-3", tier.color)} />}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Research data cache type
type ResearchCache = {
  toolData?: any
  fortnoxData?: any
  m365Data?: any
  hubspotData?: any
  dataType?: string
  fileAnalysis?: any
}

export default function ChatbotPage() {
  const { user } = useAuth()
  const { tokenBalance, aiModel, refreshTokenBalance } = useTokens()
  const { isViewer } = useTeamRole()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState("general")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showTokenConfirmation, setShowTokenConfirmation] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [researchCache, setResearchCache] = useState<ResearchCache>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<{ name: string; size: string; type: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get connected tools
  const { tools, refreshTools } = useConnectedTools()

  // Determine chatType based on activeTab
  const chatType: "general" | "comparison" | "tool" =
    activeTab === "general" ? "general" :
    activeTab === "comparison" ? "comparison" : "tool"

  const currentTool = chatType === "tool" ? tools.find((t) => t.id === activeTab) : null
  const currentToolId = chatType === "tool" ? activeTab : null

  // Chat conversations hook
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    isLoading: conversationsLoading,
    createConversation,
    deleteConversation,
    renameConversation,
    addMessageToConversation,
    loadConversation,
  } = useChatConversations(chatType, currentToolId)

  // Set sidebar closed by default on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    } else {
      setSidebarOpen(true)
    }
  }, [isMobile])

  // Reset messages when tab changes
  useEffect(() => {
    setMessages([])
    setError(null)
  }, [activeTab])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Clear research cache and file selection when switching tabs
  useEffect(() => {
    setResearchCache({})
    clearFile()
  }, [activeTab])

  // Load conversation messages when selecting a conversation
  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id)
    setError(null)
    setResearchCache({})

    const conversation = await loadConversation(id)
    if (conversation?.messages) {
      const loadedMessages: Message[] = conversation.messages.map(
        (msg: { id: string; role: "user" | "assistant"; content: string; created_at: string }) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
        })
      )
      setMessages(loadedMessages)
    }

    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  // Create new conversation
  const handleNewConversation = async () => {
    const newId = await createConversation()
    if (newId) {
      setMessages([])
      setError(null)
      setResearchCache({})
      if (isMobile) {
        setSidebarOpen(false)
      }
    }
  }

  // Token cost for deep research
  const modelMultiplier = aiModel?.multiplier || 1
  const DEEP_RESEARCH_TOKEN_COST = 1 * modelMultiplier

  // Classify whether a prompt needs actual data fetching
  const isHeavyPrompt = useCallback((text: string): boolean => {
    const q = text.toLowerCase().trim()
    const heavyPatterns = [
      /\b(show|list|display|get|fetch|pull|retrieve|export)\b.*\b(invoice|bill|expense|payment|license|user|seat|subscription|supplier|vendor|customer|data|report|metric|number|amount|record|transaction|receipt)\b/,
      /\b(analyze|analyse|audit|scan|check|review|inspect|examine)\b.*\b(my|our|the|this|company|account|spending|spend|cost|usage|utilization|activity|invoice|license|tool|subscription|platform)\b/,
      /\b(how (much|many)|what('s| is| are) (my|our|the)|total|average|sum|count|breakdown|trend|top|highest|lowest|most|least)\b.*\b(spend|cost|invoice|license|user|seat|payment|expense|subscription|vendor|supplier|tool)\b/,
      /\b(find|detect|identify|spot|flag)\b.*\b(duplicate|unused|inactive|overdue|anomal|waste|saving|optimization|opportunity|leak|overlap|redundant)\b/,
      /\b(compare|cross-reference|correlate|match|gap analysis|cost per)\b/,
      /\b(fortnox|microsoft 365|m365|hubspot|quickbooks|qbo|shopify)\b.*\b(data|invoice|bill|license|user|seat|report|dashboard|order|product|app|inventory|vendor|expense)\b/,
      /\b(run|execute|perform|do|start)\b.*\b(analysis|audit|scan|research|deep dive|report)\b/,
    ]
    return heavyPatterns.some((pattern) => pattern.test(q))
  }, [])

  const requiresResearch = activeTab !== "general"

  // File upload helpers
  const MAX_FILE_SIZE = 10 * 1024 * 1024
  const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".pdf"]

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error("Unsupported file type", { description: "Please upload .xlsx, .xls, or .pdf files" })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large", { description: "Maximum file size is 10MB" })
      return
    }
    setSelectedFile(file)
    setFilePreview({
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      type: ext.replace(".", "").toUpperCase(),
    })
  }

  const clearFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

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

  const hasCachedResearch = () => {
    if (activeTab === "comparison") {
      const hasFortnox = !!researchCache.fortnoxData
      const hasM365 = !!researchCache.m365Data
      const hasHubSpot = !!researchCache.hubspotData
      const cachedPlatforms = [hasFortnox, hasM365, hasHubSpot].filter(Boolean).length
      return cachedPlatforms >= 2
    } else if (activeTab !== "general") {
      return !!researchCache.toolData
    }
    return true
  }

  const sendMessage = async (messageText?: string, skipConfirmation = false) => {
    const text = messageText || input.trim()
    if ((!text && !selectedFile) || isLoading) return

    const requiresFileToken = !!selectedFile && !researchCache.fileAnalysis
    if (requiresFileToken && !skipConfirmation) {
      const availableTokens = tokenBalance?.available ?? 0
      if (availableTokens < DEEP_RESEARCH_TOKEN_COST) {
        toast.error("Insufficient tokens", {
          description: `File analysis requires ${DEEP_RESEARCH_TOKEN_COST} token. You have ${availableTokens} token(s) available.`,
        })
        return
      }
      setPendingMessage(text || "Analyze this file for cost optimization opportunities")
      setShowTokenConfirmation(true)
      return
    }

    if (!selectedFile && requiresResearch && !hasCachedResearch() && !skipConfirmation && isHeavyPrompt(text)) {
      const availableTokens = tokenBalance?.available ?? 0
      if (availableTokens < DEEP_RESEARCH_TOKEN_COST) {
        toast.error("Insufficient tokens", {
          description: `Deep research requires ${DEEP_RESEARCH_TOKEN_COST} token. You have ${availableTokens} token(s) available.`,
        })
        return
      }
      setPendingMessage(text)
      setShowTokenConfirmation(true)
      return
    }

    let conversationId = activeConversationId
    if (!conversationId) {
      conversationId = await createConversation()
      if (!conversationId) return
    }

    setError(null)
    const userMessage: Message = {
      id: generateMessageId(),
      role: "user",
      content: text || "Analyze this file for cost optimization opportunities",
      timestamp: new Date(),
      fileName: selectedFile?.name,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    addMessageToConversation(conversationId, "user", userMessage.content)

    // Create a placeholder assistant message for streaming
    const assistantId = generateMessageId()

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        throw new Error("Session expired. Please log in again.")
      }

      let endpoint: string
      let body: Record<string, unknown>

      if (selectedFile || researchCache.fileAnalysis) {
        endpoint = `${apiBase}/api/chat/file-upload`
        let fileDataB64: string | undefined
        let fileNameStr: string | undefined
        let mimeTypeStr: string | undefined

        if (selectedFile && !researchCache.fileAnalysis) {
          fileDataB64 = await fileToBase64(selectedFile)
          fileNameStr = selectedFile.name
          mimeTypeStr = selectedFile.type
        }

        body = {
          question: userMessage.content,
          fileData: fileDataB64,
          fileName: fileNameStr || researchCache.fileAnalysis?.fileName,
          mimeType: mimeTypeStr,
          cachedFileAnalysis: researchCache.fileAnalysis || undefined,
          conversationId,
          stream: true,
        }
      } else if (activeTab === "general") {
        endpoint = `${apiBase}/api/ai/chat`
        body = {
          question: text,
          chatType: "general",
          conversationId,
          stream: true,
        }
      } else if (activeTab === "comparison") {
        endpoint = `${apiBase}/api/chat/comparison`
        const hasFortnox = !!researchCache.fortnoxData
        const hasM365 = !!researchCache.m365Data
        const hasHubSpot = !!researchCache.hubspotData
        const cachedPlatformCount = [hasFortnox, hasM365, hasHubSpot].filter(Boolean).length
        const cachedData = cachedPlatformCount >= 2
          ? {
              fortnoxData: researchCache.fortnoxData,
              m365Data: researchCache.m365Data,
              hubspotData: researchCache.hubspotData,
            }
          : undefined

        body = {
          question: text,
          cachedResearchData: cachedData,
          conversationId,
          stream: true,
        }
      } else {
        endpoint = `${apiBase}/api/chat/tool`
        const dataType = detectDataType(text)
        const hasCached = !!(researchCache.toolData)
        body = {
          question: text,
          toolId: activeTab,
          dataType,
          cachedResearchData: researchCache.toolData || undefined,
          skipDataFetch: !hasCached && !isHeavyPrompt(text),
          conversationId,
          stream: true,
        }
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.error === "TOKEN_EXPIRED") {
          refreshTools()
          const provider = errorData.provider || "tool"
          throw new Error(`Your ${provider} connection has expired. Please reconnect it in the Tools page.`)
        }
        throw new Error(errorData.error || "Failed to get response from AI")
      }

      const contentType = response.headers.get("content-type") || ""
      let finalText: string

      if (contentType.includes("text/event-stream")) {
        // Streaming response — add placeholder and update progressively
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
        ])

        const { text: streamedText, metadata } = await readSSEStream(response, (partialText) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, content: partialText } : msg
            )
          )
        })
        finalText = streamedText

        // Final update to ensure complete text
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: finalText } : msg
          )
        )

        // Process metadata from SSE stream (cache data, refresh tokens)
        if (metadata) {
          const meta = metadata as Record<string, unknown>
          if (meta.fileAnalysis) {
            setResearchCache((prev) => ({ ...prev, fileAnalysis: meta.fileAnalysis }))
          }
          if (meta.researchData) {
            const rd = meta.researchData as Record<string, unknown>
            setResearchCache({
              fortnoxData: rd.fortnoxData,
              m365Data: rd.m365Data,
              hubspotData: rd.hubspotData,
            })
          }
          if (meta.toolData) {
            setResearchCache({ toolData: meta.toolData, dataType: meta.dataType as string })
          }
          if ((meta.tokensUsed as number) > 0) {
            await refreshTokenBalance()
          }
        }
      } else {
        // Non-streaming JSON response (fallback for endpoints that don't stream,
        // e.g. when file upload or tool data needs to be returned)
        const data = await response.json()
        finalText = data.response || "I apologize, but I couldn't generate a response. Please try again."

        // Handle cached data from non-streaming responses
        if (data.fileAnalysis) {
          setResearchCache((prev) => ({ ...prev, fileAnalysis: data.fileAnalysis }))
        }
        if (data.researchData) {
          setResearchCache({
            fortnoxData: data.researchData.fortnoxData,
            m365Data: data.researchData.m365Data,
            hubspotData: data.researchData.hubspotData,
          })
        }
        if (data.toolData) {
          setResearchCache({ toolData: data.toolData, dataType: data.dataType })
        }

        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: finalText, timestamp: new Date() },
        ])

        if (data.tokensUsed > 0) {
          await refreshTokenBalance()
        }
      }

      // Clear file after successful file upload
      if (selectedFile || researchCache.fileAnalysis) {
        clearFile()
      }

      addMessageToConversation(conversationId, "assistant", finalText)
    } catch (err) {
      console.error("Chat error:", err)
      const errMsg = err instanceof Error ? err.message : "An error occurred"
      setError(errMsg)
      if (errMsg.includes("expired") && errMsg.includes("Tools page")) {
        toast.error("Connection expired", { description: errMsg })
      } else {
        toast.error("Failed to send message", { description: errMsg })
      }
    } finally {
      setIsLoading(false)
      textareaRef.current?.focus()
    }
  }

  const detectDataType = (question: string): string => {
    const q = question.toLowerCase()
    if (q.includes("invoice") && !q.includes("supplier")) return "invoices"
    if (q.includes("supplier invoice") || q.includes("vendor invoice") || q.includes("bill")) return "supplier-invoices"
    if (q.includes("customer")) return "customers"
    if (q.includes("supplier") || q.includes("vendor")) return "suppliers"
    if (q.includes("expense")) return "expenses"
    if (q.includes("cost leak") || q.includes("saving") || q.includes("optimize") || q.includes("duplicate")) return "cost-leaks"
    if (q.includes("license") || q.includes("subscription")) return "licenses"
    if (q.includes("user") || q.includes("sign in") || q.includes("login") || q.includes("inactive")) return "users"
    if (q.includes("usage") || q.includes("activity") || q.includes("teams") || q.includes("mailbox")) return "usage"
    if (q.includes("seat") || q.includes("hubspot user")) return "users"
    if (q.includes("hubspot account") || q.includes("portal")) return "account"
    if (q.includes("bill") || q.includes("vendor payment")) return "bills"
    if (q.includes("quickbooks expense") || q.includes("purchase")) return "expenses"
    if (q.includes("quickbooks vendor") || q.includes("qbo vendor")) return "vendors"
    if (q.includes("chart of accounts") || q.includes("account list")) return "accounts"
    if (q.includes("order") || q.includes("revenue") || q.includes("fulfillment")) return "orders"
    if (q.includes("product") || q.includes("catalog") || q.includes("inventory")) return "products"
    if (q.includes("app charge") || q.includes("app subscription") || q.includes("installed app")) return "app-charges"
    return "general"
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = async () => {
    setMessages([])
    setError(null)
    await handleNewConversation()
  }

  const handleConfirmTokenUsage = () => {
    setShowTokenConfirmation(false)
    if (pendingMessage) {
      sendMessage(pendingMessage, true)
      setPendingMessage(null)
    }
  }

  const handleCancelTokenUsage = () => {
    setShowTokenConfirmation(false)
    setPendingMessage(null)
  }

  const getSuggestedQuestions = () => {
    if (selectedFile || researchCache.fileAnalysis) return suggestedQuestions.fileUpload
    if (activeTab === "general") return suggestedQuestions.general
    if (activeTab === "comparison") return suggestedQuestions.comparison
    const tool = tools.find((t) => t.id === activeTab)
    if (tool) {
      const provider = tool.provider.toLowerCase().replace(" ", "")
      return suggestedQuestions[provider as keyof typeof suggestedQuestions] || suggestedQuestions.default
    }
    return suggestedQuestions.default
  }

  const getTabTitle = () => {
    if (activeTab === "general") return "General Assistant"
    if (activeTab === "comparison") return "Cross-Platform Analysis"
    const tool = tools.find((t) => t.id === activeTab)
    return tool ? `${getToolDisplayName(tool.provider)} Assistant` : "Tool Assistant"
  }

  const getPlaceholder = () => {
    if (filePreview) return `Ask about ${filePreview.name}...`
    if (activeTab === "general") return "Ask anything about your tools, costs, or optimizations..."
    if (activeTab === "comparison") return "Ask about cross-platform insights..."
    return `Ask about your ${currentTool ? getToolDisplayName(currentTool.provider) : "tool"} data...`
  }

  // Token info line
  const getTokenInfo = () => {
    if (selectedFile && !researchCache.fileAnalysis) {
      return {
        text: `File analysis costs ${DEEP_RESEARCH_TOKEN_COST} token${DEEP_RESEARCH_TOKEN_COST > 1 ? "s" : ""}${modelMultiplier > 1 && aiModel ? ` (${aiModel.label})` : ""}, follow-ups are free`,
        icon: <Coins className="w-3 h-3" />,
        color: "text-gray-500",
        balance: tokenBalance ? `${tokenBalance.available} available` : null,
      }
    }
    if (researchCache.fileAnalysis) {
      return { text: "File data loaded — follow-up questions are free", icon: <Sparkles className="w-3 h-3" />, color: "text-green-400", balance: null }
    }
    if (activeTab === "general") {
      return { text: "Unlimited — no credits required", icon: null, color: "text-gray-500", balance: null }
    }
    if (hasCachedResearch()) {
      return { text: "Research data loaded — follow-ups are free", icon: <Sparkles className="w-3 h-3" />, color: "text-green-400", balance: null }
    }
    if (input.trim() && !isHeavyPrompt(input)) {
      return { text: "General question — free", icon: <Sparkles className="w-3 h-3" />, color: "text-green-400", balance: null }
    }
    return {
      text: `Data analysis costs ${DEEP_RESEARCH_TOKEN_COST} token${DEEP_RESEARCH_TOKEN_COST > 1 ? "s" : ""}${modelMultiplier > 1 && aiModel ? ` (${aiModel.label})` : ""}, general questions are free`,
      icon: <Coins className="w-3 h-3" />,
      color: "text-gray-500",
      balance: tokenBalance ? `${tokenBalance.available} available` : null,
    }
  }

  const tokenInfo = getTokenInfo()

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -mx-3 sm:-mx-4 lg:-mx-6 -mb-3 sm:-mb-4 lg:-mb-6 -mt-3 sm:-mt-4 lg:-mt-6 relative">
      {/* Chat Sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={deleteConversation}
        onRenameConversation={renameConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isLoading={conversationsLoading}
        toolName={currentTool ? getToolDisplayName(currentTool.provider) : undefined}
        readOnly={isViewer}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Slim Top Bar — toggle + tabs + model + new chat */}
        <div className="shrink-0 flex items-center gap-2 px-3 sm:px-4 lg:px-5 py-2 border-b border-white/10 bg-black/40 backdrop-blur-sm relative z-10">
          {/* Sidebar toggle — always visible when sidebar is closed */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Show conversations"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          {/* Tab area (scrollable) */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <ToolChatTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            <InlineModelSelector />
            {messages.length > 0 && !isViewer && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="h-8 px-2.5 text-gray-400 hover:text-white hover:bg-white/10 text-xs gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Chat</span>
              </Button>
            )}
          </div>
        </div>

        {/* Messages Area — fills remaining space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
              {messages.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center mb-5">
                    <Bot className="w-7 h-7 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-1.5">
                    {getTabTitle()}
                  </h3>
                  <p className="text-sm text-gray-400 mb-8 max-w-sm">
                    {isViewer
                      ? "Select a conversation from the sidebar to review past analyses."
                      : activeTab === "general"
                      ? "Ask about your connected tools, subscription costs, or optimization opportunities."
                      : activeTab === "comparison"
                      ? "Cross-reference data from connected platforms to find cost optimizations."
                      : `Analyze your ${currentTool ? getToolDisplayName(currentTool.provider) : "tool"} data for insights and cost savings.`}
                  </p>
                  {!isViewer && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                      {getSuggestedQuestions().map((question, index) => (
                        <button
                          key={index}
                          onClick={() => sendMessage(question)}
                          className="group text-left p-3 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-cyan-500/30 transition-all duration-200"
                        >
                          <p className="text-sm text-gray-300 group-hover:text-white transition-colors leading-snug">
                            {question}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Message List */
                <div className="space-y-5">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bot className="w-4 h-4 text-cyan-400" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3",
                          message.role === "user"
                            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                            : "bg-white/5 border border-white/10 text-gray-100"
                        )}
                      >
                        {message.role === "assistant" ? (
                          <ChatMessageRenderer content={message.content} />
                        ) : (
                          <>
                            {message.fileName && (
                              <div className="flex items-center gap-1.5 mb-1.5 text-xs text-white/80">
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>{message.fileName}</span>
                              </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </>
                        )}
                        <p
                          className={cn(
                            "text-[10px] mt-2",
                            message.role === "user" ? "text-white/60" : "text-gray-500"
                          )}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:300ms]" />
                          </div>
                          <span className="text-sm text-gray-400">
                            {researchCache.fileAnalysis || selectedFile
                              ? "Analyzing your file..."
                              : activeTab === "general"
                              ? "Thinking..."
                              : activeTab === "comparison"
                              ? "Analyzing platforms..."
                              : "Fetching & analyzing..."}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-3 sm:mx-4 lg:mx-5 mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Area — pinned at bottom */}
        <div className="shrink-0 border-t border-white/10 bg-black/60 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 py-3">
            {isViewer ? (
              <p className="text-sm text-gray-500 text-center py-1">
                View-only access — select a conversation from the sidebar to review past analyses
              </p>
            ) : (
              <>
                {/* File preview banner */}
                {filePreview && (
                  <div className="mb-2 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{filePreview.name}</p>
                      <p className="text-[10px] text-gray-400">{filePreview.size} &middot; {filePreview.type}</p>
                    </div>
                    <button
                      onClick={clearFile}
                      className="text-gray-400 hover:text-white p-1 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Composer */}
                <div className="relative flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.03] focus-within:border-cyan-500/40 focus-within:bg-white/[0.05] transition-all duration-200">
                  {/* File attach */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || !!filePreview}
                    className="self-end p-2.5 text-gray-500 hover:text-cyan-400 disabled:opacity-40 transition-colors"
                    title="Upload Excel or PDF"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Auto-growing textarea */}
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={getPlaceholder()}
                    disabled={isLoading}
                    rows={1}
                    className="flex-1 min-h-0 max-h-32 border-0 bg-transparent text-white placeholder:text-gray-500 resize-none py-2.5 px-0 text-sm focus-visible:ring-0 focus-visible:border-0 shadow-none"
                    style={{ fieldSizing: "content" } as React.CSSProperties}
                  />

                  {/* Send button */}
                  <button
                    onClick={() => sendMessage()}
                    disabled={(!input.trim() && !selectedFile) || isLoading}
                    className="self-end p-2.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Token info line */}
                <p className={cn("text-[10px] mt-1.5 text-center flex items-center justify-center gap-1", tokenInfo.color)}>
                  {tokenInfo.icon}
                  <span>{tokenInfo.text}</span>
                  {tokenInfo.balance && (
                    <span className="text-cyan-400 ml-0.5">({tokenInfo.balance})</span>
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Token Confirmation Dialog */}
      <AlertDialog open={showTokenConfirmation} onOpenChange={setShowTokenConfirmation}>
        <AlertDialogContent className="bg-gray-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-cyan-400" />
              Confirm Deep Research
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              <span className="block">
                This deep research will use <span className="text-cyan-400 font-semibold">{DEEP_RESEARCH_TOKEN_COST} token{DEEP_RESEARCH_TOKEN_COST > 1 ? "s" : ""}</span>{modelMultiplier > 1 && aiModel ? <span> ({aiModel.label} — {modelMultiplier}x cost)</span> : ""} to fetch and analyze your data.
              </span>
              <span className="block mt-2 text-green-400/80">
                After this, follow-up questions about the research will be free!
              </span>
              {tokenBalance && (
                <span className="block mt-2">
                  Current balance: <span className="text-white font-semibold">{tokenBalance.available} tokens</span>
                  {tokenBalance.available >= DEEP_RESEARCH_TOKEN_COST && (
                    <span className="text-gray-500"> → {tokenBalance.available - DEEP_RESEARCH_TOKEN_COST} tokens remaining after</span>
                  )}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelTokenUsage}
              className="bg-transparent border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmTokenUsage}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
            >
              Confirm & Research
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
