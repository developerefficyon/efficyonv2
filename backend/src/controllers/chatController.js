const { supabase } = require("../config/supabase")
const openaiService = require("../services/openaiService")

/**
 * Get all conversations for the current user
 * Supports filtering by toolId and chatType
 */
async function getConversations(req, res) {
  console.log(`[${new Date().toISOString()}] GET /api/chat/conversations`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { toolId, chatType } = req.query

    let query = supabase
      .from("chat_conversations")
      .select("id, title, tool_id, chat_type, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })

    // Filter by chat_type if provided (general, comparison, tool)
    if (chatType) {
      query = query.eq("chat_type", chatType)

      // For tool chats, also filter by specific tool_id if provided
      if (chatType === "tool" && toolId) {
        query = query.eq("tool_id", toolId)
      }
    } else if (toolId) {
      // Legacy support: if only toolId is provided, filter by it
      query = query.eq("tool_id", toolId)
    } else {
      // Default: get general conversations
      query = query.eq("chat_type", "general")
    }

    const { data, error } = await query

    if (error) {
      console.error(`[${new Date().toISOString()}] Error fetching conversations:`, error.message)
      return res.status(500).json({ error: "Failed to fetch conversations" })
    }

    return res.json({
      success: true,
      conversations: data || [],
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in getConversations:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Get a single conversation with its messages
 */
async function getConversation(req, res) {
  console.log(`[${new Date().toISOString()}] GET /api/chat/conversations/:id`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { id } = req.params

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (convError || !conversation) {
      return res.status(404).json({ error: "Conversation not found" })
    }

    // Get messages
    const { data: messages, error: msgError } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })

    if (msgError) {
      console.error(`[${new Date().toISOString()}] Error fetching messages:`, msgError.message)
      return res.status(500).json({ error: "Failed to fetch messages" })
    }

    return res.json({
      success: true,
      conversation: {
        ...conversation,
        messages: messages || [],
      },
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in getConversation:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Create a new conversation
 * Supports optional toolId for tool-specific conversations and chatType
 */
async function createConversation(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/chat/conversations`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { title, toolId, chatType } = req.body

    // Determine chat_type: if toolId is provided, it's a tool chat
    // Otherwise use provided chatType or default to 'general'
    let determinedChatType = chatType || "general"
    if (toolId && !chatType) {
      determinedChatType = "tool"
    }

    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({
        user_id: user.id,
        title: title || "New Chat",
        tool_id: toolId || null,
        chat_type: determinedChatType,
      })
      .select()
      .single()

    if (error) {
      console.error(`[${new Date().toISOString()}] Error creating conversation:`, error.message)
      return res.status(500).json({ error: "Failed to create conversation" })
    }

    return res.json({
      success: true,
      conversation: data,
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in createConversation:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Update conversation title
 */
async function updateConversation(req, res) {
  console.log(`[${new Date().toISOString()}] PUT /api/chat/conversations/:id`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { id } = req.params
    const { title } = req.body

    const { data, error } = await supabase
      .from("chat_conversations")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error(`[${new Date().toISOString()}] Error updating conversation:`, error.message)
      return res.status(500).json({ error: "Failed to update conversation" })
    }

    return res.json({
      success: true,
      conversation: data,
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in updateConversation:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Delete a conversation and its messages
 */
async function deleteConversation(req, res) {
  console.log(`[${new Date().toISOString()}] DELETE /api/chat/conversations/:id`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { id } = req.params

    // Delete messages first (due to foreign key)
    await supabase
      .from("chat_messages")
      .delete()
      .eq("conversation_id", id)

    // Delete conversation
    const { error } = await supabase
      .from("chat_conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error(`[${new Date().toISOString()}] Error deleting conversation:`, error.message)
      return res.status(500).json({ error: "Failed to delete conversation" })
    }

    return res.json({
      success: true,
      message: "Conversation deleted",
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in deleteConversation:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Add a message to a conversation
 */
async function addMessage(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/chat/conversations/:id/messages`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { id } = req.params
    const { role, content } = req.body

    if (!role || !content) {
      return res.status(400).json({ error: "role and content are required" })
    }

    // Verify conversation belongs to user
    const { data: conversation } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" })
    }

    // Add message
    const { data: message, error: msgError } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: id,
        role,
        content,
      })
      .select()
      .single()

    if (msgError) {
      console.error(`[${new Date().toISOString()}] Error adding message:`, msgError.message)
      return res.status(500).json({ error: "Failed to add message" })
    }

    // Update conversation's updated_at and auto-generate title from first user message
    const updateData = { updated_at: new Date().toISOString() }

    // Get current conversation to check if title needs updating
    const { data: currentConv } = await supabase
      .from("chat_conversations")
      .select("title")
      .eq("id", id)
      .single()

    if (currentConv?.title === "New Chat" && role === "user") {
      // Generate title from first 50 chars of user message
      updateData.title = content.length > 50 ? content.substring(0, 47) + "..." : content
    }

    await supabase
      .from("chat_conversations")
      .update(updateData)
      .eq("id", id)

    return res.json({
      success: true,
      message,
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in addMessage:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Chat with tool context - fetches tool data and generates AI response
 */
async function chatWithTool(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/chat/tool`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { question, toolId, dataType } = req.body

    if (!question) {
      return res.status(400).json({ error: "question is required" })
    }

    if (!toolId) {
      return res.status(400).json({ error: "toolId is required" })
    }

    // Get the integration/tool info
    const { data: integration, error: intError } = await supabase
      .from("company_integrations")
      .select("*")
      .eq("id", toolId)
      .single()

    if (intError || !integration) {
      return res.status(404).json({ error: "Tool not found" })
    }

    // Fetch tool data based on the question and dataType
    let toolData = null
    let dataDescription = ""

    try {
      toolData = await fetchToolData(integration, dataType, req)
      dataDescription = getDataDescription(integration.provider, dataType)
    } catch (fetchError) {
      console.error(`[${new Date().toISOString()}] Error fetching tool data:`, fetchError.message)
      // Continue without tool data - AI will respond based on question alone
    }

    // Build context for AI
    const toolContext = {
      toolName: integration.provider,
      toolId: integration.id,
      dataType: dataType || "general",
      data: toolData,
      dataDescription,
    }

    // Generate AI response with tool context
    const response = await openaiService.chatWithToolContext(question, toolContext)

    return res.json({
      success: true,
      response,
      toolData: toolData, // Include raw data for frontend charts/tables
      dataType: dataType || "general",
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in chatWithTool:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Fetch data from a tool based on the data type requested
 */
async function fetchToolData(integration, dataType, req) {
  const provider = integration.provider?.toLowerCase()

  if (provider === "fortnox") {
    return await fetchFortnoxData(integration, dataType, req)
  } else if (provider === "microsoft365" || provider === "microsoft 365") {
    return await fetchMicrosoft365Data(integration, dataType, req)
  }

  return null
}

/**
 * Fetch Fortnox data
 */
async function fetchFortnoxData(integration, dataType, req) {
  const fortnoxController = require("./fortnoxController")

  // Create a mock request/response to reuse controller functions
  const mockReq = { ...req, user: req.user }
  let data = null

  switch (dataType) {
    case "invoices":
      data = await callControllerMethod(fortnoxController.getFortnoxInvoices, mockReq)
      break
    case "supplier-invoices":
      data = await callControllerMethod(fortnoxController.getFortnoxSupplierInvoices, mockReq)
      break
    case "customers":
      data = await callControllerMethod(fortnoxController.getFortnoxCustomers, mockReq)
      break
    case "suppliers":
      data = await callControllerMethod(fortnoxController.getFortnoxSuppliers, mockReq)
      break
    case "expenses":
      data = await callControllerMethod(fortnoxController.getFortnoxExpenses, mockReq)
      break
    case "cost-leaks":
      data = await callControllerMethod(fortnoxController.analyzeFortnoxCostLeaks, mockReq)
      break
    case "company":
      data = await callControllerMethod(fortnoxController.getFortnoxCompanyInfo, mockReq)
      break
    default:
      // For general queries, fetch a summary
      data = await callControllerMethod(fortnoxController.getFortnoxCompanyInfo, mockReq)
  }

  return data
}

/**
 * Fetch Microsoft 365 data
 */
async function fetchMicrosoft365Data(integration, dataType, req) {
  const microsoft365Controller = require("./microsoft365Controller")

  const mockReq = { ...req, user: req.user }
  let data = null

  switch (dataType) {
    case "licenses":
      data = await callControllerMethod(microsoft365Controller.getMicrosoft365Licenses, mockReq)
      break
    case "users":
      data = await callControllerMethod(microsoft365Controller.getMicrosoft365Users, mockReq)
      break
    case "usage":
      data = await callControllerMethod(microsoft365Controller.getMicrosoft365UsageReports, mockReq)
      break
    case "cost-leaks":
      data = await callControllerMethod(microsoft365Controller.analyzeMicrosoft365CostLeaks, mockReq)
      break
    default:
      // For general queries, fetch licenses summary
      data = await callControllerMethod(microsoft365Controller.getMicrosoft365Licenses, mockReq)
  }

  return data
}

/**
 * Helper to call controller methods and capture response data
 */
async function callControllerMethod(method, req) {
  return new Promise((resolve, reject) => {
    const mockRes = {
      json: (data) => resolve(data),
      status: (code) => ({
        json: (data) => {
          if (code >= 400) reject(new Error(data.error || "Request failed"))
          else resolve(data)
        }
      })
    }

    method(req, mockRes).catch(reject)
  })
}

/**
 * Get description of data type for AI context
 */
function getDataDescription(provider, dataType) {
  const descriptions = {
    fortnox: {
      invoices: "Customer invoices including amounts, dates, and payment status",
      "supplier-invoices": "Supplier/vendor invoices and bills",
      customers: "Customer list with contact and account details",
      suppliers: "Supplier/vendor list with contact details",
      expenses: "Expense records and categories",
      "cost-leaks": "Cost analysis identifying potential savings and anomalies",
      company: "Company information and settings",
      general: "General company and financial information",
    },
    microsoft365: {
      licenses: "Microsoft 365 license subscriptions and assigned counts",
      users: "User accounts with license assignments and sign-in activity",
      usage: "Usage reports including active users, mailbox, and Teams activity",
      "cost-leaks": "License utilization analysis and optimization opportunities",
      general: "License and user summary",
    },
  }

  const providerKey = provider?.toLowerCase() === "microsoft 365" ? "microsoft365" : provider?.toLowerCase()
  return descriptions[providerKey]?.[dataType] || descriptions[providerKey]?.general || "Tool data"
}

module.exports = {
  getConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  addMessage,
  chatWithTool,
}
