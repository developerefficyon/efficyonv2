-- Migration: Add 6-month billing period support
-- Adds price_6month_cents and stripe_price_6month_id columns to plan_catalog
-- Adds billing_period tracking to subscriptions

-- Add 6-month pricing columns to plan_catalog
ALTER TABLE public.plan_catalog
ADD COLUMN IF NOT EXISTS price_6month_cents integer CHECK (price_6month_cents >= 0),
ADD COLUMN IF NOT EXISTS stripe_price_6month_id text UNIQUE;

-- Set 6-month bundle prices (discounted ~15%)
-- Startup: $39/mo x 6 = $234 full price → $199 bundle (save $35)
-- Growth: $119/mo x 6 = $714 full price → $599 bundle (save $115)
UPDATE public.plan_catalog
SET
  price_6month_cents = 19900,
  updated_at = now()
WHERE tier = 'startup';

UPDATE public.plan_catalog
SET
  price_6month_cents = 59900,
  updated_at = now()
WHERE tier = 'growth';

UPDATE public.plan_catalog
SET
  price_6month_cents = 149900,
  updated_at = now()
WHERE tier = 'custom';

-- Add billing_period column to subscriptions to track intro vs recurring
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'monthly'
  CHECK (billing_period IN ('monthly', 'annual', '6month'));

-- Set Stripe 6-month price IDs
UPDATE public.plan_catalog
SET stripe_price_6month_id = 'price_1TJ8hBCl26ifLVBrBqIrkDTn'
WHERE tier = 'startup';

UPDATE public.plan_catalog
SET stripe_price_6month_id = 'price_1TJ8hfCl26ifLVBrZvFWRfl1'
WHERE tier = 'growth';

UPDATE public.plan_catalog
SET stripe_price_6month_id = 'price_1TJ8i6Cl26ifLVBr4PdwjSzK'
WHERE tier = 'custom';

-- Update Enterprise Stripe price IDs (monthly + annual)
UPDATE public.plan_catalog
SET
  stripe_price_monthly_id = 'price_1TJ8iTCl26ifLVBrJKPk5Ndv',
  stripe_price_annual_id = 'price_1TJ8iiCl26ifLVBrkEWz8A6X'
WHERE tier = 'custom';

-- Verify
SELECT tier, name, price_monthly_cents, price_6month_cents, price_annual_cents,
       stripe_price_6month_id, stripe_price_monthly_id, stripe_price_annual_id
FROM public.plan_catalog
ORDER BY price_monthly_cents;
