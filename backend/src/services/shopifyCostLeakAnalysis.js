/**
 * Shopify Cost Leak Analysis Service
 * Analyzes Shopify store data to identify cost leaks, dead inventory,
 * margin issues, and optimization opportunities
 */

/**
 * Format amount as USD for display
 */
function formatAmount(amount) {
  return `$${Math.round(amount || 0).toLocaleString("en-US")}`
}

/**
 * Parse a numeric amount from a value, returning 0 if invalid
 */
function safeParseFloat(val) {
  const num = parseFloat(val)
  return isNaN(num) ? 0 : num
}

/**
 * Analyze expensive app subscriptions
 * @param {Array} appCharges - Recurring application charge objects
 * @returns {Object} App subscription analysis
 */
function analyzeAppSubscriptions(appCharges) {
  const findings = []

  if (!appCharges || appCharges.length === 0) {
    return {
      activeApps: [],
      totalMonthlySpend: 0,
      appCount: 0,
      findings,
    }
  }

  // Filter to active charges only
  const activeCharges = appCharges.filter(
    (charge) => charge.status === "active" || charge.status === "accepted"
  )

  const totalMonthlySpend = activeCharges.reduce(
    (sum, charge) => sum + safeParseFloat(charge.price),
    0
  )

  activeCharges.forEach((charge) => {
    const price = safeParseFloat(charge.price)
    let severity = "low"
    if (price > 100) severity = "high"
    else if (price >= 30) severity = "medium"

    findings.push({
      type: "app_subscription",
      severity,
      title: `App Subscription: ${charge.name || "Unknown App"}`,
      description: `"${charge.name || "Unknown App"}" costs ${formatAmount(price)}/month${price > 100 ? " - this is a high-cost app, verify ROI" : ""}`,
      app: {
        name: charge.name,
        price,
        status: charge.status,
        createdAt: charge.created_at,
      },
      monthlyCost: price,
    })
  })

  // Flag total app spend if significant
  if (totalMonthlySpend > 200) {
    findings.push({
      type: "total_app_spend",
      severity: "high",
      title: "High Total App Spend",
      description: `Total monthly app spend is ${formatAmount(totalMonthlySpend)} across ${activeCharges.length} app${activeCharges.length > 1 ? "s" : ""}. Review each app for continued ROI.`,
      totalMonthlySpend,
      appCount: activeCharges.length,
      potentialSavings: totalMonthlySpend * 0.2, // Estimate 20% could be saved through review
    })
  }

  return {
    activeApps: activeCharges.map((c) => ({
      name: c.name,
      price: safeParseFloat(c.price),
      status: c.status,
      createdAt: c.created_at,
    })),
    totalMonthlySpend,
    appCount: activeCharges.length,
    findings,
  }
}

/**
 * Analyze dead inventory - products with stock but no recent sales
 * @param {Array} products - Shopify Product objects
 * @param {Array} orders - Shopify Order objects
 * @returns {Object} Dead inventory analysis
 */
function analyzeDeadInventory(products, orders) {
  const findings = []

  if (!products || products.length === 0) {
    return {
      deadProducts: [],
      totalDeadValue: 0,
      totalProductsChecked: 0,
      findings,
    }
  }

  // Determine the 90-day cutoff
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  // Build a set of product IDs that have been ordered in the last 90 days
  const recentlyOrderedProductIds = new Set()
  const safeOrders = orders || []

  safeOrders.forEach((order) => {
    const orderDate = new Date(order.created_at || "")
    if (isNaN(orderDate.getTime()) || orderDate < ninetyDaysAgo) return

    if (order.line_items && Array.isArray(order.line_items)) {
      order.line_items.forEach((item) => {
        if (item.product_id) {
          recentlyOrderedProductIds.add(String(item.product_id))
        }
      })
    }
  })

  const deadProducts = []
  let totalDeadValue = 0

  products.forEach((product) => {
    if (product.status !== "active") return

    const productId = String(product.id)
    if (recentlyOrderedProductIds.has(productId)) return

    // Check if any variant has inventory
    if (!product.variants || !Array.isArray(product.variants)) return

    let productInventoryValue = 0
    let totalInventoryQty = 0

    product.variants.forEach((variant) => {
      const qty = parseInt(variant.inventory_quantity, 10) || 0
      if (qty > 0) {
        const price = safeParseFloat(variant.price)
        productInventoryValue += qty * price
        totalInventoryQty += qty
      }
    })

    if (totalInventoryQty <= 0) return

    // This product has inventory but no recent orders -> dead stock
    let severity = "low"
    if (productInventoryValue > 500) severity = "high"
    else if (productInventoryValue > 100) severity = "medium"

    totalDeadValue += productInventoryValue

    const deadProduct = {
      productId: product.id,
      title: product.title,
      inventoryQuantity: totalInventoryQty,
      capitalTiedUp: productInventoryValue,
      severity,
    }
    deadProducts.push(deadProduct)

    findings.push({
      type: "dead_inventory",
      severity,
      title: `Dead Inventory: ${product.title || "Unknown Product"}`,
      description: `"${product.title}" has ${totalInventoryQty} unit${totalInventoryQty > 1 ? "s" : ""} in stock (${formatAmount(productInventoryValue)} tied up) with zero sales in the last 90 days`,
      product: deadProduct,
      capitalTiedUp: productInventoryValue,
      recommendation:
        severity === "high"
          ? "Consider running a clearance sale or liquidating this inventory to free up capital"
          : "Monitor this product and consider discounting to move inventory",
    })
  })

  return {
    deadProducts,
    totalDeadValue,
    totalProductsChecked: products.filter((p) => p.status === "active").length,
    findings,
  }
}

