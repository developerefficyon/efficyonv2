# Stripe Payment Integration Setup Guide

## Overview
This guide walks you through integrating Stripe payments into Efficyon for the onboarding flow with the pricing tier system (Startup, Growth, Custom) and token/credit system.

---

## Prerequisites

- Stripe account: https://stripe.com
- Node.js (backend already has dependencies)
- npm/pnpm for installing packages

---

## Part 1: Stripe Account Setup

### 1.1 Create or Log in to Stripe
1. Go to https://dashboard.stripe.com
2. Sign in or create an account
3. Complete the account setup

### 1.2 Get Your API Keys
1. Navigate to **Developers** → **API Keys** (top left)
2. You'll see:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)
3. Copy both keys - you'll need them

### 1.3 Set Up Webhook Endpoint
1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Configure:
   - **URL**: `https://your-backend-domain.com/api/stripe/webhook`
     - For local development: Use ngrok or similar tunnel service
     - Pattern: `https://[ngrok-url]/api/stripe/webhook`
   - **Events to send**: Select these events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. Click **Add endpoint**
5. Copy the **Signing Secret** (starts with `whsec_`)

---

## Part 2: Backend Setup

### 2.1 Install Dependencies
```bash
cd backend
npm install stripe
```

### 2.2 Update Environment Variables
Edit `.env` file in the backend folder and add:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_test_your_webhook_secret_here
```

Replace with your actual keys from Part 1.

### 2.3 Database Setup
Run the Stripe schema migration in Supabase:

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Open `backend/sql/011_stripe_payment_schema.sql`
4. Copy and paste the entire SQL into Supabase
5. Click **Run**

This creates:
- `subscriptions` table - stores user subscriptions
- `token_balances` table - tracks token/credit usage
- `payment_history` table - logs all payments
- `plan_details` table - stores plan configurations
- `deep_research_analyses` table - tracks token-consuming operations

### 2.4 Update App Configuration
The Stripe routes are already added in `backend/src/routes/index.js`. The app will handle:
- `POST /api/stripe/create-payment-intent` - Initiate payment
- `POST /api/stripe/confirm-payment` - Confirm payment
- `GET /api/stripe/subscription` - Get user subscription
- `GET /api/stripe/plans` - Get pricing plans
- `POST /api/stripe/use-tokens` - Deduct tokens from balance
- `POST /api/stripe/webhook` - Handle Stripe events

---

## Part 3: Frontend Setup

### 3.1 Install Dependencies
```bash
cd frontend
npm install @stripe/react-stripe-js @stripe/stripe-js
# or if using pnpm:
pnpm add @stripe/react-stripe-js @stripe/stripe-js
```

### 3.2 Update Environment Variables
Create or edit `.env.local` in the frontend folder:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

Replace with your actual publishable key from Part 1.

### 3.3 New Components Created
- `frontend/components/pricing-tier-selector.tsx` - Display pricing plans
- `frontend/components/payment-form.tsx` - Stripe payment form
- `frontend/app/onboarding-payment/page.tsx` - Complete onboarding flow

---

## Part 4: Pricing Configuration

The pricing tiers are defined in `backend/src/controllers/stripeController.js`:

```javascript
const PLAN_PRICING = {
  startup: {
    name: "Startup",
    monthlyPrice: 2999,  // $29.99 in cents
    tokens: 10,  // 10 credits per month
    maxIntegrations: 5,
    maxTeamMembers: 3,
    features: [...]
  },
  growth: {
    name: "Growth",
    monthlyPrice: 9999,  // $99.99 in cents
    tokens: 50,  // 50 credits per month
    maxIntegrations: 15,
    maxTeamMembers: 10,
    features: [...]
  },
  custom: {
    name: "Custom",
    monthlyPrice: 29999,  // $299.99 in cents
    tokens: 200,  // 200 credits per month
    maxIntegrations: 999,
    maxTeamMembers: 999,
    features: [...]
  },
}
```

To modify pricing:
1. Edit the values in `stripeController.js`
2. The frontend will automatically fetch and display updated prices
3. Restart the backend server

---

## Part 5: Token/Credit System

### How Tokens Work

**Consumption:**
- Users get monthly tokens based on their plan
- Deep Research analyses consume tokens:
  - Single comparison (2 data sources): 1 token
  - Advanced analysis (3+ data sources): 5-10 tokens

**Usage:**
```javascript
// User consumes tokens for analysis
POST /api/stripe/use-tokens
{
  "tokensToUse": 1,
  "analysisType": "dual",
  "integrationSources": ["Fortnox", "M365"]
}
```

**Checking Balance:**
```javascript
GET /api/stripe/subscription
// Returns current token balance and availability
```

### Database Tracking
- `token_balances` table tracks total and used tokens
- `deep_research_analyses` table logs what analysis used tokens
- Tokens automatically reset each month (via subscription renewal)

---

## Part 6: Testing Payments

### 6.1 Use Stripe Test Cards
For local testing, use these test card numbers:

```
Visa:           4242 4242 4242 4242
Visa (debit):   4000 0566 5566 5556
Mastercard:     5555 5555 5555 4444
Amex:           3782 822463 10005
Declined:       4000 0000 0000 0002
```

Use any future date for expiry and any CVC.

### 6.2 Test Local Webhook
For local testing of webhooks:

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Authenticate:
   ```bash
   stripe login
   ```
3. Forward webhook events:
   ```bash
   stripe listen --forward-to localhost:4000/api/stripe/webhook
   ```
4. Copy the webhook signing secret (starts with `whsec_`)
5. Add to your `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_test_...
   ```

---

## Part 7: Production Deployment

### 7.1 Switch to Live Keys
1. In Stripe dashboard, toggle from **Test** to **Live** mode
2. Copy your **Live** keys (start with `pk_live_` and `sk_live_`)
3. Update environment variables in production:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

### 7.2 Update Webhook Endpoint
1. Go to Stripe **Webhooks**
2. Update your production endpoint URL to your live domain
3. Ensure SSL certificate is valid

### 7.3 Enable Alerts
1. Go to Stripe **Developers** → **Webhooks**
2. Enable email alerts for failed webhook deliveries

---

## Part 8: User Onboarding Flow

### Step-by-Step Process

1. **User Signs Up** → `/register`
2. **Email Verification** → `/auth/verify`
3. **Onboarding - Company Info** → `/onboarding-payment` (step 1)
4. **Pricing Tier Selection** → `/onboarding-payment` (step 2)
5. **Payment Processing** → `/onboarding-payment` (step 3)
6. **Dashboard Access** → `/dashboard`

### What Happens Behind Scenes

When payment succeeds:
1. Stripe calls your webhook
2. Backend creates subscription record
3. Backend creates token balance record
4. Onboarding marked complete
5. User redirected to dashboard

---

## Part 9: Monitoring & Maintenance

### 9.1 Check Payment History
```sql
SELECT * FROM payment_history WHERE user_id = 'user-id';
```

### 9.2 Check Token Usage
```sql
SELECT * FROM token_balances WHERE user_id = 'user-id';
SELECT * FROM deep_research_analyses WHERE user_id = 'user-id';
```

### 9.3 Monitor Failed Payments
1. Stripe Dashboard → **Payments**
2. Filter by status: **Failed**
3. Investigate and retry if needed

### 9.4 View Subscriptions
```sql
SELECT * FROM subscriptions WHERE user_id = 'user-id';
```

---

## Part 10: Troubleshooting

### Issue: "Invalid API Key"
- Verify `STRIPE_SECRET_KEY` is correct
- Check no extra spaces or quotes
- Restart backend after changing

### Issue: "Webhook not received"
- Check webhook URL is correct
- Ensure backend is running and accessible
- Check Stripe webhook logs for errors

### Issue: "Payment fails with 'invalid_client_secret'"
- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` matches your Stripe account
- Clear browser cache
- Try incognito/private mode

