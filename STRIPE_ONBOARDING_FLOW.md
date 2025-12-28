# Stripe Payment Flow in Onboarding 💳

**Status:** ✅ Ready to Test with Stripe CLI

---

## 📋 Onboarding Steps Overview

Your onboarding now has 4 clear steps:

```
Step 1: Company Info
   ↓ (Click Next)
Step 2: Choose Plan (Pricing)
   ↓ (Click Next)  
Step 3: Payment (Stripe) ← USER ENTERS PAYMENT HERE
   ↓ (Click "Complete Payment")
Step 4: Success
   ↓ (Click Continue to Dashboard)
Dashboard
```

---

## 🚀 How It Works

### Step 1: Company Information
- User enters: Company name, industry, size, website
- User clicks: **"Continue to Pricing"** button
- Action: Data saved, moves to pricing step

### Step 2: Choose Plan
- User sees: 3 pricing tiers (Startup, Growth, Custom)
- Features shown:
  - Plan name
  - Monthly price
  - Credits included
  - Features list
- User clicks: **"Continue to Payment"** button
- Action: Selected tier saved, moves to payment step

### Step 3: Payment (Stripe) 🔴 THIS IS WHERE STRIPE OPENS
When user enters Step 3, they see:
- Plan summary (selected plan, price, credits)
- **Card input field** (from Stripe CardElement)
- Email address
- **"Complete Payment & Activate Subscription"** button

User enters:
- Card number: `4242 4242 4242 4242` (test)
- Expiry: `12/25` (any future date)
- CVC: `123` (any 3 digits)
- Email: Auto-filled from account

User clicks: **"Complete Payment & Activate Subscription"** button
- Stripe processes payment
- Webhook event fires
- User tokens updated
- Auto-advances to success page

### Step 4: Success
- Confirmation message
- Plan details shown
- User clicks: **"Continue to Dashboard"**
- Redirects to: Dashboard with active subscription

---

## 💻 Testing Locally with Stripe CLI

### Terminal Setup

**Terminal 1 - Stripe CLI Listener:**
```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

**Terminal 2 - Backend Server:**
```bash
cd backend
npm install
npm run dev
```

**Terminal 3 - Frontend Server:**
```bash
cd frontend
npm install
npm run dev
```

### Test Locally

1. **Go to onboarding:**
   ```
   http://localhost:3000/onboarding-payment
   ```

2. **Step 1 - Fill company info:**
   - Name: "Test Company"
   - Industry: "Tech"
   - Size: "1-10 employees"
   - Click: "Continue to Pricing"

3. **Step 2 - Select pricing:**
   - Click any tier (e.g., "Startup")
   - Click: "Continue to Payment"

4. **Step 3 - Enter payment:**
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/25`
   - CVC: `123`
   - Click: **"Complete Payment & Activate Subscription"**

5. **Watch the magic:**
   - Stripe CLI terminal shows: `charge.succeeded`, `payment_intent.succeeded`
   - Backend logs show: Token balance updated
   - Frontend shows: Success page
   - Click: "Continue to Dashboard"

---

## 🔄 What Happens Behind the Scenes

### Frontend Flow
```
User fills form → Clicks "Complete Payment"
         ↓
PaymentForm submits form
         ↓
Calls Stripe.confirmCardPayment()
         ↓
Stripe processes card (shows success/error)
         ↓
Calls backend /api/stripe/confirm-payment
         ↓
Backend confirms in Supabase
         ↓
onPaymentSuccess() callback fires
         ↓
Onboarding advances to success page
```

### Backend Flow
```
Frontend calls /api/stripe/create-payment-intent
         ↓
Backend creates PaymentIntent via Stripe API
         ↓
Returns clientSecret to frontend
         ↓
Frontend processes payment with clientSecret
         ↓
Stripe processes charge
         ↓
Webhook: charge.succeeded
         ↓
Backend /api/webhooks/stripe receives event
         ↓
Backend updates:
   - Creates subscription record
   - Adds token balance
   - Logs payment
         ↓
User sees success page
```

---

## 🧪 Test Scenarios

### Scenario 1: Successful Payment
```
Card: 4242 4242 4242 4242
Expiry: 12/25
CVC: 123
Result: ✅ Payment succeeds, user gets tokens
```

### Scenario 2: Card Declined
```
Card: 4000 0000 0000 0002
Expiry: 12/25
CVC: 123
Result: ❌ Payment fails, error shown, user stays on payment page
```

### Scenario 3: 3D Secure Required
```
Card: 4000 2500 0000 0003
Expiry: 12/25
CVC: 123
Result: 🔐 Requires authentication in popup
```

---

## 📊 Monitoring Payments

### In Stripe CLI Terminal
You'll see events like:
```
2025-12-18 10:30:45  --> payment_intent.created [evt_1234]
2025-12-18 10:30:46  --> charge.succeeded [evt_1235]
2025-12-18 10:30:47  --> payment_intent.succeeded [evt_1236]
2025-12-18 10:30:48  --> customer.subscription.created [evt_1237]
```

### In Backend Logs
```
[Stripe] Creating payment intent: $29.99
[Stripe] Payment intent created: pi_1234567890
[Webhook] Received charge.succeeded event
[Webhook] Processing payment for user: user_id
[Webhook] User tokens updated: 0 → 10
[Webhook] Subscription created: sub_1234567890
```

### In Stripe Dashboard
1. Go to: https://dashboard.stripe.com/test/payments
2. See your test payment (most recent)
3. Status should be: **Succeeded**
4. Amount should be: $29.99 (or your selected plan)

---

## 🛠️ Customization

### Change Payment Button Text
**File:** `frontend/components/payment-form.tsx`

```typescript
// Change this:
Complete Payment & Activate Subscription

// To:
Pay Now & Get Credits
```

