const axios = require("axios")
const { formatCurrencyForIntegration, getCurrencyForIntegration } = require("../utils/currency")

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini"
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

/**
 * Generate AI-powered analysis summary
 * @param {Object} analysisData - Cost leak analysis data
 * @returns {Promise<string>} AI-generated summary
 */
async function generateAnalysisSummary(analysisData) {
  if (!OPENAI_API_KEY) {
    console.warn("[OpenAI] API key not configured, skipping summary generation")
    return null
  }

  try {
    console.log(`[${new Date().toISOString()}] Generating analysis summary with OpenAI`)

    const prompt = buildAnalysisPrompt(analysisData)

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a financial analysis expert specializing in cost optimization. Provide concise, actionable insights based on cost leak analysis data. Be direct and focus on the biggest savings opportunities.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    )

    const summary = response.data.choices[0].message.content
    console.log(`[${new Date().toISOString()}] Summary generated successfully`)

    return summary
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error generating summary:`, error.message)
    return null
  }
}

/**
 * Generate AI recommendations for specific findings
 * @param {Object} finding - Individual cost leak finding
 * @returns {Promise<string>} AI-generated recommendations
 */
async function generateRecommendations(finding) {
  if (!OPENAI_API_KEY) {
    console.warn("[OpenAI] API key not configured, skipping recommendations")
    return null
  }

  try {
    console.log(
      `[${new Date().toISOString()}] Generating recommendations for: ${finding.type}`
    )

    const prompt = buildRecommendationPrompt(finding)

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a financial consultant. Provide 2-3 specific, actionable recommendations to address this cost issue. Keep it concise and practical.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    )

    const recommendations = response.data.choices[0].message.content
    console.log(`[${new Date().toISOString()}] Recommendations generated successfully`)

    return recommendations
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error generating recommendations:`, error.message)
    return null
  }
}

/**
 * Estimate potential savings with AI
 * @param {Object} finding - Cost leak finding
 * @returns {Promise<number>} Estimated savings amount
 */
async function estimatePotentialSavings(finding) {
  if (!OPENAI_API_KEY) {
    console.warn("[OpenAI] API key not configured, skipping savings estimation")
    return finding.potentialSavings || 0
  }

  try {
    console.log(`[${new Date().toISOString()}] Estimating savings for: ${finding.type}`)

    const prompt = `
Based on this cost leak finding, estimate the annual savings potential (in USD):

Type: ${finding.type}
Current Amount: ${finding.amount || finding.total}
Supplier: ${finding.supplierName || "Unknown"}
Description: ${JSON.stringify(finding)}

Respond with ONLY a number (the estimated annual savings amount). Be conservative in your estimate.
`

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a financial analyst estimating cost savings. Respond with ONLY a number, nothing else.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 50,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    )

    const savingsStr = response.data.choices[0].message.content.trim()
    const savings = parseFloat(savingsStr.replace(/[^0-9.-]/g, "")) || 0

    console.log(
      `[${new Date().toISOString()}] Estimated savings: ${savings} for ${finding.type}`
    )

    return Math.max(savings, 0)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error estimating savings:`, error.message)
    return finding.potentialSavings || 0
  }
}

/**
 * Chat with AI about analysis results
 * @param {string} question - User's question about the analysis
 * @param {Object} analysisData - The cost leak analysis data for context
 * @returns {Promise<string>} AI response
 */
async function chatAboutAnalysis(question, analysisData) {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured")
  }

  try {
    console.log(`[${new Date().toISOString()}] Chat query: ${question}`)

    const context = JSON.stringify(analysisData, null, 2)
    const systemPrompt = `You are a helpful financial analysis assistant. You have access to the following cost leak analysis data:

${context}

Help the user understand their cost leaks and provide actionable insights. Be friendly, clear, and specific.`

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: question,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    )

    const answer = response.data.choices[0].message.content
    console.log(`[${new Date().toISOString()}] Chat response generated`)

    return answer
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in chat:`, error.message)
    throw new Error(`Failed to process chat request: ${error.message}`)
  }
}

