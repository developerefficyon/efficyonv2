-- Migration: Add Stripe Price IDs to plan_catalog
-- This connects the plan catalog to actual Stripe products/prices in test mode

-- Update Startup plan with Stripe Price IDs
UPDATE public.plan_catalog
SET
  stripe_price_monthly_id = 'price_1SsLCoCl26ifLVBrYO1CcjX0',
  stripe_price_annual_id = 'price_1SsLEVCl26ifLVBrp3TCRvYj'
WHERE tier = 'startup';

-- Update Growth plan with Stripe Price IDs
UPDATE public.plan_catalog
SET
  stripe_price_monthly_id = 'price_1SsLDNCl26ifLVBrsUEAEXQk',
  stripe_price_annual_id = 'price_1SsLExCl26ifLVBrd4QgLHzN'
WHERE tier = 'growth';

-- Verify the update
SELECT tier, name, stripe_price_monthly_id, stripe_price_annual_id
FROM public.plan_catalog
WHERE tier IN ('startup', 'growth');
