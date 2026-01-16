"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MessageSquare,
  Plus,
  PanelLeftClose,
  PanelLeft,
  MoreHorizontal,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { getValidSessionToken } from "@/lib/auth-helpers"
import { toast } from "sonner"

export type Conversation = {
  id: string
  title: string
  tool_id: string | null
  created_at: string
  updated_at: string
}

export type ConversationMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

interface ChatSidebarProps {
  conversations: Conversation[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onDeleteConversation: (id: string) => void
  onRenameConversation: (id: string, title: string) => void
  isOpen: boolean
  onToggle: () => void
  isLoading?: boolean
  toolName?: string
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  isOpen,
  onToggle,
  isLoading = false,
  toolName,
}: ChatSidebarProps) {
  const isMobile = useIsMobile()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")

  const handleStartEdit = (conv: Conversation) => {
    setEditingId(conv.id)
    setEditTitle(conv.title)
  }

  const handleSaveEdit = () => {
    if (editingId && editTitle.trim()) {
      onRenameConversation(editingId, editTitle.trim())
    }
    setEditingId(null)
    setEditTitle("")
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle("")
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-black/80 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
          {toolName ? `${toolName} Chats` : "Chats"}
        </h2>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={onNewConversation}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 px-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="space-y-1 py-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group relative flex items-center rounded-lg transition-all duration-200",
                  activeConversationId === conv.id
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30"
                    : "hover:bg-white/5"
                )}
              >
                {editingId === conv.id ? (
                  <div className="flex items-center gap-1 w-full p-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit()
                        if (e.key === "Escape") handleCancelEdit()
                      }}
                      className="h-7 text-sm bg-black/50 border-white/20 text-white"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleSaveEdit}
                      className="h-7 w-7 text-green-400 hover:text-green-300 hover:bg-green-500/20"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onSelectConversation(conv.id)}
                      className="flex-1 text-left p-3 pr-10"
                    >
                      <p
                        className={cn(
                          "text-sm truncate",
                          activeConversationId === conv.id
                            ? "text-white font-medium"
                            : "text-gray-300"
                        )}
                      >
                        {conv.title}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </p>
                    </button>
                    <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-black/95 border-white/10"
                        >
                          <DropdownMenuItem
                            onClick={() => handleStartEdit(conv)}
                            className="text-gray-300 focus:text-white focus:bg-white/10"
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDeleteConversation(conv.id)}
                            className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )

  // Mobile: Use Sheet (drawer)
  if (isMobile) {
    return (
      <>
        {/* Mobile toggle button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="fixed top-20 left-4 z-50 h-10 w-10 bg-black/80 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 lg:hidden"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>

        <Sheet open={isOpen} onOpenChange={onToggle}>
          <SheetContent
            side="left"
            className="w-[280px] p-0 bg-black border-r border-white/10"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Chat History</SheetTitle>
            </SheetHeader>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </>
    )
  }

  // Desktop: Inline sidebar (not fixed, flows with content)
  return (
    <>
      {/* Desktop toggle button (when sidebar is closed) */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="absolute top-8 left-8 z-40 h-10 w-10 bg-black/80 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Desktop sidebar - inline with Card styling */}
      <div
        className={cn(
          "h-full transition-all duration-300 ease-in-out shrink-0 py-3 sm:py-4 lg:py-6 pl-3 sm:pl-4 lg:pl-6",
          isOpen ? "block" : "hidden"
        )}
        style={{ width: isOpen ? "304px" : "0px" }}
      >
        <div className="h-full w-[280px] rounded-xl border border-white/10 overflow-hidden">
          {sidebarContent}
        </div>
      </div>
    </>
  )
}

// Cache for conversations by tool
type ConversationsCache = {
  [toolId: string]: {
    conversations: Conversation[]
    loadedAt: number
  }
}

// Cache for loaded conversation messages
type MessagesCache = {
  [conversationId: string]: {
    messages: ConversationMessage[]
    loadedAt: number
  }
}

// Hook to manage chat conversations with tool support and caching
export function useChatConversations(toolId: string | null = null) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Cache refs to persist across re-renders
  const conversationsCacheRef = useRef<ConversationsCache>({})
  const messagesCacheRef = useRef<MessagesCache>({})

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
  const cacheKey = toolId || "general"
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  const fetchConversations = useCallback(async (forceRefresh = false) => {
    // Check cache first
    const cached = conversationsCacheRef.current[cacheKey]
    const now = Date.now()

    if (!forceRefresh && cached && (now - cached.loadedAt) < CACHE_TTL) {
      setConversations(cached.conversations)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const accessToken = await getValidSessionToken()
      if (!accessToken) return

      const url = new URL(`${apiBase}/api/chat/conversations`)
      if (toolId) {
        url.searchParams.set("toolId", toolId)
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const convs = data.conversations || []

        // Update cache
        conversationsCacheRef.current[cacheKey] = {
          conversations: convs,
          loadedAt: now,
        }

        setConversations(convs)
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error)
    } finally {
      setIsLoading(false)
    }
  }, [apiBase, toolId, cacheKey])

  const createConversation = useCallback(async (): Promise<string | null> => {
    try {
      const accessToken = await getValidSessionToken()
      if (!accessToken) {
        toast.error("Session expired. Please log in again.")
        return null
      }

      const response = await fetch(`${apiBase}/api/chat/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: "New Chat",
          toolId: toolId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newConv = data.conversation

        // Update state and cache
        setConversations((prev) => [newConv, ...prev])
        conversationsCacheRef.current[cacheKey] = {
          conversations: [newConv, ...conversations],
          loadedAt: Date.now(),
        }

        setActiveConversationId(newConv.id)
        return newConv.id
      }
      return null
    } catch (error) {
      console.error("Failed to create conversation:", error)
      toast.error("Failed to create new chat")
      return null
    }
  }, [apiBase, toolId, cacheKey, conversations])

  const deleteConversation = useCallback(async (id: string) => {
    try {
      const accessToken = await getValidSessionToken()
      if (!accessToken) return

      const response = await fetch(`${apiBase}/api/chat/conversations/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        // Update state and cache
        const updatedConvs = conversations.filter((c) => c.id !== id)
        setConversations(updatedConvs)
        conversationsCacheRef.current[cacheKey] = {
          conversations: updatedConvs,
          loadedAt: Date.now(),
        }

        // Clear message cache for this conversation
        delete messagesCacheRef.current[id]

        if (activeConversationId === id) {
          setActiveConversationId(null)
        }
        toast.success("Chat deleted")
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error)
      toast.error("Failed to delete chat")
    }
  }, [apiBase, cacheKey, conversations, activeConversationId])

  const renameConversation = useCallback(async (id: string, title: string) => {
    try {
      const accessToken = await getValidSessionToken()
      if (!accessToken) return

      const response = await fetch(`${apiBase}/api/chat/conversations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ title }),
      })

      if (response.ok) {
        // Update state and cache
        const updatedConvs = conversations.map((c) =>
          c.id === id ? { ...c, title } : c
        )
        setConversations(updatedConvs)
        conversationsCacheRef.current[cacheKey] = {
          conversations: updatedConvs,
          loadedAt: Date.now(),
        }
      }
    } catch (error) {
      console.error("Failed to rename conversation:", error)
      toast.error("Failed to rename chat")
    }
  }, [apiBase, cacheKey, conversations])

  const addMessageToConversation = useCallback(async (
    conversationId: string,
    role: "user" | "assistant",
    content: string
  ) => {
    try {
      const accessToken = await getValidSessionToken()
      if (!accessToken) return

      await fetch(`${apiBase}/api/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ role, content }),
      })

      // Invalidate message cache for this conversation
      delete messagesCacheRef.current[conversationId]

      // Refresh conversations to get updated title/timestamp
      fetchConversations(true)
    } catch (error) {
      console.error("Failed to save message:", error)
    }
  }, [apiBase, fetchConversations])

  const loadConversation = useCallback(async (id: string) => {
    // Check message cache first
    const cached = messagesCacheRef.current[id]
    const now = Date.now()

    if (cached && (now - cached.loadedAt) < CACHE_TTL) {
      return { messages: cached.messages }
    }

    try {
      const accessToken = await getValidSessionToken()
      if (!accessToken) return null

      const response = await fetch(`${apiBase}/api/chat/conversations/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const messages = data.conversation?.messages || []

        // Cache messages
        messagesCacheRef.current[id] = {
          messages,
          loadedAt: now,
        }

        return data.conversation
      }
      return null
    } catch (error) {
      console.error("Failed to load conversation:", error)
      return null
    }
  }, [apiBase])

  // Clear caches when toolId changes
  const clearCache = useCallback(() => {
    conversationsCacheRef.current = {}
    messagesCacheRef.current = {}
  }, [])

  // Fetch conversations when hook mounts or toolId changes
  useEffect(() => {
    setActiveConversationId(null) // Reset active conversation when tool changes
    fetchConversations()
  }, [toolId]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    isLoading,
    createConversation,
    deleteConversation,
    renameConversation,
    addMessageToConversation,
    loadConversation,
    refreshConversations: () => fetchConversations(true),
    clearCache,
  }
}