### Change Plan Prices
**File:** `backend/src/config/stripe.js`

```javascript
const plans = {
  startup: {
    price: 2999,  // $29.99 in cents
    tokens: 10,
  },
  // ...
}
```

### Change Success Message
**File:** `frontend/app/onboarding-payment/page.tsx` (SuccessStep)

```typescript
<CardTitle className="text-3xl mb-2">
  Welcome to Efficyon!  // Change this
</CardTitle>
```

---

## 🔐 Security Checklist

✅ **Client-side:**
- Stripe's CardElement handles card data
- No card data touches your servers
- PCI DSS compliant

✅ **Server-side:**
- API key stored in .env
- Webhook secrets verified
- Payment intent validated

✅ **Testing:**
- Only test card numbers used
- Test API keys (sk_test_)
- No real charges

---

## ⚠️ Troubleshooting

### "Payment system not ready"
**Cause:** Stripe.js failed to load
**Fix:** Check NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in frontend/.env

### "Failed to create payment intent"
**Cause:** Backend couldn't create Stripe PaymentIntent
**Fix:** Check STRIPE_SECRET_KEY in backend/.env

### "Webhook secret mismatch"
**Cause:** Webhook secret incorrect
**Fix:** Copy from Stripe CLI output into STRIPE_WEBHOOK_SECRET

### "Payment succeeded but no tokens"
**Cause:** Webhook not received
**Fix:** Check Stripe CLI terminal, verify webhook URL

---

## 📱 Mobile Testing

### Responsive Payment Form
- ✅ Mobile optimized
- ✅ Touch-friendly inputs
- ✅ Full-width buttons
- ✅ Readable text

### Test on Mobile
```bash
# Get your local IP
ipconfig getifaddr en0  # Mac
ipconfig  # Windows - look for "IPv4 Address"

# Access from phone:
http://YOUR_IP:3000/onboarding-payment
```

---

## 🚀 Production Deployment

### Before Going Live

1. **Get Live API Keys**
   - Go to: https://dashboard.stripe.com/apikeys
   - Copy live secret key (sk_live_...)
   - Copy live publishable key (pk_live_...)

2. **Update Environment Variables**
   ```bash
   # backend/.env
   STRIPE_SECRET_KEY=sk_live_your_live_key
   STRIPE_WEBHOOK_SECRET=whsec_live_your_webhook_secret
   
   # frontend/.env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
   ```

3. **Update Webhook URL**
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Change URL from: `localhost:4000/api/webhooks/stripe`
   - To: `https://yourdomain.com/api/webhooks/stripe`

4. **Test Production**
   - Use real card (small amount)
   - Verify charge appears in dashboard
   - Verify tokens added to user

5. **Monitor**
   - Set up Stripe alerts
   - Monitor webhook failures
   - Track failed payments

---

## 📚 API Endpoints Used

### Frontend Calls
```
POST /api/stripe/create-payment-intent
├─ Input: { planTier, email, companyName }
└─ Returns: { clientSecret, plan }

POST /api/stripe/confirm-payment
├─ Input: { paymentIntentId, planTier, companyName }
└─ Returns: { success, message }

POST /api/profile/onboarding-complete
├─ Input: {}
└─ Returns: { success }
```

### Stripe Calls (Backend)
```
POST https://api.stripe.com/v1/payment_intents
├─ Creates payment intent for amount
└─ Returns: client_secret

POST https://api.stripe.com/v1/payment_intents/{id}/confirm
├─ Confirms payment after processing
└─ Returns: payment status

POST https://api.stripe.com/v1/customers
├─ Creates customer record
└─ Returns: customer_id
```

### Webhook Endpoint
```
POST /api/webhooks/stripe
├─ Receives: Stripe events (charge.succeeded, etc.)
└─ Updates: User tokens, subscription status
```

---

## 💡 Tips for Testing

1. **Use Different Test Cards**
   - 4242: Success
   - 4000 0000 0000 0002: Decline
   - 4000 2500 0000 0003: Auth required

2. **Monitor All 3 Terminals**
   - Terminal 1 (Stripe CLI): Shows webhook events
   - Terminal 2 (Backend): Shows API logs
   - Terminal 3 (Frontend): Shows browser console

3. **Check Database After Payment**
   ```sql
   SELECT * FROM subscriptions WHERE user_id = 'YOUR_USER_ID';
   SELECT * FROM token_balances WHERE user_id = 'YOUR_USER_ID';
   ```

4. **Test Error Scenarios**
   - Use declined card
   - Fill form partially
   - Disconnect internet mid-payment
   - Close browser during processing

---

## ✨ Features

### For Users
- ✅ Easy 4-step onboarding
- ✅ Clear pricing display
- ✅ Secure Stripe payment
- ✅ Instant token activation
- ✅ Success confirmation

### For Developers
- ✅ Test with Stripe CLI locally
- ✅ Full webhook handling
- ✅ Error logging
- ✅ Database integration
- ✅ Production-ready

---

## 🎯 Next Steps

1. **Start Local Testing**
   ```bash
   stripe listen --forward-to localhost:4000/api/webhooks/stripe
   cd backend && npm run dev
   cd frontend && npm run dev
   ```

2. **Go Through Full Flow**
   - Visit http://localhost:3000/onboarding-payment
   - Complete all 4 steps
   - Watch Stripe CLI for events

3. **Monitor Results**
   - Check database for subscription
   - Verify tokens credited
   - Check success page loads

4. **Prepare for Production**
   - Get live API keys
   - Update environment variables
   - Test with real payment method

---

**Ready to test? Start with Terminal 1! 🚀**

*Last Updated: December 18, 2025*
*Stripe CLI Version: 1.33.0*
