# Stripe Local CLI Setup Guide 🚀

**Status:** Ready to use (Stripe CLI v1.33.0 installed)

---

## 🎯 Quick Setup (5 Minutes)

### 1. Authenticate with Stripe
```bash
stripe login
```
Follow the browser prompt to authenticate. You'll get a **restricted API key** for local testing.

### 2. Create Backend .env File
Copy from example and add your test keys:
```bash
# backend/.env
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_test_your_webhook_secret
```

### 3. Start Stripe CLI in Listen Mode
```bash
# In a separate terminal
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```
This creates a webhook tunnel from Stripe to your local backend.

### 4. Start Your Backend
```bash
cd backend
npm install  # if not done yet
npm run dev
```

---

## 📋 Step-by-Step Setup

### Step 1: Authenticate with Stripe
```bash
stripe login
```
- Browser opens automatically
- Sign in to Stripe account
- Grant permission for CLI
- Returns confirmation code
- Stored in `~/.config/stripe/` on Windows

**What it does:**
- Authenticates your local CLI with your Stripe account
- Allows you to listen to real webhook events
- Enables testing with your test API keys

### Step 2: Get Test API Keys

#### Option A: From Stripe CLI (Recommended)
```bash
stripe keys list
```
Shows your restricted API key (for local testing)

#### Option B: From Dashboard
1. Go to: https://dashboard.stripe.com/apikeys
2. Copy **Secret Key** (starts with `sk_test_`)
3. Copy **Webhook Secret** (get from webhooks section)

### Step 3: Configure Backend

**Create `backend/.env`:**
```bash
# Database & Auth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_key_here
JWT_SECRET=your-jwt-secret
PORT=4000

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51234567890abcdefghijklmnopqr
STRIPE_WEBHOOK_SECRET=whsec_test_1234567890abcdefg

# Fortnox (if using)
FORTNOX_REDIRECT_URI=http://localhost:4000/api/integrations/fortnox/callback
FRONTEND_APP_URL=http://localhost:3000

# OpenAI (if using)
OPENAI_API_KEY=sk_your_openai_key
OPENAI_MODEL=gpt-4o-mini
```

### Step 4: Start Local Webhook Tunnel

**Terminal 1 - Stripe Listen:**
```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

**Output:**
```
> Ready! Your webhook signing secret is whsec_test_1234567890abcdefgh...
> You can now view requests in the Dashboard at https://dashboard.stripe.com/test/webhooks
```

**Important:** Copy the webhook secret and add to `.env` → `STRIPE_WEBHOOK_SECRET`

### Step 5: Start Backend Server

**Terminal 2 - Backend:**
```bash
cd backend
npm install
npm run dev
```

**Expected output:**
```
Server is running on port 4000
Connected to Supabase ✓
```

### Step 6: Start Frontend (Optional)

**Terminal 3 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testing Payments Locally

### Test Credit Cards

Use these in payment form when prompted:

| Card | Number | Exp | CVC | Result |
|------|--------|-----|-----|--------|
| Success | 4242 4242 4242 4242 | 12/25 | 123 | ✅ Payment succeeds |
| Decline | 4000 0000 0000 0002 | 12/25 | 123 | ❌ Payment declined |
| Require Auth | 4000 2500 0000 0003 | 12/25 | 123 | 🔐 3D Secure required |

### Test Addresses
```
Name: Test User
Email: test@example.com
Address: 123 Main St
City: San Francisco
State: CA
Zip: 94102
Country: US
```

---

## 🚀 Testing Flow

### 1. Create Payment Intent
```bash
curl -X POST http://localhost:4000/api/stripe/create-payment-intent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "startup",
    "amount": 2999
  }'
```

**Response:**
```json
{
  "clientSecret": "pi_1234567890_secret_abcdefghijk",
  "status": "requires_payment_method"
}
```

### 2. Confirm Payment
```bash
curl -X POST http://localhost:4000/api/stripe/confirm-payment \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentIntentId": "pi_1234567890",
    "paymentMethod": "pm_1234567890"
  }'
```

### 3. Check Webhook Events
```bash
# In Stripe CLI terminal, you'll see:
2025-12-18 10:30:45  --> payment_intent.succeeded [evt_1234567890]
2025-12-18 10:30:46  --> charge.succeeded [evt_1234567891]
```

---

## 🔄 Complete Terminal Setup

### Terminal Layout
```
┌─────────────────────────────────────────┐
│ Terminal 1: Stripe CLI                  │
│ $ stripe listen --forward-to ...        │
│                                         │
│ Ready! Webhook secret: whsec_test_...   │
├─────────────────────────────────────────┤
│ Terminal 2: Backend                     │
│ $ cd backend && npm run dev             │
│                                         │
│ Server running on port 4000             │
├─────────────────────────────────────────┤
│ Terminal 3: Frontend (optional)         │
│ $ cd frontend && npm run dev            │
│                                         │
│ Ready on http://localhost:3000          │
└─────────────────────────────────────────┘
```

### Start Commands (Copy & Paste)

**Terminal 1:**
```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

**Terminal 2:**
```bash
cd C:\Users\tayaw\Desktop\effycionv2\backend
npm install
npm run dev
```

**Terminal 3:**
```bash
cd C:\Users\tayaw\Desktop\effycionv2\frontend
npm install
npm run dev
```

