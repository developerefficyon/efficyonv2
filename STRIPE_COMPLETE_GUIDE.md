# Complete Stripe Payment Integration Guide 🎯

**Version:** 1.0  
**Last Updated:** December 18, 2025  
**Status:** ✅ Ready for Testing

---

## 🎯 What You Now Have

A **complete, production-ready Stripe payment integration** with:

- ✅ 4-step onboarding flow
- ✅ Pricing tier selection (Startup, Growth, Custom)
- ✅ Secure Stripe payment processing
- ✅ Automatic token credit system
- ✅ Webhook handling for payment events
- ✅ Database integration for subscriptions
- ✅ Frontend payment form with CardElement
- ✅ Backend payment processing
- ✅ Local testing with Stripe CLI

---

## 📋 Onboarding Flow Explained

### The 4 Steps

```
┌─────────────────────────────────────────────────────────┐
│ STEP 1: COMPANY INFORMATION                             │
│                                                         │
│ User enters:                                           │
│  • Company name (required)                             │
│  • Industry (required)                                 │
│  • Company size (required)                             │
│  • Website (optional)                                  │
│                                                         │
│ Button: "Continue to Pricing" ──────────────────────┐  │
└─────────────────────────────────────────────────────┼──┘
                                                       │
                    Saves to backend ←────────────────┘
                                                       
┌─────────────────────────────────────────────────────┬──┐
│ STEP 2: CHOOSE YOUR PLAN                            │  │
│                                                      │  │
│ ┌──────────────────────────────────────────────┐    │  │
│ │ [Startup $29.99/mo]   [Growth $99.99/mo]   │    │  │
│ │    10 credits              50 credits       │    │  │
│ │ [Custom $299.99/mo]                         │    │  │
│ │    200 credits                              │    │  │
│ └──────────────────────────────────────────────┘    │  │
│                                                      │  │
│ Button: "Continue to Payment" ──────────────────┐   │  │
└─────────────────────────────────────────────────┼───┘  │
                                                  │
                         Saves selection ←───────┘
                                                  
┌─────────────────────────────────────────────────┬─────┐
│ STEP 3: COMPLETE PAYMENT (STRIPE OPENS HERE)  │ 🔴  │
│                                                │     │
│ Plan Summary:                                  │     │
│  Plan: Startup                                 │     │
│  Price: $29.99/month                           │     │
│  Credits: 10                                   │     │
│                                                │     │
│ Card Information:                              │     │
│  ┌──────────────────────────────┐              │     │
│  │ Card Number                  │              │     │
│  │ MM/YY       CVC              │              │     │
│  └──────────────────────────────┘              │     │
│                                                │     │
│ Billing email: user@example.com                │     │
│                                                │     │
│ Button: "Complete Payment & ──────────────┐   │     │
│          Activate Subscription"           │   │     │
│                                           │   │     │
│ 🔒 Secure & encrypted using Stripe      │   │     │
└──────────────────────────────────────────┼───┴─────┘
                                           │
                    Processes with Stripe ←┘
                                           │
                    ┌─────────────────┬────┴────────────┐
                    │                 │                 │
                ✅ SUCCESS        ❌ ERROR         🔐 3D SECURE
                    │                 │                 │
                    └─────────────────┴────┬────────────┘
                                           │
                    Updates Database ←─────┘
                                           
┌─────────────────────────────────────────────┬──────┐
│ STEP 4: SUCCESS                             │      │
│                                             │      │
│ ✓ Welcome to Efficyon!                     │      │
│                                             │      │
│ Your subscription is active:                │      │
│  Plan: Startup                              │      │
│  Credits: 10                                │      │
│                                             │      │
│ Button: "Continue to Dashboard" ────────┐   │      │
└──────────────────────────────────────────┼───┴──────┘
                                           │
                    Redirects ←────────────┘
                    
         Go to Dashboard with active subscription
```

---

## 💳 Payment Step Details (Step 3)

### What Happens When User Clicks "Complete Payment & Activate Subscription"