/**
 * Analyze product margins - flag low-margin products
 * @param {Array} products - Shopify Product objects
 * @returns {Object} Margin analysis
 */
function analyzeMargins(products) {
  const findings = []

  if (!products || products.length === 0) {
    return {
      lowMarginProducts: [],
      averageMargin: 0,
      totalProductsWithCost: 0,
      findings,
    }
  }

  const lowMarginProducts = []
  const margins = []

  products.forEach((product) => {
    if (product.status !== "active") return
    if (!product.variants || !Array.isArray(product.variants)) return

    product.variants.forEach((variant) => {
      const cost = safeParseFloat(variant.cost)
      const price = safeParseFloat(variant.price)

      // Skip variants without cost data or zero price
      if (cost <= 0 || price <= 0) return

      const margin = ((price - cost) / price) * 100

      margins.push(margin)

      if (margin < 20) {
        const entry = {
          productId: product.id,
          productTitle: product.title,
          variantTitle: variant.title || "Default",
          cost,
          price,
          margin: margin.toFixed(1),
        }
        lowMarginProducts.push(entry)

        findings.push({
          type: "low_margin",
          severity: "medium",
          title: `Low Margin: ${product.title || "Unknown Product"}`,
          description: `"${product.title}" (${variant.title || "Default"}) has only ${margin.toFixed(1)}% margin (cost: ${formatAmount(cost)}, price: ${formatAmount(price)})`,
          product: entry,
          margin: margin.toFixed(1),
          recommendation:
            margin < 10
              ? "This product is barely profitable - consider raising the price or finding a cheaper supplier"
              : "Review pricing strategy to improve margin above 20%",
        })
      }
    })
  })

  const averageMargin =
    margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0

  return {
    lowMarginProducts,
    averageMargin: averageMargin.toFixed(1),
    totalProductsWithCost: margins.length,
    findings,
  }
}

/**
 * Analyze shipping costs - flag if avg shipping is too high relative to order value
 * @param {Array} orders - Shopify Order objects
 * @returns {Object} Shipping cost analysis
 */
function analyzeShippingCosts(orders) {
  const findings = []

  if (!orders || orders.length === 0) {
    return {
      averageShippingCost: 0,
      averageOrderValue: 0,
      shippingPercentage: 0,
      totalShippingCost: 0,
      findings,
    }
  }

  let totalShipping = 0
  let totalOrderValue = 0
  let ordersWithShipping = 0

  orders.forEach((order) => {
    const orderTotal = safeParseFloat(order.total_price)
    totalOrderValue += orderTotal

    // Sum shipping costs from shipping_lines
    let orderShipping = 0
    if (order.shipping_lines && Array.isArray(order.shipping_lines)) {
      order.shipping_lines.forEach((line) => {
        orderShipping += safeParseFloat(line.price)
      })
    }

    if (orderShipping > 0) {
      totalShipping += orderShipping
      ordersWithShipping++
    }
  })

  const averageShippingCost =
    ordersWithShipping > 0 ? totalShipping / ordersWithShipping : 0
  const averageOrderValue = orders.length > 0 ? totalOrderValue / orders.length : 0
  const shippingPercentage =
    averageOrderValue > 0 ? (averageShippingCost / averageOrderValue) * 100 : 0

  if (shippingPercentage > 15) {
    findings.push({
      type: "high_shipping_cost",
      severity: "medium",
      title: "High Shipping Costs",
      description: `Average shipping cost (${formatAmount(averageShippingCost)}) is ${shippingPercentage.toFixed(1)}% of average order value (${formatAmount(averageOrderValue)}), exceeding the 15% threshold`,
      averageShippingCost,
      averageOrderValue,
      shippingPercentage: shippingPercentage.toFixed(1),
      totalShippingCost: totalShipping,
      recommendation:
        "Consider negotiating better shipping rates, offering free shipping over a threshold, or exploring alternative carriers",
      potentialSavings:
        totalShipping * ((shippingPercentage - 15) / shippingPercentage) * 0.5, // Estimate savings to bring to 15% threshold
    })
  }

  return {
    averageShippingCost,
    averageOrderValue,
    shippingPercentage: shippingPercentage.toFixed(1),
    totalShippingCost: totalShipping,
    ordersWithShipping,
    totalOrders: orders.length,
    findings,
  }
}