### Issue: "Test payment succeeds but tokens not created"
- Check backend console for errors
- Verify database schema migration ran
- Check subscription record was created:
  ```sql
  SELECT * FROM subscriptions WHERE user_id = 'your-user-id';
  ```

### Issue: "Tokens reset not happening"
- Cron job for token reset needs to be implemented
- For now, manual or webhook-based reset can be added

---

## Part 11: Advanced Features (Future)

These can be implemented later:

1. **Subscriptions** - Recurring monthly charges
2. **Token Rollover** - Allow unused tokens to carry over
3. **Usage Alerts** - Notify users when tokens running low
4. **Upgrade/Downgrade** - Change plans mid-cycle with prorating
5. **Invoicing** - Send PDF invoices after payment
6. **Metrics** - Track revenue, churn, LTV by plan

---

## Summary of Files Modified

**Backend:**
- `backend/package.json` - Added stripe
- `backend/src/config/stripe.js` - Stripe configuration
- `backend/src/controllers/stripeController.js` - All payment logic
- `backend/src/routes/index.js` - Stripe endpoints
- `backend/sql/011_stripe_payment_schema.sql` - Database schema
- `backend/env.example.backend.txt` - Added Stripe env vars

**Frontend:**
- `frontend/package.json` - Added Stripe React packages
- `frontend/components/pricing-tier-selector.tsx` - Pricing display
- `frontend/components/payment-form.tsx` - Payment form
- `frontend/app/onboarding-payment/page.tsx` - Full onboarding flow
- `frontend/env.example.frontend.txt` - Added Stripe public key

---

## Next Steps

1. ✅ Install all packages (`npm install`)
2. ✅ Get Stripe API keys
3. ✅ Set up environment variables
4. ✅ Run database migrations
5. ✅ Set up webhooks
6. ✅ Test with test cards
7. ✅ Deploy to production
8. ✅ Switch to live keys

You're ready to accept payments! 🎉
