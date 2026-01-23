-- Migration: Update pricing to match landing page
-- Startup: $39/month, $372/year (was $29/month)
-- Growth: $119/month, $1,140/year (was $99/month)

-- Update Startup plan pricing
update public.plan_catalog
set
  price_monthly_cents = 3900,      -- $39/month
  price_annual_cents = 37200,      -- $372/year ($31/month * 12)
  updated_at = now()
where tier = 'startup';

-- Update Growth plan pricing
update public.plan_catalog
set
  price_monthly_cents = 11900,     -- $119/month
  price_annual_cents = 114000,     -- $1,140/year ($95/month * 12)
  updated_at = now()
where tier = 'growth';

-- Update Enterprise/Custom plan pricing (optional - adjust if needed)
update public.plan_catalog
set
  price_monthly_cents = 29900,     -- $299/month (unchanged)
  price_annual_cents = 299000,     -- $2,990/year (estimated, custom pricing)
  updated_at = now()
where tier = 'custom';

-- Verify the updates
select tier, name, price_monthly_cents, price_annual_cents,
       (price_monthly_cents / 100.0) as monthly_usd,
       (price_annual_cents / 100.0) as annual_usd
from public.plan_catalog
order by price_monthly_cents;