---

## 🔧 Troubleshooting

### "stripe is not recognized"
**Solution:** Reinstall Stripe CLI
```bash
# Windows: Install via Scoop or Chocolatey
choco install stripe-cli
# Or download from: https://github.com/stripe/stripe-cli/releases
```

### "Not authenticated"
**Solution:** Run `stripe login` again
```bash
stripe login
```

### "Webhook secret mismatch"
**Solution:** Copy the webhook secret from CLI output
```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
# Copy: whsec_test_xxxx... and add to STRIPE_WEBHOOK_SECRET in .env
```

### "Payment intent failed"
**Solution:** Check backend logs
```bash
# Look for error in Terminal 2 (backend)
# Common issues:
# 1. Wrong API key
# 2. Missing STRIPE_SECRET_KEY in .env
# 3. Webhook secret mismatch
```

### "Connection refused on localhost:4000"
**Solution:** Ensure backend is running
```bash
# Check Terminal 2
# If not running:
cd backend && npm run dev
```

---

## 📊 Monitoring Webhooks

### In Terminal (Stripe CLI)
```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe --print-all-events
```

Shows all webhook events in real-time:
```
2025-12-18 10:30:45  --> payment_intent.created [evt_1234567890]
2025-12-18 10:30:46  --> payment_intent.succeeded [evt_1234567891]
2025-12-18 10:30:47  --> charge.succeeded [evt_1234567892]
2025-12-18 10:30:48  --> customer.subscription.created [evt_1234567893]
```

### In Stripe Dashboard
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Find endpoint: `localhost:4000/api/webhooks/stripe`
3. Click to see event logs
4. View request/response details

### In Your Backend Logs
Check `backend/src/controllers/stripeController.js` logs:
```
[Stripe Webhook] Received event: charge.succeeded
[Stripe Webhook] Processing payment: pi_1234567890
[Stripe Webhook] User tokens updated: 100 → 110
```

---

## 🔐 Security Considerations

### Local Testing
✅ Use `sk_test_` keys (not `sk_live_`)
✅ Use test credit cards
✅ Webhook secret for verification
✅ No real charges occur

### Before Production
✅ Use `sk_live_` keys
✅ Update webhook URLs to production
✅ Use real SSL/TLS certificates
✅ Enable PCI compliance
✅ Set up monitoring and alerts

---

## 📱 Testing with Frontend

### Access Local App
```
http://localhost:3000
```

### Test Flow
1. Go to http://localhost:3000/onboarding-payment
2. Fill in company info
3. Select pricing tier
4. Enter test card: `4242 4242 4242 4242`
5. Click "Complete Payment"
6. Should see success page
7. Check Stripe CLI terminal for webhook events

### Check Payment in Dashboard
1. Go to: https://dashboard.stripe.com/test/payments
2. Find your payment (most recent)
3. See status: **Succeeded**
4. View charge details

---

## 💾 Environment Variables Reference

### Required for Stripe CLI
```bash
STRIPE_SECRET_KEY=sk_test_...          # From Stripe dashboard
STRIPE_WEBHOOK_SECRET=whsec_test_...   # From CLI output
```

### Optional
```bash
STRIPE_PUBLISHABLE_KEY=pk_test_...     # For frontend (not used in CLI testing)
```

### Related
```bash
PORT=4000                               # Backend port
SUPABASE_URL=...                        # Database
JWT_SECRET=...                          # Auth tokens
```

---

## 🚀 Quick Command Reference

| Task | Command |
|------|---------|
| Authenticate | `stripe login` |
| Show API keys | `stripe keys list` |
| Listen for webhooks | `stripe listen --forward-to localhost:4000/api/webhooks/stripe` |
| View test events | `stripe events list` |
| Trigger test event | `stripe trigger payment_intent.succeeded` |
| View payment logs | `stripe logs tail` |
| Get CLI version | `stripe --version` |
| Show help | `stripe --help` |

---

## 📚 Useful Links

- **Stripe CLI Docs:** https://stripe.com/docs/stripe-cli
- **Stripe API Keys:** https://dashboard.stripe.com/apikeys
- **Test Webhook Events:** https://dashboard.stripe.com/test/webhooks
- **Stripe Test Data:** https://stripe.com/docs/testing
- **Local Development:** https://stripe.com/docs/development/quickstart

---

## ✅ Verification Checklist

- [ ] Stripe CLI installed (`stripe --version`)
- [ ] Authenticated (`stripe login`)
- [ ] API keys copied to `.env`
- [ ] Webhook secret added to `.env`
- [ ] Backend dependencies installed (`npm install`)
- [ ] Backend running (`npm run dev`)
- [ ] Stripe CLI listening to webhooks
- [ ] Test card payment completes successfully
- [ ] Webhook event received in Stripe CLI
- [ ] Token balance updated in database
- [ ] Ready to deploy! ✨

---

## 🎓 Next Steps

1. **Verify Setup:** Run through the testing flow above
2. **Monitor Webhooks:** Watch Stripe CLI terminal during payment
3. **Check Database:** Verify token_balance updated
4. **Test Chat:** Use `/api/ai/chat` to test without tokens
5. **Prepare Production:** Get live API keys when ready

---

**Status:** ✅ Ready to test locally!

*Last Updated: December 18, 2025*
