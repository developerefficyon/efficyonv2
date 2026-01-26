# Stripe CLI Webhook Setup Guide

## Prerequisites

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Have your backend server running on `http://localhost:4000`

## Quick Start

### Step 1: Login to Stripe CLI
```bash
stripe login
```

### Step 2: Forward Webhooks to Local Server
```bash
stripe listen --forward-to http://localhost:4000/api/stripe/webhook
```

### Step 3: Copy Webhook Secret
After running the command above, you'll see:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

Copy this secret and add it to your `.env` file:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Step 4: Restart Your Backend Server
After updating the `.env` file, restart your backend server to load the new webhook secret.

## Testing Webhooks

### Trigger Test Events

In a separate terminal, you can trigger test events:

```bash
# Test payment intent succeeded
stripe trigger payment_intent.succeeded

# Test payment intent failed
stripe trigger payment_intent.payment_failed

# Test checkout session completed
stripe trigger checkout.session.completed

# Test subscription updated
stripe trigger customer.subscription.updated

# Test subscription deleted
stripe trigger customer.subscription.deleted

# Test invoice payment succeeded
stripe trigger invoice.payment_succeeded
```

## Webhook Events Your App Handles

Your backend handles these Stripe webhook events:

- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed
- `checkout.session.completed` - Checkout session completed
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.payment_succeeded` - Invoice payment succeeded

## Troubleshooting

### Webhook Secret Mismatch
If you see "Webhook Error: No signatures found matching the expected signature", make sure:
1. The `STRIPE_WEBHOOK_SECRET` in your `.env` matches the secret from `stripe listen`
2. Your backend server has been restarted after updating `.env`

### Port Already in Use
If port 4000 is already in use, either:
1. Change your backend port in `.env`: `PORT=4001`
2. Update the forward URL: `stripe listen --forward-to http://localhost:4001/api/stripe/webhook`

### View Webhook Logs
```bash
# View all webhook events
stripe logs tail

# View specific event type
stripe logs tail --filter payment_intent.succeeded
```

## Production Setup

For production, you'll need to:
1. Create a webhook endpoint in Stripe Dashboard: https://dashboard.stripe.com/webhooks
2. Set the endpoint URL to: `https://your-backend-url.com/api/stripe/webhook`
3. Copy the webhook signing secret from the dashboard
4. Add it to your production environment variables