/**
 * Analyze discount usage - flag if discount rate is too high
 * @param {Array} orders - Shopify Order objects
 * @returns {Object} Discount analysis
 */
function analyzeDiscountUsage(orders) {
  const findings = []

  if (!orders || orders.length === 0) {
    return {
      totalDiscounts: 0,
      totalRevenue: 0,
      discountRate: 0,
      ordersWithDiscounts: 0,
      findings,
    }
  }

  let totalDiscounts = 0
  let totalRevenue = 0
  let ordersWithDiscounts = 0
  const discountCodeUsage = {}

  orders.forEach((order) => {
    const orderTotal = safeParseFloat(order.total_price)
    totalRevenue += orderTotal

    // Calculate discount amount from discount_applications or total_discounts
    let orderDiscount = 0

    if (order.total_discounts) {
      orderDiscount = safeParseFloat(order.total_discounts)
    } else if (order.discount_applications && Array.isArray(order.discount_applications)) {
      order.discount_applications.forEach((disc) => {
        orderDiscount += safeParseFloat(disc.value)
      })
    }

    if (orderDiscount > 0) {
      totalDiscounts += orderDiscount
      ordersWithDiscounts++
    }

    // Track discount code usage
    if (order.discount_codes && Array.isArray(order.discount_codes)) {
      order.discount_codes.forEach((code) => {
        const codeName = code.code || "Unknown"
        if (!discountCodeUsage[codeName]) {
          discountCodeUsage[codeName] = { count: 0, totalAmount: 0 }
        }
        discountCodeUsage[codeName].count++
        discountCodeUsage[codeName].totalAmount += safeParseFloat(code.amount)
      })
    }
  })

  // Use gross revenue (total_price + discounts) as the base for discount rate calculation
  const grossRevenue = totalRevenue + totalDiscounts
  const discountRate = grossRevenue > 0 ? (totalDiscounts / grossRevenue) * 100 : 0

  if (discountRate > 15) {
    let severity = "medium"
    if (discountRate > 25) severity = "high"

    findings.push({
      type: "discount_overuse",
      severity,
      title: "High Discount Rate",
      description: `Your discount rate is ${discountRate.toFixed(1)}% (${formatAmount(totalDiscounts)} in discounts out of ${formatAmount(grossRevenue)} gross revenue)${discountRate > 25 ? " - this significantly impacts profitability" : ""}`,
      totalDiscounts,
      grossRevenue,
      discountRate: discountRate.toFixed(1),
      ordersWithDiscounts,
      totalOrders: orders.length,
      discountCodeBreakdown: discountCodeUsage,
      recommendation:
        discountRate > 25
          ? "Drastically reduce discount frequency and value. Consider loyalty programs instead of blanket discounts."
          : "Review discount strategy. Ensure discounts are driving incremental sales, not cannibalizing full-price revenue.",
      potentialSavings: totalDiscounts * 0.3, // Estimate 30% of discount spend could be saved
    })
  }

  return {
    totalDiscounts,
    totalRevenue,
    grossRevenue,
    discountRate: discountRate.toFixed(1),
    ordersWithDiscounts,
    totalOrders: orders.length,
    discountCodeUsage,
    findings,
  }
}

/**
 * Analyze low-revenue products - products contributing < 1% of total revenue
 * @param {Array} products - Shopify Product objects
 * @param {Array} orders - Shopify Order objects
 * @returns {Object} Low-revenue product analysis
 */
