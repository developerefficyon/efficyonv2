const { supabase } = require("../config/supabase")
const openaiService = require("../services/openaiService")
const tokenService = require("../services/tokenService")

// Token cost for deep research
const DEEP_RESEARCH_TOKEN_COST = 1

/**
 * Get all user IDs that belong to the same team/company.
 * Solo users (no company) return just their own ID.
 */
async function getTeamUserIds(userId) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle()

  if (!profile?.company_id) {
    return [userId]
  }

  // Get all active team members + company owner
  const { data: members } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("company_id", profile.company_id)
    .eq("status", "active")

  const memberIds = (members || []).map((m) => m.user_id)

  // Also include company owner (may not be in team_members yet)
  const { data: company } = await supabase
    .from("companies")
    .select("user_id")
    .eq("id", profile.company_id)
    .maybeSingle()

  if (company?.user_id && !memberIds.includes(company.user_id)) {
    memberIds.push(company.user_id)
  }

  // Ensure the requesting user is included
  if (!memberIds.includes(userId)) {
    memberIds.push(userId)
  }

  return memberIds
}

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

    // Get all team member user IDs so conversations are shared
    const teamUserIds = await getTeamUserIds(user.id)

    let query = supabase
      .from("chat_conversations")
      .select("id, title, tool_id, chat_type, created_at, updated_at")
      .in("user_id", teamUserIds)
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

    // Get all team member user IDs so conversations are shared
    const teamUserIds = await getTeamUserIds(user.id)

    // Get conversation (accessible by any team member)
    const { data: conversation, error: convError } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("id", id)
      .in("user_id", teamUserIds)
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

    // Get all team member user IDs so team members can update shared conversations
    const teamUserIds = await getTeamUserIds(user.id)

    const { data, error } = await supabase
      .from("chat_conversations")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", id)
      .in("user_id", teamUserIds)
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

    // Get all team member user IDs so team members can delete shared conversations
    const teamUserIds = await getTeamUserIds(user.id)

    // Delete messages first (due to foreign key)
    await supabase
      .from("chat_messages")
      .delete()
      .eq("conversation_id", id)

    // Delete conversation (accessible by any team member)
    const { error } = await supabase
      .from("chat_conversations")
      .delete()
      .eq("id", id)
      .in("user_id", teamUserIds)

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

    // Verify conversation belongs to user's team
    const teamUserIds = await getTeamUserIds(user.id)
    const { data: conversation } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("id", id)
      .in("user_id", teamUserIds)
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
 * If cachedResearchData is provided, uses it (free follow-up)
 * If no cached data, fetches new data (costs 1 token for deep research)
 */
async function chatWithTool(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/chat/tool`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { question, toolId, dataType, cachedResearchData } = req.body

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

    let toolData = null
    let dataDescription = ""
    let tokensUsed = 0
    let isDeepResearch = false

    // Check if we have cached research data (free follow-up)
    if (cachedResearchData && Object.keys(cachedResearchData).length > 0) {
      console.log(`[${new Date().toISOString()}] Using cached research data (free follow-up)`)
      toolData = cachedResearchData
      dataDescription = getDataDescription(integration.provider, dataType)
    } else {
      // Need to fetch new data - this is a deep research request (costs 1 token)
      isDeepResearch = true
      console.log(`[${new Date().toISOString()}] Deep research requested - checking token balance`)

      // Check token balance before fetching
      const { hasEnough, available } = await tokenService.checkTokenBalance(user.id, DEEP_RESEARCH_TOKEN_COST)
      if (!hasEnough) {
        console.log(`[${new Date().toISOString()}] Insufficient tokens: ${available} available, ${DEEP_RESEARCH_TOKEN_COST} required`)
        return res.status(402).json({
          error: "INSUFFICIENT_TOKENS",
          message: `Deep research requires ${DEEP_RESEARCH_TOKEN_COST} token. You have ${available} token(s) available.`,
          available,
          required: DEEP_RESEARCH_TOKEN_COST,
        })
      }

      try {
        toolData = await fetchToolData(integration, dataType, req)
        dataDescription = getDataDescription(integration.provider, dataType)

        // Consume token after successful data fetch
        const consumeResult = await tokenService.consumeTokens(user.id, DEEP_RESEARCH_TOKEN_COST, "advanced_ai_deep_dive", {
          integrationSources: [integration.provider.toLowerCase()],
          description: `${integration.provider} ${dataType || "general"} deep research`,
        })

        if (consumeResult.success) {
          tokensUsed = DEEP_RESEARCH_TOKEN_COST
          console.log(`[${new Date().toISOString()}] Consumed ${DEEP_RESEARCH_TOKEN_COST} token for deep research. Remaining: ${consumeResult.balanceAfter}`)
        }
      } catch (fetchError) {
        console.error(`[${new Date().toISOString()}] Error fetching tool data:`, fetchError.message)
        // Continue without tool data - AI will respond based on question alone
      }
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
      toolData: toolData, // Include raw data for frontend to cache
      dataType: dataType || "general",
      isDeepResearch,
      tokensUsed,
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
  } else if (provider === "hubspot") {
    return await fetchHubSpotData(integration, dataType, req)
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
 * Fetch HubSpot data
 */
async function fetchHubSpotData(integration, dataType, req) {
  const hubspotController = require("./hubspotController")

  const mockReq = { ...req, user: req.user }
  let data = null

  switch (dataType) {
    case "users":
      data = await callControllerMethod(hubspotController.getHubSpotUsers, mockReq)
      break
    case "cost-leaks":
      data = await callControllerMethod(hubspotController.analyzeHubSpotCostLeaks, mockReq)
      break
    case "account":
      data = await callControllerMethod(hubspotController.getHubSpotAccountInfo, mockReq)
      break
    default:
      // For general queries, fetch users summary
      data = await callControllerMethod(hubspotController.getHubSpotUsers, mockReq)
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
    hubspot: {
      users: "HubSpot user accounts with roles and activity status",
      account: "HubSpot account information and settings",
      "cost-leaks": "Seat utilization analysis and cost optimization opportunities",
      general: "HubSpot users and seat summary",
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
