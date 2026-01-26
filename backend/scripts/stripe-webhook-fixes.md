# Stripe Webhook Fixes

## Issues Fixed

### 1. Unhandled Event Type: `invoice_payment.paid`

**Problem:** Stripe was sending `invoice_payment.paid` events, but the code only handled `invoice.payment_succeeded`.

**Fix:** Added `invoice_payment.paid` to the event handler switch statement. Both event types now call the same handler function.

**Location:** `backend/src/controllers/stripeController.js` line 611-613

### 2. Foreign Key Constraint Violation

**Problem:** When creating a subscription, the `user_id` from the checkout session metadata didn't exist in the `profiles` table, causing a foreign key constraint violation.

**Error:**
```
Error creating subscription: insert or update on table "subscriptions" violates foreign key constraint "subscriptions_user_id_fkey"
```

**Root Cause:** 
- The `subscriptions` table has a foreign key constraint: `user_id uuid not null references public.profiles(id) on delete cascade`
- The `user_id` from `session.metadata.userId` must exist in the `profiles` table before a subscription can be created

**Fix:** 
1. Added validation to check if the profile exists before attempting to create a subscription
2. Added detailed error logging to help diagnose the issue
3. Early return if profile doesn't exist with clear error message

**Location:** `backend/src/controllers/stripeController.js` lines 696-710

## How to Prevent This Issue

### Ensure Profile Exists Before Checkout

When creating a Stripe checkout session, ensure the user has a profile in the database:

```javascript
// Before creating checkout session
const { data: profile } = await supabase
  .from("profiles")
  .select("id")
  .eq("id", userId)
  .maybeSingle()

if (!profile) {
  // Create profile first or return error
  throw new Error("User profile must exist before checkout")
}
```

### Verify User ID in Session Metadata

Make sure the `userId` in the checkout session metadata matches the actual user ID in your database:

```javascript
// When creating checkout session
const session = await stripe.checkout.sessions.create({
  // ... other params
  metadata: {
    userId: user.id, // Ensure this is the correct UUID from profiles table
    planTier: planTier,
  }
})
```

### Check Profile Creation Flow

Ensure your user registration/onboarding flow creates a profile in the `profiles` table:

1. User signs up → Auth user created in `auth.users`
2. Profile created in `public.profiles` with `id` matching `auth.users.id`
3. Then user can proceed to checkout

## Testing

After these fixes, test the webhook flow:

1. **Test Checkout Session Completed:**
   ```bash
   stripe trigger checkout.session.completed
   ```

2. **Test Invoice Payment:**
   ```bash
   stripe trigger invoice.payment_succeeded
   # or
   stripe trigger invoice_payment.paid
   ```

3. **Check Logs:**
   - Verify no foreign key constraint errors
   - Verify all event types are handled
   - Check that subscriptions are created successfully

## Debugging

If you still see foreign key constraint errors:

1. **Check if profile exists:**
   ```sql
   SELECT id, email FROM profiles WHERE id = '<user_id_from_error>';
   ```

2. **Check subscription creation:**
   ```sql
   SELECT * FROM subscriptions WHERE user_id = '<user_id_from_error>';
   ```

3. **Verify user_id in session metadata:**
   - Check Stripe Dashboard → Checkout Sessions
   - Look at the metadata field
   - Ensure `userId` matches a profile ID in your database

4. **Check logs for detailed error messages:**
   The improved error logging will now show:
   - Whether the profile exists
   - The exact user_id being used
   - The subscription data being inserted