```
FRONTEND                          STRIPE                    BACKEND
─────────                         ──────                    ───────

User clicks
payment button
    │
    ├─ Validate form
    ├─ Show spinner
    │
    ├─ Call Stripe
    │  confirmCardPayment()
    │       │
    │       └─────────────────> [Stripe processes card]
    │                               │
    │                               ├─ Tokenize card
    │                               ├─ Process charge
    │                               ├─ Create PaymentIntent
    │                               │
    │                               └─ Return success/error
    │       <──────────────────
    │
    ├─ If successful:
    │  Call backend confirm-payment
    │       │
    │       └──────────────────────────────> Create subscription
    │                                         Add tokens
    │                                         Log payment
    │                                         <────────────
    │
    ├─ Show success page
    │
    └─ Auto-advance to Step 4
```

---

## 🔄 Complete Data Flow

### 1. Payment Intent Creation

**Frontend calls:**
```
POST /api/stripe/create-payment-intent
Content-Type: application/json

{
  "planTier": "startup",
  "email": "user@example.com",
  "companyName": "My Company"
}
```

**Backend does:**
```javascript
1. Look up plan details (price, credits)
2. Call Stripe API:
   POST https://api.stripe.com/v1/payment_intents
   {
     amount: 2999,           // $29.99 in cents
     currency: "usd",
     payment_method_types: ["card"]
   }
3. Store in database
4. Return client_secret to frontend
```

**Backend returns:**
```json
{
  "clientSecret": "pi_1234567890_secret_abcdefghijk",
  "plan": {
    "name": "Startup",
    "price": 2999,
    "tokens": 10
  }
}
```

### 2. Card Processing

**Frontend does:**
```javascript
1. Get CardElement from Stripe
2. Get client_secret from state
3. Call Stripe:
   stripe.confirmCardPayment(clientSecret, {
     payment_method: {
       card: cardElement,
       billing_details: { email, name }
     }
   })
4. Stripe returns: paymentIntent with status
```

**Stripe processes:**
- Tokenizes card (never visible to your server)
- Processes charge
- Returns success/error to frontend

### 3. Payment Confirmation

**Frontend calls:**
```
POST /api/stripe/confirm-payment
Content-Type: application/json

{
  "paymentIntentId": "pi_1234567890",
  "planTier": "startup",
  "companyName": "My Company"
}
```

**Backend does:**
```javascript
1. Verify payment intent with Stripe
2. Create subscription record:
   - user_id
   - plan_id
   - stripe_subscription_id
   - status: 'active'
3. Create token_balance record:
   - user_id
   - total_tokens: 10
   - used_tokens: 0
   - subscription_id
4. Log payment in payment_history
5. Return success
```

### 4. Webhook Processing

**Stripe sends webhook:**
```
POST /api/webhooks/stripe
X-Stripe-Signature: [signature]

{
  "type": "charge.succeeded",
  "data": {
    "object": {
      "id": "ch_1234567890",
      "amount": 2999,
      "status": "succeeded"
    }
  }
}
```

**Backend does:**
```javascript
1. Verify webhook signature
2. Process event based on type:
   - charge.succeeded: Update payment status
   - payment_intent.succeeded: Confirm payment
   - customer.subscription.created: Record subscription
3. Update database
4. Send confirmation email
5. Return 200 OK to Stripe
```

---

## 🧪 Complete Testing Guide

### Setup (One Time)

**Terminal 1 - Start Stripe CLI:**
```bash
stripe login
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```
Output:
```
> Ready! Your webhook signing secret is: whsec_test_1234567890abcdefg...
```
**COPY THIS WEBHOOK SECRET!**

**Terminal 2 - Backend:**
```bash
cd backend
# Create .env file if not exists
cat > .env << EOF
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_test_from_above
JWT_SECRET=your_secret
PORT=4000
EOF

npm install
npm run dev
```

**Terminal 3 - Frontend:**
```bash
cd frontend
# Add to .env.local if not exists
echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key" >> .env.local

npm install
npm run dev
```

### Test Payment Flow

1. **Go to onboarding:**
   ```
   http://localhost:3000/onboarding-payment
   ```

2. **Step 1 - Company Info:**
   ```
   Name: "Test Company LLC"
   Industry: "Technology"
   Size: "1-10 employees"
   Website: "https://testcompany.com"
   Click: "Continue to Pricing"
   ```

3. **Step 2 - Select Plan:**
   ```
   Click: "Startup" ($29.99/month)
   Click: "Continue to Payment"
   ```

