const stripe = require("../config/stripe")
const { supabase } = require("../config/supabase")

/**
 * Get plan details from database
 */
async function getPlanDetails(planTier) {
  const { data: plan, error } = await supabase
    .from("plan_catalog")
    .select("*")
    .eq("tier", planTier)
    .maybeSingle()

  if (error || !plan) {
    throw new Error(`Plan '${planTier}' not found`)
  }

  return plan
}

/**
 * Create a Stripe customer
 */
async function createStripeCustomer(userId, email, companyName) {
  console.log(`[${new Date().toISOString()}] Creating Stripe customer for ${email}`)

  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
      companyName,
    },
  })

  console.log(`[${new Date().toISOString()}] Stripe customer created: ${customer.id}`)
  return customer.id
}

/**
 * Create a checkout session for payment
 */
async function createPaymentIntent(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/stripe/create-payment-intent`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { planTier, email, companyName, returnUrl } = req.body

    if (!planTier) {
      return res.status(400).json({ error: "Plan tier is required" })
    }

    // Determine success and cancel URLs based on returnUrl or default to onboarding
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"
    const defaultSuccessUrl = `${frontendUrl}/onboarding?payment=success&session_id={CHECKOUT_SESSION_ID}`
    const defaultCancelUrl = `${frontendUrl}/onboarding?payment=canceled`
    
    const successUrl = returnUrl 
      ? `${frontendUrl}${returnUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}`
      : defaultSuccessUrl
    const cancelUrl = returnUrl
      ? `${frontendUrl}${returnUrl}?payment=canceled`
      : defaultCancelUrl

    // Get plan details from database
    let plan
    try {
      plan = await getPlanDetails(planTier)
    } catch (error) {
      return res.status(400).json({ error: error.message })
    }

    // Get or create Stripe customer
    let { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, company_id")
      .eq("user_id", user.id)
      .maybeSingle()

    let stripeCustomerId = existingSubscription?.stripe_customer_id

    if (!stripeCustomerId) {
      stripeCustomerId = await createStripeCustomer(user.id, email, companyName)
      
      // Get user's company if it exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle()

      // Create initial subscription record (will be updated by webhook)
      const { data: newSubscription, error: subInsertError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: user.id,
          company_id: profile?.company_id || null,
          plan_tier: planTier,
          stripe_customer_id: stripeCustomerId,
          status: "incomplete",
          amount_cents: plan.price_monthly_cents,
          currency: "usd",
        })
        .select()
        .maybeSingle()

      if (subInsertError) {
        console.error(`[${new Date().toISOString()}] Error creating initial subscription:`, subInsertError.message)
      } else {
        console.log(`[${new Date().toISOString()}] Initial subscription created: ${newSubscription?.id}`)
      }
    }

    // Create checkout session for hosted checkout page
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Efficyon ${plan.name} Plan`,
              description: plan.description || "Professional plan",
            },
            unit_amount: plan.price_monthly_cents,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
        planTier,
        companyName,
      },
    })

    console.log(`[${new Date().toISOString()}] Checkout session created: ${checkoutSession.id}`)

    return res.json({
      sessionId: checkoutSession.id,
      sessionUrl: checkoutSession.url,
      plan: {
        tier: planTier,
        name: plan.name,
        monthlyPrice: plan.price_monthly_cents,
        tokens: plan.included_tokens,
      },
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error creating checkout session:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Confirm payment and activate subscription
 */
async function confirmPaymentIntent(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/stripe/confirm-payment`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { paymentIntentId, planTier, companyName } = req.body

    if (!paymentIntentId || !planTier) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // Verify payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ 
        error: "Payment not completed",
        status: paymentIntent.status,
      })
    }

    const plan = await getPlanDetails(planTier)
    const stripeCustomerId = paymentIntent.customer

    // Create or update subscription record
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          company_id: null,  // Will be populated if company exists
          stripe_customer_id: stripeCustomerId,
          plan_tier: planTier,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount_cents: plan.price_monthly_cents,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_customer_id" }
      )
      .select()
      .maybeSingle()

    if (subError) {
      console.error(`[${new Date().toISOString()}] Error creating subscription:`, subError.message)
      return res.status(500).json({ error: subError.message })
    }

    // Create or update token balance
    const { data: tokenBalance, error: tokenError } = await supabase
      .from("token_balances")
      .upsert(
        {
          company_id: null,  // Will be populated from company data
          user_id: user.id,
          plan_tier: planTier,
          total_tokens: plan.included_tokens,
          used_tokens: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id,plan_tier" }
      )
      .select()
      .maybeSingle()

    if (tokenError) {
      console.error(`[${new Date().toISOString()}] Error creating token balance:`, tokenError.message)
    }

    // Record payment in payments table
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        subscription_id: subscription?.id,
        company_id: null,
        user_id: user.id,
        stripe_payment_intent_id: paymentIntentId,
        amount_cents: plan.price_monthly_cents,
        currency: "usd",
        status: "succeeded",
        description: `${plan.name} plan payment`,
        raw_response: paymentIntent,
      })
      .select()
      .maybeSingle()

    if (paymentError) {
      console.error(`[${new Date().toISOString()}] Error recording payment:`, paymentError.message)
    }

    console.log(`[${new Date().toISOString()}] Subscription activated for user ${user.id}`)

    return res.json({
      success: true,
      subscription,
      tokenBalance,
      payment,
      message: "Payment confirmed and subscription activated",
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error confirming payment:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Get user subscription details with plan info
 */
async function getUserSubscription(req, res) {
  console.log(`[${new Date().toISOString()}] GET /api/stripe/subscription`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    // Get subscription with plan details
    // For admins, get the most recent subscription regardless of status
    // For regular users, only get active subscriptions
    const requesterRole = user?.user_metadata?.role
    
    let subscriptionQuery = supabase
      .from("subscriptions")
      .select(`
        *,
        plan_catalog (
          id,
          tier,
          name,
          price_monthly_cents,
          included_tokens,
          max_integrations,
          max_team_members,
          features
        )
      `)
      .eq("user_id", user.id)
    
    // If admin, get most recent subscription (any status), otherwise only active
    if (requesterRole === "admin") {
      subscriptionQuery = subscriptionQuery
        .order("created_at", { ascending: false })
        .limit(1)
    } else {
      subscriptionQuery = subscriptionQuery
        .eq("status", "active")
    }
    
    const { data: subscription } = await subscriptionQuery.maybeSingle()

    const { data: tokenBalance } = await supabase
      .from("token_balances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!subscription) {
      return res.json({
        subscription: null,
        tokenBalance: null,
        message: "No active subscription",
      })
    }

    const availableTokens = (tokenBalance?.total_tokens || 0) - (tokenBalance?.used_tokens || 0)

    return res.json({
      subscription,
      tokenBalance: {
        ...tokenBalance,
        availableTokens,
      },
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching subscription:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Get all plan details from database
 */
async function getPlansDetails(req, res) {
  console.log(`[${new Date().toISOString()}] GET /api/stripe/plans`)

  try {
    const { data: plans, error } = await supabase
      .from("plan_catalog")
      .select("*")
      .order("price_monthly_cents", { ascending: true })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.json({ plans })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching plans:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

/**
 * Handle Stripe webhook events
 */
async function handleStripeWebhook(req, res) {
  const sig = req.headers["stripe-signature"]

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    console.log(`[${new Date().toISOString()}] Webhook received: ${event.type}`)

    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object)
        break

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object)
        break

      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object)
        break

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object)
        break

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object)
        break

      default:
        console.log(`[${new Date().toISOString()}] Unhandled event type: ${event.type}`)
    }

    res.json({ received: true })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Webhook error:`, error.message)
    res.status(400).send(`Webhook Error: ${error.message}`)
  }
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log(`[${new Date().toISOString()}] Payment intent succeeded: ${paymentIntent.id}`)

  const userId = paymentIntent.metadata?.userId
  if (!userId) return

  // Update payment status
  await supabase
    .from("payments")
    .update({ status: "succeeded" })
    .eq("stripe_payment_intent_id", paymentIntent.id)

  // Update subscription status if not already done
  await supabase
    .from("subscriptions")
    .update({ status: "active" })
    .eq("stripe_customer_id", paymentIntent.customer)
}

