# Quick Reference: Onboarding Steps & Payment Flow

## 🎯 What Happens When User Clicks "Next"

### Step 1: Company Information → Click "Continue to Pricing"
```
✅ Company data saved to backend
✅ Validation: All required fields filled
❌ Error: Shows validation error
→ Advances to Step 2 (Pricing)
```

### Step 2: Pricing Selection → Click "Continue to Payment"
```
✅ Selected plan tier saved
❌ No validation needed (one tier must be selected)
→ Advances to Step 3 (Payment)
```

### Step 3: Payment → Click "Complete Payment & Activate Subscription"
```
⏳ Shows: "Processing Payment..."
🔄 Backend creates PaymentIntent with Stripe
💳 Stripe processes card
✅ Success: Tokens added, advances to Step 4
❌ Error: Shows error message, stays on Step 3
```

### Step 4: Success → Click "Continue to Dashboard"
```
✅ Marks onboarding as complete
→ Redirects to Dashboard (/dashboard)
```

---

## 💳 Payment Step Details

### What User Sees
```
┌─────────────────────────────────────┐
│  STEP 3: PAYMENT (STRIPE)           │
├─────────────────────────────────────┤
│  Plan Summary                        │
│  └─ Startup: $29.99/month, 10 credits
│                                     │
│  Card Information                   │
│  ├─ Card Number: [________________] │
│  ├─ Expiry: [__/__]  CVC: [___]    │
│  └─ Email: user@example.com        │
│                                     │
│  [ Complete Payment & Activate ] ← CLICK HERE
│                                     │
│  🔒 Secure & encrypted by Stripe   │
└─────────────────────────────────────┘
```

### Test Card to Use
```
Number:  4242 4242 4242 4242
Expiry:  12/25 (or any future date)
CVC:     123 (or any 3 digits)
Email:   Auto-filled from your account
```

### When They Click Payment Button

**In Real Time:**
```
User Clicks → Processing... (spinner)
        ↓ (2-5 seconds)
Stripe Processes Card
        ↓
Success! (auto-advances to Step 4)
```

**In Terminal 1 (Stripe CLI):**
```
2025-12-18 10:30:45 --> charge.succeeded
2025-12-18 10:30:46 --> payment_intent.succeeded
```

**In Terminal 2 (Backend):**
```
[Stripe] Payment confirmed: pi_1234567890
[Database] Tokens updated for user
[Webhook] Subscription created
```

---

## 🚀 Step-by-Step Test Flow

### Before Starting
- [ ] Terminal 1: `stripe listen --forward-to localhost:4000/api/webhooks/stripe`
- [ ] Terminal 2: `cd backend && npm run dev`
- [ ] Terminal 3: `cd frontend && npm run dev`

### Test Flow
1. Go to: http://localhost:3000/onboarding-payment
2. **Step 1:** Fill form → Click "Continue to Pricing"
3. **Step 2:** Select plan → Click "Continue to Payment"
4. **Step 3:** Enter card → Click "Complete Payment & Activate Subscription"
   - Watch Terminal 1 for webhook events
   - Watch Terminal 2 for backend logs
5. **Step 4:** See success → Click "Continue to Dashboard"

---

## 📊 Success Indicators

### ✅ Payment Succeeded If You See:
- Green success page with checkmark
- Webhook events in Terminal 1
- No error messages

### ❌ Payment Failed If You See:
- Red error alert
- Stays on Step 3 (payment)
- Error message in Terminal 2

---

## 🔍 What Gets Updated

### After Successful Payment:

**In Database:**
```
subscriptions table:
  - user_id: your_user_id
  - plan_id: startup
  - status: active
  - amount: 2999 (cents)
  - created_at: now

token_balances table:
  - user_id: your_user_id
  - total_tokens: 10
  - used_tokens: 0
  - subscription_id: sub_xxx
```

**Frontend:**
- Onboarding complete: ✅
- User can access dashboard
- AI features available

---

## 🎨 Stripe Integration Points

### Frontend
- Stripe CardElement (card input)
- PaymentForm component
- Handles user input

### Backend
- Creates PaymentIntent
- Confirms payment
- Updates database
- Sends tokens

### Stripe
- Processes card
- Creates charge
- Sends webhook events
- Handles 3D Secure

---

## 📞 Quick Troubleshooting

| Issue | Check | Fix |
|-------|-------|-----|
| "Payment system not ready" | NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Add to frontend/.env |
| "Failed to create payment intent" | STRIPE_SECRET_KEY | Add to backend/.env |
| "Card declined" | Using test card 4242... | Use correct test card |
| "No webhook event" | Stripe CLI running? | Start: `stripe listen` |
| "Tokens not added" | Backend logs | Check /api/webhooks/stripe endpoint |

---

## 🔐 Security Notes

### ✅ Secure By Default
- Card data: Handled by Stripe (never touches your server)
- API keys: In .env (not in git)
- Webhooks: Signed and verified
- HTTPS: Required in production

---

## 💰 Testing Costs

**Local Testing:** $0.00
- Uses Stripe test API keys
- No real charges
- Fully free to test

**After Launch:** ~$0.30 per transaction
- Stripe processes 2.9% + $0.30 per charge
- Example: $29.99 payment = $1.17 fee

---

## 📝 Summary

**Click "Next" on Step 3 (Payment):**
1. You see Stripe payment form with card input
2. You enter test card: 4242 4242 4242 4242
3. You click: "Complete Payment & Activate Subscription"
4. System processes payment (2-5 seconds)
5. You get auto-advanced to Success page
6. Tokens are added to your account

**That's it!** The entire flow is automated.

---

*Last Updated: December 18, 2025*