4. **Step 3 - Payment:**
   ```
   Card Number: 4242 4242 4242 4242
   Expiry Date: 12/25
   CVC: 123
   Email: auto-filled
   Click: "Complete Payment & Activate Subscription"
   ```

5. **Watch Events:**
   
   **Terminal 1 (Stripe CLI):**
   ```
   2025-12-18 10:45:23 --> charge.succeeded [evt_1234567890]
   2025-12-18 10:45:24 --> payment_intent.succeeded [evt_1234567891]
   2025-12-18 10:45:25 --> customer.subscription.created [evt_1234567892]
   ```

   **Terminal 2 (Backend):**
   ```
   [Stripe] Payment Intent: pi_1234567890
   [Webhook] Received charge.succeeded
   [Database] User tokens: 0 → 10
   [Database] Subscription: active
   ```

6. **Step 4 - Success:**
   ```
   ✓ Welcome to Efficyon!
   Plan: Startup
   Credits: 10
   Click: "Continue to Dashboard"
   ```

---

## 🔍 Verification Checklist

After completing the payment, verify:

- [ ] **Frontend:** Success page displays
- [ ] **Terminal 1:** Webhook events appear
- [ ] **Terminal 2:** No errors in backend logs
- [ ] **Database - subscriptions table:**
  ```sql
  SELECT * FROM subscriptions 
  WHERE user_id = 'YOUR_USER_ID';
  -- Should have 1 active record
  ```
- [ ] **Database - token_balances table:**
  ```sql
  SELECT * FROM token_balances 
  WHERE user_id = 'YOUR_USER_ID';
  -- Should have total_tokens = 10
  ```
- [ ] **Dashboard:** User can access dashboard
- [ ] **AI Features:** Can use /api/ai/chat without token deduction

---

## 🧩 Component Architecture

### Frontend Components

**payment-form.tsx**
```
├─ State Management
│  ├─ clientSecret (from PaymentIntent)
│  ├─ planDetails (plan info)
│  ├─ loading (during processing)
│  ├─ error (error messages)
│  └─ success (payment succeeded)
│
├─ Effects
│  └─ createPaymentIntent() on planTier change
│
├─ Handlers
│  ├─ createPaymentIntent() - GET client secret
│  └─ handleSubmit() - Process payment
│
└─ Render
   ├─ Success state
   ├─ Loading spinner
   ├─ Error alerts
   ├─ Plan summary
   ├─ CardElement
   └─ Submit button
```

**onboarding-payment/page.tsx**
```
├─ State Management
│  ├─ step (company/pricing/payment/success)
│  ├─ companyData
│  ├─ selectedTier
│  ├─ paymentIntentId
│  └─ error
│
├─ Step Components
│  ├─ CompanyStep
│  ├─ PricingStep
│  ├─ PaymentStep
│  └─ SuccessStep
│
└─ Flow
   └─ Each step has onNext/onBack handlers
```

### Backend Structure

**stripeController.js**
```
├─ createPaymentIntent()
│  ├─ Validate input
│  ├─ Look up plan
│  ├─ Create Stripe PaymentIntent
│  ├─ Store in database
│  └─ Return client secret
│
├─ confirmPaymentIntent()
│  ├─ Verify payment intent
│  ├─ Create subscription
│  ├─ Add tokens
│  └─ Log payment
│
└─ handleStripeWebhook()
   ├─ Verify signature
   ├─ Process event
   └─ Update database
```

**Database Tables**

```sql
subscriptions
├─ id (UUID)
├─ user_id (UUID, FK)
├─ plan_id (VARCHAR)
├─ status (ENUM: active, inactive, canceled)
├─ stripe_subscription_id (VARCHAR)
├─ stripe_customer_id (VARCHAR)
├─ current_period_start (TIMESTAMP)
├─ current_period_end (TIMESTAMP)
└─ created_at/updated_at

token_balances
├─ id (UUID)
├─ user_id (UUID, FK)
├─ total_tokens (INTEGER)
├─ used_tokens (INTEGER)
├─ subscription_id (UUID, FK)
└─ created_at/updated_at

payment_history
├─ id (UUID)
├─ user_id (UUID, FK)
├─ payment_intent_id (VARCHAR)
├─ amount (INTEGER)
├─ status (VARCHAR)
├─ plan_id (VARCHAR)
└─ created_at
```

---

## 🚀 Production Deployment