function analyzeLowRevenueProducts(products, orders) {
  const findings = []

  if (!products || products.length === 0 || !orders || orders.length === 0) {
    return {
      lowRevenueProducts: [],
      totalRevenue: 0,
      findings,
    }
  }

  // Calculate revenue contribution per product from order line items
  const revenueByProduct = {}
  let totalRevenue = 0

  orders.forEach((order) => {
    if (!order.line_items || !Array.isArray(order.line_items)) return

    order.line_items.forEach((item) => {
      const productId = String(item.product_id || "")
      if (!productId) return

      const lineRevenue = safeParseFloat(item.price) * (parseInt(item.quantity, 10) || 1)
      totalRevenue += lineRevenue

      if (!revenueByProduct[productId]) {
        revenueByProduct[productId] = {
          productId,
          title: item.title || "Unknown Product",
          revenue: 0,
          unitsSold: 0,
        }
      }
      revenueByProduct[productId].revenue += lineRevenue
      revenueByProduct[productId].unitsSold += parseInt(item.quantity, 10) || 1
    })
  })

  if (totalRevenue <= 0) {
    return {
      lowRevenueProducts: [],
      totalRevenue: 0,
      findings,
    }
  }

  const lowRevenueProducts = []
  const onePercentThreshold = totalRevenue * 0.01

  // Check active products that have contributed < 1% of total revenue
  products.forEach((product) => {
    if (product.status !== "active") return

    const productId = String(product.id)
    const productRevenue = revenueByProduct[productId]
      ? revenueByProduct[productId].revenue
      : 0
    const contribution = (productRevenue / totalRevenue) * 100

    if (contribution < 1) {
      const entry = {
        productId: product.id,
        title: product.title,
        revenue: productRevenue,
        contribution: contribution.toFixed(2),
        unitsSold: revenueByProduct[productId]
          ? revenueByProduct[productId].unitsSold
          : 0,
      }
      lowRevenueProducts.push(entry)

      findings.push({
        type: "low_revenue_product",
        severity: "low",
        title: `Low Revenue: ${product.title || "Unknown Product"}`,
        description: `"${product.title}" contributes only ${contribution.toFixed(2)}% of total revenue (${formatAmount(productRevenue)})${productRevenue === 0 ? " - zero revenue recorded" : ""}`,
        product: entry,
        recommendation:
          productRevenue === 0
            ? "This active product has generated no revenue. Consider removing it or investing in marketing."
            : "Consider bundling this product, improving its listing, or discontinuing if not strategic.",
      })
    }
  })

  return {
    lowRevenueProducts,
    totalRevenue,
    onePercentThreshold,
    findings,
  }
}

/**
 * Generate prioritized recommendations based on analysis
 * @param {Object} summary - Analysis summary
 * @param {Array} findings - All findings
 * @param {Object} details - Detailed analysis results
 * @returns {Array} Prioritized recommendations
 */
function generateRecommendations(summary, findings, details) {
  const recommendations = []

  // Dead inventory recommendation
  if (summary.deadInventoryValue > 0) {
    recommendations.push({
      priority: 1,
      action: "Liquidate Dead Inventory",
      description: `${formatAmount(summary.deadInventoryValue)} is tied up in dead inventory (products with zero sales in 90 days). Run clearance sales or liquidate to free up capital.`,
      impact: "high",
      effort: "medium",
      savings: summary.deadInventoryValue * 0.5, // Estimate recovering 50% of value
    })
  }

  // App subscription review
  if (summary.monthlyAppCost > 100) {
    recommendations.push({
      priority: 2,
      action: "Review App Subscriptions",
      description: `You're spending ${formatAmount(summary.monthlyAppCost)}/month on ${summary.activeAppSubscriptions} app${summary.activeAppSubscriptions > 1 ? "s" : ""}. Audit each app for continued ROI and remove unused ones.`,
      impact: "medium",
      effort: "low",
      savings: summary.monthlyAppCost * 0.2,
    })
  }

  // Discount strategy
  const discountFindings = findings.filter((f) => f.type === "discount_overuse")
  if (discountFindings.length > 0) {
    recommendations.push({
      priority: 3,
      action: "Optimize Discount Strategy",
      description: `Your discount rate exceeds 15%. Shift from blanket discounts to targeted promotions, loyalty rewards, or minimum-spend thresholds.`,
      impact: "high",
      effort: "medium",
      savings: discountFindings[0].potentialSavings || 0,
    })
  }

  // Shipping cost optimization
  const shippingFindings = findings.filter((f) => f.type === "high_shipping_cost")
  if (shippingFindings.length > 0) {
    recommendations.push({
      priority: 4,
      action: "Reduce Shipping Costs",
      description: `Shipping costs exceed 15% of order value. Negotiate carrier rates, consider flat-rate shipping, or set a free-shipping threshold.`,
      impact: "medium",
      effort: "medium",
      savings: shippingFindings[0].potentialSavings || 0,
    })
  }

  // Low margin products
  const marginFindings = findings.filter((f) => f.type === "low_margin")
  if (marginFindings.length > 0) {
    recommendations.push({
      priority: 5,
      action: "Improve Product Margins",
      description: `${marginFindings.length} product${marginFindings.length > 1 ? "s have" : " has"} margins below 20%. Review pricing, negotiate supplier costs, or discontinue unprofitable items.`,
      impact: "medium",
      effort: "medium",
    })
  }

  // Low revenue products
  const lowRevFindings = findings.filter((f) => f.type === "low_revenue_product")
  if (lowRevFindings.length > 5) {
    recommendations.push({
      priority: 6,
      action: "Streamline Product Catalog",
      description: `${lowRevFindings.length} active products contribute less than 1% of revenue each. Consider consolidating your catalog to focus on top performers.`,
      impact: "low",
      effort: "medium",
    })
  }

  // General good-health recommendation
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 1,
      action: "Maintain Current Operations",
      description:
        "Your Shopify store looks healthy. Continue monitoring costs and margins regularly.",
      impact: "low",
      effort: "low",
    })
  }

  return recommendations
}