/**
 * Build prompt for analysis summary
 */
function buildAnalysisPrompt(data) {
  return `
Analyze this cost leak data and provide a brief executive summary with the top 3 priorities:

Total Invoices: ${data.summary?.totalInvoices || 0}
Total Amount: ${data.summary?.totalAmount || 0}

Duplicate Payments Found: ${data.summary?.duplicatePayments?.length || 0}
${data.summary?.duplicatePayments?.slice(0, 3).map((d) => `- ${d.supplierName}: ${d.duplicates?.length || 0} duplicates`).join("\n") || "None"}

Unusual Amounts (Anomalies): ${data.summary?.unusualAmounts?.length || 0}
${data.summary?.unusualAmounts?.slice(0, 3).map((u) => `- ${u.supplierName}: ${u.amount}`).join("\n") || "None"}

Recurring Subscriptions: ${data.summary?.recurringSubscriptions?.length || 0}
${data.summary?.recurringSubscriptions?.slice(0, 3).map((r) => `- ${r.supplierName}: ${r.frequency}`).join("\n") || "None"}

Overdue Invoices: ${data.summary?.overdueInvoices?.length || 0}

Price Increases: ${data.summary?.priceIncreases?.length || 0}
${data.summary?.priceIncreases?.slice(0, 3).map((p) => `- ${p.supplierName}: ${p.percentageIncrease}% increase`).join("\n") || "None"}

Provide actionable insights and priority recommendations.
`
}

/**
 * Build prompt for recommendations
 */
function buildRecommendationPrompt(finding) {
  return `
Generate specific recommendations for this cost leak finding:

Type: ${finding.type}
Supplier: ${finding.supplierName || "Unknown"}
Amount: ${finding.amount || finding.total || "Unknown"}
Details: ${JSON.stringify(finding)}

Provide 2-3 specific actions the company can take.
`
}

/**
 * Batch process findings with AI
 * @param {Array} findings - Array of cost leak findings
 * @returns {Promise<Array>} Findings with AI enhancements
 */
async function enhanceFindingsWithAI(findings) {
  if (!OPENAI_API_KEY || !findings || findings.length === 0) {
    return findings
  }

  try {
    console.log(
      `[${new Date().toISOString()}] Enhancing ${findings.length} findings with AI`
    )

    const enhancedFindings = await Promise.all(
      findings.map(async (finding) => {
        const recommendations = await generateRecommendations(finding)
        const estimatedSavings = await estimatePotentialSavings(finding)

        return {
          ...finding,
          aiRecommendations: recommendations,
          aiEstimatedSavings: estimatedSavings,
          aiEnhanced: true,
        }
      })
    )

    console.log(
      `[${new Date().toISOString()}] Successfully enhanced ${enhancedFindings.length} findings`
    )

    return enhancedFindings
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error enhancing findings:`, error.message)
    return findings
  }
}

/**
 * Chat with AI using tool context - generates rich responses with markdown formatting
 * @param {string} question - User's question
 * @param {Object} toolContext - Tool context including data
 * @returns {Promise<string>} AI response with markdown formatting
 */
async function chatWithToolContext(question, toolContext) {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured")
  }

  try {
    console.log(`[${new Date().toISOString()}] Tool chat query for ${toolContext.toolName}: ${question}`)

    const { toolName, dataType, data, dataDescription } = toolContext

    // Build context string from tool data
    let dataContext = ""
    if (data) {
      // Limit data size for context
      const dataStr = JSON.stringify(data, null, 2)
      dataContext = dataStr.length > 15000 ? dataStr.substring(0, 15000) + "...(truncated)" : dataStr
    }

    const systemPrompt = `You are an expert business analyst assistant specialized in ${toolName} data analysis. You help users understand and analyze their ${toolName} data.

CURRENT DATA CONTEXT:
- Tool: ${toolName}
- Data Type: ${dataType || "general"}
- Description: ${dataDescription}

AVAILABLE DATA:
${dataContext || "No specific data loaded. Answer based on general knowledge about " + toolName + "."}

RESPONSE FORMATTING GUIDELINES:
1. Use markdown formatting for clear, readable responses
2. Use **bold** for important numbers and key findings
3. Use tables (markdown format) when presenting structured data:
   | Column1 | Column2 | Column3 |
   |---------|---------|---------|
   | data    | data    | data    |

4. Use bullet points for lists of findings or recommendations
5. Use headers (##, ###) to organize longer responses
6. When showing financial amounts, format them clearly in USD (e.g., **$12,500**)
7. Highlight actionable insights and recommendations
8. If the user asks for charts/visualizations, describe what data would be shown and format it as a table that could be charted

SPECIAL INSTRUCTIONS FOR DATA TYPES:
- For invoices: Show status breakdown, overdue items, and payment trends
- For licenses: Show utilization rates, unused licenses, and optimization opportunities
- For users: Show activity levels, inactive accounts, and recommendations
- For cost-leaks: Prioritize by potential savings and urgency

Be concise but thorough. Focus on actionable insights.`

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: question,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    )

    const answer = response.data.choices[0].message.content
    console.log(`[${new Date().toISOString()}] Tool chat response generated for ${toolName}`)

    return answer
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in tool chat:`, error.message)
    throw new Error(`Failed to process tool chat request: ${error.message}`)
  }
}