async function handlePaymentIntentFailed(paymentIntent) {
  console.log(`[${new Date().toISOString()}] Payment intent failed: ${paymentIntent.id}`)

  const userId = paymentIntent.metadata?.userId
  if (!userId) return

  // Update payment status
  await supabase
    .from("payments")
    .update({ status: "canceled" })
    .eq("stripe_payment_intent_id", paymentIntent.id)

  // Update subscription status
  await supabase
    .from("subscriptions")
    .update({ status: "unpaid" })
    .eq("stripe_customer_id", paymentIntent.customer)
}

async function handleCheckoutSessionCompleted(session) {
  console.log(`[${new Date().toISOString()}] Checkout session completed: ${session.id}`)

  const userId = session.metadata?.userId
  const planTier = session.metadata?.planTier

  if (!userId || !planTier) {
    console.warn(`[${new Date().toISOString()}] Checkout session missing userId or planTier:`, {
      userId,
      planTier,
      metadata: session.metadata,
    })
    return
  }

  try {
    // Get plan details
    const plan = await getPlanDetails(planTier)

    // Get the subscription from Stripe if it exists
    let stripeSubscription = null
    if (session.subscription) {
      stripeSubscription = await stripe.subscriptions.retrieve(session.subscription)
      console.log(`[${new Date().toISOString()}] Retrieved Stripe subscription: ${stripeSubscription.id}`)
    }

    // Get user's company if it exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle()

    const companyId = profile?.company_id || null

    // Create or update subscription record
    const subscriptionData = {
      user_id: userId,
      company_id: companyId,
      plan_tier: planTier,
      stripe_customer_id: session.customer,
      stripe_subscription_id: stripeSubscription?.id || null,
      status: stripeSubscription?.status === "active" ? "active" : "incomplete",
      current_period_start: stripeSubscription?.current_period_start
        ? new Date(stripeSubscription.current_period_start * 1000).toISOString()
        : new Date().toISOString(),
      current_period_end: stripeSubscription?.current_period_end
        ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      amount_cents: plan.price_monthly_cents,
      currency: "usd",
      updated_at: new Date().toISOString(),
    }

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .upsert(subscriptionData, {
        onConflict: "stripe_customer_id",
      })
      .select()
      .maybeSingle()

    if (subError) {
      console.error(`[${new Date().toISOString()}] Error creating subscription:`, subError.message)
      return
    }

    console.log(`[${new Date().toISOString()}] Subscription created/updated: ${subscription?.id}`)

    // Create or update token balance
    // First, check if a token balance exists for this user/company and plan
    const { data: existingTokenBalance } = await supabase
      .from("token_balances")
      .select("id")
      .eq("user_id", userId)
      .eq("plan_tier", planTier)
      .eq("company_id", companyId)
      .maybeSingle()

    const tokenBalanceData = {
      company_id: companyId,
      user_id: userId,
      plan_tier: planTier,
      total_tokens: plan.included_tokens,
      used_tokens: existingTokenBalance ? undefined : 0, // Keep existing used_tokens if updating
      updated_at: new Date().toISOString(),
    }

    let tokenError
    if (existingTokenBalance) {
      // Update existing token balance
      const { error } = await supabase
        .from("token_balances")
        .update({
          total_tokens: plan.included_tokens,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingTokenBalance.id)
      tokenError = error
    } else {
      // Insert new token balance
      const { error } = await supabase
        .from("token_balances")
        .insert({
          company_id: companyId,
          user_id: userId,
          plan_tier: planTier,
          total_tokens: plan.included_tokens,
          used_tokens: 0,
          updated_at: new Date().toISOString(),
        })
      tokenError = error
    }

    if (tokenError) {
      console.error(`[${new Date().toISOString()}] Error creating token balance:`, tokenError.message)
    } else {
      console.log(`[${new Date().toISOString()}] Token balance created/updated for user ${userId}`)
    }

    // Record the checkout session in payments table
    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        subscription_id: subscription?.id,
        company_id: companyId,
        user_id: userId,
        stripe_checkout_session_id: session.id,
        amount_cents: session.amount_total || plan.price_monthly_cents,
        currency: session.currency || "usd",
        status: "succeeded",
        description: `${plan.name} plan payment`,
        raw_response: session,
      })

    if (paymentError) {
      console.error(`[${new Date().toISOString()}] Error recording payment:`, paymentError.message)
    } else {
      console.log(`[${new Date().toISOString()}] Payment recorded for checkout session ${session.id}`)
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error handling checkout session:`, error.message)
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log(`[${new Date().toISOString()}] Subscription updated: ${subscription.id}`)

  // Update subscription status in database
  const statusMap = {
    active: "active",
    past_due: "past_due",
    unpaid: "unpaid",
    canceled: "canceled",
  }

  const dbStatus = statusMap[subscription.status] || subscription.status

  await supabase
    .from("subscriptions")
    .update({
      status: dbStatus,
      stripe_subscription_id: subscription.id,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", subscription.customer)
}

async function handleSubscriptionDeleted(subscription) {
  console.log(`[${new Date().toISOString()}] Subscription deleted: ${subscription.id}`)

  // Mark subscription as canceled in database
  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
}

/**
 * Use tokens for analysis
 */
async function useTokens(req, res) {
  console.log(`[${new Date().toISOString()}] POST /api/stripe/use-tokens`)

  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { tokensToUse, analysisType, integrationSources } = req.body

    if (!tokensToUse || tokensToUse <= 0) {
      return res.status(400).json({ error: "Invalid token amount" })
    }

    // Get current token balance
    const { data: tokenBalance } = await supabase
      .from("token_balances")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!tokenBalance) {
      return res.status(400).json({ error: "No active subscription" })
    }

    const availableTokens = tokenBalance.total_tokens - tokenBalance.used_tokens

    if (availableTokens < tokensToUse) {
      return res.status(400).json({
        error: "Insufficient tokens",
        available: availableTokens,
        required: tokensToUse,
      })
    }

    // Update token usage
    const { data: updated, error } = await supabase
      .from("token_balances")
      .update({
        used_tokens: tokenBalance.used_tokens + tokensToUse,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select()
      .maybeSingle()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    const remainingTokens = updated.total_tokens - updated.used_tokens

    console.log(`[${new Date().toISOString()}] Used ${tokensToUse} tokens for user ${user.id}. Remaining: ${remainingTokens}`)

    return res.json({
      success: true,
      tokensUsed: tokensToUse,
      tokenBalance: {
        total: updated.total_tokens,
        used: updated.used_tokens,
        available: remainingTokens,
      },
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error using tokens:`, error.message)
    res.status(500).json({ error: error.message })
  }
}

module.exports = {
  createPaymentIntent,
  confirmPaymentIntent,
  getUserSubscription,
  getPlansDetails,
  handleStripeWebhook,
  useTokens,
}