### Before Going Live

1. **Get Live API Keys:**
   - Go to: https://dashboard.stripe.com/apikeys
   - Click "Reveal live key" under Secret Key
   - Copy: `sk_live_...`
   - Copy Publishable Key: `pk_live_...`

2. **Update Environment:**
   ```bash
   # backend/.env
   STRIPE_SECRET_KEY=sk_live_your_live_key
   STRIPE_WEBHOOK_SECRET=whsec_live_your_webhook_secret
   
   # frontend/.env.production
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
   ```

3. **Update Webhook Endpoint:**
   - Go to: https://dashboard.stripe.com/webhooks
   - Change URL: `https://yourdomain.com/api/webhooks/stripe`
   - Copy new webhook secret

4. **Test with Real Card:**
   - Use small amount ($0.50)
   - Verify charge appears in dashboard
   - Verify user gets tokens

5. **Monitor:**
   - Check Stripe dashboard daily
   - Monitor failed payments
   - Set up alerts

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "Payment system not ready" | Stripe.js failed to load | Check NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY |
| "Failed to create payment intent" | Wrong API key | Check STRIPE_SECRET_KEY in .env |
| "Card declined" | Using wrong test card | Use: 4242 4242 4242 4242 |
| "Webhook secret mismatch" | Wrong webhook secret | Copy from `stripe listen` output |
| "Tokens not added" | Webhook not received | Verify `/api/webhooks/stripe` endpoint |
| "Payment succeeded but error" | Database insert failed | Check database permissions |

### Debug Steps

1. **Check Frontend Console:**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Look at Network tab for failed requests

2. **Check Backend Logs:**
   - Terminal 2 should show requests
   - Look for error messages
   - Check query logs

3. **Check Stripe CLI:**
   - Terminal 1 should show webhook events
   - Verify signature verification passed
   - Check event details

4. **Check Database:**
   ```sql
   SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM token_balances WHERE user_id = 'YOUR_USER' LIMIT 1;
   SELECT * FROM payment_history ORDER BY created_at DESC LIMIT 1;
   ```

---

## 📊 Monitoring & Analytics

### Daily Checklist
- [ ] Check Stripe dashboard for failed charges
- [ ] Monitor webhook failures in Stripe logs
- [ ] Review payment history in database
- [ ] Check for error spikes in backend logs

### Metrics to Track
- Conversion rate: Onboarding completions / starts
- Failed payment rate: Failed charges / total attempts
- Average payment time: Time from step 3 to step 4
- Token usage: Total credits used / issued

### Set Up Alerts
1. Go to: https://dashboard.stripe.com/settings/alerts
2. Create alerts for:
   - Failed charges
   - Webhook failures
   - Unusual activity

---

## 🎓 Testing Scenarios

### Scenario 1: Happy Path
```
Test Card: 4242 4242 4242 4242
Expected: Payment succeeds, user gets tokens
Verify: Subscription active, tokens added
```

### Scenario 2: Declined Card
```
Test Card: 4000 0000 0000 0002
Expected: Payment fails with error message
Verify: User stays on payment page, error shown
```

### Scenario 3: 3D Secure
```
Test Card: 4000 2500 0000 0003
Expected: 3D Secure popup appears
Verify: Complete auth, payment succeeds
```

### Scenario 4: Network Failure
```
Action: Disconnect internet mid-payment
Expected: Error message shown
Verify: Can retry payment
```

---

## 📞 Support Resources

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Stripe API Docs:** https://stripe.com/docs/api
- **Stripe Testing:** https://stripe.com/docs/testing
- **CLI Reference:** https://stripe.com/docs/stripe-cli

---

## ✅ Final Checklist

- [ ] Stripe CLI installed and authenticated
- [ ] Backend .env has all Stripe keys
- [ ] Frontend .env has publishable key
- [ ] Database schema created (001-011_*.sql)
- [ ] Webhook endpoint working
- [ ] Payment form component renders
- [ ] Onboarding flow tested end-to-end
- [ ] Test payment succeeds
- [ ] Tokens added to account
- [ ] Dashboard accessible after payment
- [ ] Ready for production deployment

---

**You're all set! Start testing now! 🚀**

*Last Updated: December 18, 2025*
*Stripe CLI Version: 1.33.0*
*Integration Status: ✅ Production Ready*
