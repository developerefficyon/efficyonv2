"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { useAuth, getBackendToken } from "@/lib/auth-hooks"
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
}

const suggestedQuestions = {
  general: [
    "What are my current cost optimization opportunities?",
    "How can I reduce my software subscription costs?",
    "Which tools have unused seats?",
    "Show me my monthly spending trends",
    "What integrations need attention?",
  ],
  fortnox: [
    "Show me all overdue invoices",
    "What's my total outstanding amount?",
    "Analyze my spending patterns",
    "Show supplier invoice breakdown",
    "Find potential duplicate payments",
  ],
  microsoft365: [
    "Show license utilization",
    "Which users haven't signed in recently?",
    "How many unused licenses do I have?",
    "Analyze user activity patterns",
    "What's my license cost optimization potential?",
  ],
  comparison: [
    "Run a deep analysis across both platforms",
    "Show cost vs. activity gap analysis",
    "What's my cost per active user?",
    "Compare software spending with user productivity",
    "Find combined optimization opportunities",
    "Which software has the lowest utilization?",
  ],
  default: [
    "Show me a summary of the data",
    "What insights can you find?",
    "Analyze cost optimization opportunities",
    "Show me key metrics",
    "What actions do you recommend?",
  ],
}

export default function ChatbotPage() {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState("general")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Get connected tools
  const { tools } = useConnectedTools()

  // Get current tool info and chat type
  // Determine chatType based on activeTab
  const chatType: "general" | "comparison" | "tool" =
    activeTab === "general" ? "general" :
    activeTab === "comparison" ? "comparison" : "tool"

  const currentTool = chatType === "tool" ? tools.find((t) => t.id === activeTab) : null
  const currentToolId = chatType === "tool" ? activeTab : null

  // Chat conversations hook - filtered by chat type and tool
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

  // Load conversation messages when selecting a conversation
  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id)
    setError(null)

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

    // Close sidebar on mobile after selection
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
      // Close sidebar on mobile after creating new chat
      if (isMobile) {
        setSidebarOpen(false)
      }
    }
  }

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text || isLoading) return

    // Create conversation if none exists
    let conversationId = activeConversationId
    if (!conversationId) {
      conversationId = await createConversation()
      if (!conversationId) return
    }

    setError(null)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Save user message to database
    addMessageToConversation(conversationId, "user", text)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
      const accessToken = await getBackendToken()

      if (!accessToken) {
        throw new Error("Session expired. Please log in again.")
      }

      let response
      let data

      if (activeTab === "general") {
        // General chat - use existing endpoint
        response = await fetch(`${apiBase}/api/ai/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            question: text,
            chatType: "general",
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to get response from AI")
        }

        data = await response.json()
      } else if (activeTab === "comparison") {
        // Cross-platform comparison - use comparison endpoint
        response = await fetch(`${apiBase}/api/chat/comparison`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            question: text,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to get response from AI")
        }

        data = await response.json()
      } else {
        // Tool-specific chat - use new endpoint
        response = await fetch(`${apiBase}/api/chat/tool`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            question: text,
            toolId: activeTab,
            dataType: detectDataType(text),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to get response from AI")
        }

        data = await response.json()
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "I apologize, but I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Save assistant message to database
      addMessageToConversation(conversationId, "assistant", assistantMessage.content)
    } catch (err) {
      console.error("Chat error:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
      toast.error("Failed to send message", {
        description: err instanceof Error ? err.message : "Please try again",
      })
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  // Detect data type from question for tool-specific queries
  const detectDataType = (question: string): string => {
    const q = question.toLowerCase()

    // Fortnox data types
    if (q.includes("invoice") && !q.includes("supplier")) return "invoices"
    if (q.includes("supplier invoice") || q.includes("vendor invoice") || q.includes("bill")) return "supplier-invoices"
    if (q.includes("customer")) return "customers"
    if (q.includes("supplier") || q.includes("vendor")) return "suppliers"
    if (q.includes("expense")) return "expenses"
    if (q.includes("cost leak") || q.includes("saving") || q.includes("optimize") || q.includes("duplicate")) return "cost-leaks"

    // Microsoft 365 data types
    if (q.includes("license") || q.includes("subscription")) return "licenses"
    if (q.includes("user") || q.includes("sign in") || q.includes("login") || q.includes("inactive")) return "users"
    if (q.includes("usage") || q.includes("activity") || q.includes("teams") || q.includes("mailbox")) return "usage"

    return "general"
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  // Get suggested questions for current tab
  const getSuggestedQuestions = () => {
    if (activeTab === "general") return suggestedQuestions.general
    if (activeTab === "comparison") return suggestedQuestions.comparison
    const tool = tools.find((t) => t.id === activeTab)
    if (tool) {
      const provider = tool.provider.toLowerCase().replace(" ", "")
      return suggestedQuestions[provider as keyof typeof suggestedQuestions] || suggestedQuestions.default
    }
    return suggestedQuestions.default
  }

  // Get title for current tab
  const getTabTitle = () => {
    if (activeTab === "general") return "General Assistant"
    if (activeTab === "comparison") return "Cross-Platform Analysis"
    const tool = tools.find((t) => t.id === activeTab)
    return tool ? `${getToolDisplayName(tool.provider)} Assistant` : "Tool Assistant"
  }

  // Get description for current tab
  const getTabDescription = () => {
    if (activeTab === "general") {
      return "Ask questions about your tools, costs, and optimizations"
    }
    if (activeTab === "comparison") {
      return "Cross-reference Fortnox and Microsoft 365 data for unified insights"
    }
    const tool = tools.find((t) => t.id === activeTab)
    if (tool) {
      const provider = tool.provider.toLowerCase()
      if (provider === "fortnox") {
        return "Ask about invoices, expenses, customers, and financial analysis"
      }
      if (provider === "microsoft365" || provider === "microsoft 365") {
        return "Ask about licenses, users, usage, and optimization opportunities"
      }
    }
    return "Ask questions about this tool's data and get insights"
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] -mx-3 sm:-mx-4 lg:-mx-6 -mb-3 sm:-mb-4 lg:-mb-6 relative">
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
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="mb-4 pt-3 sm:pt-4 lg:pt-6 px-3 sm:px-4 lg:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Chatbot</h2>
          <p className="text-sm sm:text-base text-gray-400 mb-4">
            AI-powered assistant to help you optimize your SaaS costs
          </p>

          {/* Tool Tabs */}
          <ToolChatTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Chat Card - Takes remaining height */}
        <div className="flex-1 min-h-0 px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          <Card className="bg-black/80 backdrop-blur-xl border-white/10 h-full flex flex-col">
            <CardHeader className="border-b border-white/10 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                    <Bot className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">{getTabTitle()}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {getTabDescription()}
                    </CardDescription>
                  </div>
                </div>
                {messages.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearChat}
                    className="border-white/10 bg-black/50 text-gray-300 hover:text-white hover:bg-white/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    New Chat
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Chat Messages Area - Flexible height */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="h-full p-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center mb-4">
                      <Sparkles className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      How can I help you today?
                    </h3>
                    <p className="text-sm text-gray-400 mb-6 max-w-md">
                      {activeTab === "general"
                        ? "Ask me anything about your connected tools, subscription costs, optimization opportunities, or general SaaS management questions."
                        : activeTab === "comparison"
                        ? "I'll cross-reference your Fortnox financial data with Microsoft 365 usage data to find cost optimization opportunities, activity gaps, and prioritized recommendations."
                        : `Ask me anything about your ${currentTool ? getToolDisplayName(currentTool.provider) : "tool"} data. I can analyze invoices, find cost savings, and provide insights.`}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                      {getSuggestedQuestions().map((question, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => sendMessage(question)}
                          className="border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-cyan-500/20 hover:border-cyan-500/30 text-xs"
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          message.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        {message.role === "assistant" && (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
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
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
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
                            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                            <span className="text-sm text-gray-400">
                              {activeTab === "general"
                                ? "Thinking..."
                                : activeTab === "comparison"
                                ? "Analyzing both platforms..."
                                : "Fetching data and analyzing..."}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
                </ScrollArea>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mx-4 mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Input Area - Fixed at bottom */}
              <div className="p-4 border-t border-white/10 shrink-0 bg-black/40">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      activeTab === "general"
                        ? "Type your message..."
                        : activeTab === "comparison"
                        ? "Ask about cross-platform insights..."
                        : `Ask about your ${currentTool ? getToolDisplayName(currentTool.provider) : "tool"} data...`
                    }
                    disabled={isLoading}
                    className="flex-1 bg-black/50 border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500/50"
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 text-center">
                  Chat is unlimited - no credits required
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