/**
 * Main analysis function - analyzes Shopify store data for cost leaks
 * @param {Object} data - Shopify data object
 * @param {Array} data.orders - Order objects
 * @param {Array} data.products - Product objects
 * @param {Array} data.appCharges - Recurring application charge objects
 * @param {Array} data.inventoryLevels - Inventory level objects
 * @returns {Object} Complete cost leak analysis
 */
function analyzeShopifyCostLeaks(data) {
  const orders = data.orders || []
  const products = data.products || []
  const appCharges = data.appCharges || []

  // Run all analyses
  const appAnalysis = analyzeAppSubscriptions(appCharges)
  const deadInventoryAnalysis = analyzeDeadInventory(products, orders)
  const marginAnalysis = analyzeMargins(products)
  const shippingAnalysis = analyzeShippingCosts(orders)
  const discountAnalysis = analyzeDiscountUsage(orders)
  const lowRevenueAnalysis = analyzeLowRevenueProducts(products, orders)

  // Combine all findings
  const allFindings = [
    ...appAnalysis.findings,
    ...deadInventoryAnalysis.findings,
    ...marginAnalysis.findings,
    ...shippingAnalysis.findings,
    ...discountAnalysis.findings,
    ...lowRevenueAnalysis.findings,
  ]

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 }
  allFindings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  // Calculate total revenue
  const totalRevenue = orders.reduce(
    (sum, order) => sum + safeParseFloat(order.total_price),
    0
  )

  // Calculate overall health score (0-100, higher is better)
  let healthScore = 100
  allFindings.forEach((finding) => {
    if (finding.severity === "high") healthScore -= 15
    else if (finding.severity === "medium") healthScore -= 8
    else if (finding.severity === "low") healthScore -= 3
  })
  healthScore = Math.max(0, Math.min(100, healthScore))

  // Calculate potential monthly savings
  const potentialMonthlySavings =
    allFindings.reduce((sum, f) => sum + (f.potentialSavings || 0), 0) +
    (deadInventoryAnalysis.totalDeadValue > 0
      ? deadInventoryAnalysis.totalDeadValue * 0.05
      : 0) // Amortize dead inventory recovery over ~20 months

  // Build summary
  const summary = {
    totalOrders: orders.length,
    totalProducts: products.length,
    totalRevenue,
    activeAppSubscriptions: appAnalysis.appCount,
    monthlyAppCost: appAnalysis.totalMonthlySpend,
    deadInventoryValue: deadInventoryAnalysis.totalDeadValue,
    healthScore,
    issuesFound: allFindings.length,
    potentialMonthlySavings,
  }

  // Build details
  const details = {
    appSubscriptions: appAnalysis,
    deadInventory: deadInventoryAnalysis,
    marginAnalysis,
    shippingAnalysis,
    discountAnalysis,
  }

  // Generate recommendations
  const recommendations = generateRecommendations(summary, allFindings, details)

  return {
    summary,
    findings: allFindings,
    details,
    recommendations,
  }
}

module.exports = {
  analyzeShopifyCostLeaks,
  analyzeAppSubscriptions,
  analyzeDeadInventory,
  analyzeMargins,
  analyzeShippingCosts,
  analyzeDiscountUsage,
  analyzeLowRevenueProducts,
  generateRecommendations,
}