/**
 * Chat with AI using cross-platform comparison context
 * Generates rich responses with charts comparing Fortnox and Microsoft 365 data
 * @param {string} question - User's question
 * @param {Object} fortnoxData - Fortnox data including invoices and cost leaks
 * @param {Object} m365Data - Microsoft 365 data including licenses, users, and cost leaks
 * @param {Object} metrics - Pre-calculated cross-platform metrics
 * @returns {Promise<string>} AI response with markdown and chart formatting
 */
async function chatWithComparisonContext(question, fortnoxData, m365Data, metrics) {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured")
  }

  try {
    console.log(`[${new Date().toISOString()}] Cross-platform comparison query: ${question}`)

    // Build comprehensive context from both platforms
    const fortnoxContext = buildFortnoxContext(fortnoxData)
    const m365Context = buildM365Context(m365Data)
    const metricsContext = JSON.stringify(metrics, null, 2)

    const systemPrompt = `You are an expert business analyst specializing in cross-platform SaaS cost optimization. You are analyzing data from TWO integrated platforms:

## PLATFORM 1: FORTNOX (Financial/Accounting)
${fortnoxContext}

## PLATFORM 2: MICROSOFT 365 (Productivity/Usage)
${m365Context}

## CROSS-PLATFORM METRICS (Pre-calculated)
${metricsContext}

## YOUR ANALYSIS TASK
Find correlations and insights that span BOTH platforms to help the user optimize their software costs:
- Where is money being spent on software that's not being used?
- How does software spend relate to user productivity/activity?
- What's the cost per active user across the tech stack?
- What are the combined savings opportunities?
- Prioritize actions based on total impact across both platforms

## RESPONSE FORMATTING - CRITICAL INSTRUCTIONS

### For Charts (REQUIRED for visualization questions):
Use this EXACT format for charts - the frontend will render these automatically:

\`\`\`chart:bar
{
  "title": "Chart Title Here",
  "data": [
    { "category": "Label1", "value": 100 },
    { "category": "Label2", "value": 200 }
  ],
  "xKey": "category",
  "yKeys": ["value"]
}
\`\`\`

\`\`\`chart:line
{
  "title": "Trend Over Time",
  "data": [
    { "month": "Jan", "cost": 5000, "users": 50 },
    { "month": "Feb", "cost": 5200, "users": 48 }
  ],
  "xKey": "month",
  "yKeys": ["cost", "users"]
}
\`\`\`

\`\`\`chart:pie
{
  "title": "Distribution",
  "data": [
    { "name": "Category A", "value": 30 },
    { "name": "Category B", "value": 70 }
  ],
  "xKey": "name",
  "yKeys": ["value"]
}
\`\`\`

### For Tables:
Use this EXACT format for tables:

\`\`\`table
{
  "headers": ["Priority", "Action", "Platform", "Savings", "Effort"],
  "rows": [
    ["1", "Remove orphaned licenses", "Microsoft 365", "$100/mo", "Low"],
    ["2", "Cancel duplicate subscription", "Fortnox", "$89/mo", "Low"]
  ]
}
\`\`\`

### General Formatting:
1. Use **bold** for important numbers and key findings
2. Use headers (##, ###) to organize sections
3. Format currency clearly in USD (e.g., **$12,500/month**)
4. Always include a "Recommended Actions" section with prioritized steps
5. When comparing platforms, use side-by-side tables or comparison charts

### Required Sections for Deep Analysis:
1. **Executive Summary** - Key headline metrics
2. **Cost vs. Activity Analysis** - The gap between spending and usage
3. **Platform Breakdown** - Findings from each platform
4. **Combined Savings Opportunities** - Total savings from both platforms
5. **Prioritized Recommendations** - Table with priority, action, platform, savings, effort

Be specific with numbers. Reference actual data from the context. Focus on actionable insights.`

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: question,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    )

    const answer = response.data.choices[0].message.content
    console.log(`[${new Date().toISOString()}] Cross-platform comparison response generated`)

    return answer
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in comparison chat:`, error.message)
    throw new Error(`Failed to process comparison request: ${error.message}`)
  }
}

/**
 * Build Fortnox context string for AI prompt
 */
function buildFortnoxContext(fortnoxData) {
  if (!fortnoxData) return "No Fortnox data available."

  const parts = []

  // Supplier invoices summary
  const supplierInvoices = fortnoxData.supplierInvoices || []
  if (supplierInvoices.length > 0) {
    const totalAmount = supplierInvoices.reduce((sum, inv) => {
      let total = parseFloat(inv.Total) || 0
      if (total === 0 && inv.SupplierInvoiceRows) {
        total = inv.SupplierInvoiceRows.reduce((s, row) => {
          if (row.Code === 'TOT') return s
          return s + (parseFloat(row.Total) || parseFloat(row.Debit) || 0)
        }, 0)
      }
      return sum + total
    }, 0)

    parts.push(`Supplier Invoices: ${supplierInvoices.length} invoices, Total: ${formatCurrencyForIntegration(totalAmount, 'fortnox')}`)
  }

  // Cost leak findings
  const costLeaks = fortnoxData.costLeaks
  if (costLeaks?.supplierInvoiceAnalysis) {
    const analysis = costLeaks.supplierInvoiceAnalysis
    const summary = analysis.summary || {}

    parts.push(`\nCost Leak Findings:`)
    parts.push(`- Duplicate Payments: ${summary.duplicatePayments?.length || 0}`)
    parts.push(`- Unusual Amounts: ${summary.unusualAmounts?.length || 0}`)
    parts.push(`- Recurring Subscriptions: ${summary.recurringSubscriptions?.length || 0}`)
    parts.push(`- Overdue Invoices: ${summary.overdueInvoices?.length || 0}`)
    parts.push(`- Price Increases: ${summary.priceIncreases?.length || 0}`)
    parts.push(`- Total Potential Savings: ${formatCurrencyForIntegration(summary.totalPotentialSavings || 0, 'fortnox')}`)

    // Top findings details
    if (analysis.findings && analysis.findings.length > 0) {
      parts.push(`\nTop Findings:`)
      analysis.findings.slice(0, 5).forEach((f, i) => {
        parts.push(`${i + 1}. [${f.severity}] ${f.title}: ${f.description}`)
      })
    }
  }

  return parts.join('\n') || "No significant Fortnox data."
}

/**
 * Build Microsoft 365 context string for AI prompt
 */
function buildM365Context(m365Data) {
  if (!m365Data) return "No Microsoft 365 data available."

  const parts = []

  // License summary
  const licenses = m365Data.licenses || []
  if (licenses.length > 0) {
    const totalConsumed = licenses.reduce((sum, sku) => sum + (sku.consumedUnits || 0), 0)
    const totalAvailable = licenses.reduce((sum, sku) => sum + (sku.prepaidUnits?.enabled || 0), 0)
    parts.push(`Licenses: ${totalConsumed} consumed of ${totalAvailable} available`)

    // License breakdown
    parts.push(`\nLicense Types:`)
    licenses.slice(0, 5).forEach((sku) => {
      parts.push(`- ${sku.skuPartNumber}: ${sku.consumedUnits}/${sku.prepaidUnits?.enabled || 0}`)
    })
  }

  // User activity summary
  const users = m365Data.users || []
  if (users.length > 0) {
    const now = new Date()
    let activeCount = 0
    let inactiveCount = 0
    let disabledCount = 0
    let neverSignedIn = 0

    users.forEach((user) => {
      if (!user.accountEnabled) {
        disabledCount++
        return
      }
      const lastSignIn = user.signInActivity?.lastSignInDateTime
      if (!lastSignIn) {
        neverSignedIn++
        inactiveCount++
        return
      }
      const daysSince = Math.floor((now - new Date(lastSignIn)) / (1000 * 60 * 60 * 24))
      if (daysSince <= 30) activeCount++
      else inactiveCount++
    })

    parts.push(`\nUsers: ${users.length} total`)
    parts.push(`- Active (30 days): ${activeCount}`)
    parts.push(`- Inactive: ${inactiveCount}`)
    parts.push(`- Never signed in: ${neverSignedIn}`)
    parts.push(`- Disabled accounts: ${disabledCount}`)
    parts.push(`- Activity Rate: ${((activeCount / (users.length - disabledCount)) * 100).toFixed(1)}%`)
  }

  // Cost leak findings
  const costLeaks = m365Data.costLeaks
  if (costLeaks?.licenseAnalysis) {
    const analysis = costLeaks.licenseAnalysis
    const summary = analysis.summary || {}

    parts.push(`\nCost Leak Findings:`)
    parts.push(`- Inactive Licenses: ${analysis.findings?.filter(f => f.type === 'inactive_license')?.length || 0}`)
    parts.push(`- Orphaned Licenses: ${analysis.findings?.filter(f => f.type === 'orphaned_license')?.length || 0}`)
    parts.push(`- Over-Provisioned: ${analysis.findings?.filter(f => f.type === 'over_provisioned')?.length || 0}`)
    parts.push(`- Unused Add-ons: ${analysis.findings?.filter(f => f.type === 'unused_addon')?.length || 0}`)
    parts.push(`- Total Potential Savings: ${formatCurrencyForIntegration(summary.totalPotentialSavings || 0, 'microsoft365')}/month`)

    // Top findings details
    if (analysis.findings && analysis.findings.length > 0) {
      parts.push(`\nTop Findings:`)
      analysis.findings.slice(0, 5).forEach((f, i) => {
        parts.push(`${i + 1}. [${f.severity}] ${f.title}: ${f.description}`)
      })
    }
  }

  return parts.join('\n') || "No significant Microsoft 365 data."
}

module.exports = {
  generateAnalysisSummary,
  generateRecommendations,
  estimatePotentialSavings,
  chatAboutAnalysis,
  enhanceFindingsWithAI,
  chatWithToolContext,
  chatWithComparisonContext,
}
