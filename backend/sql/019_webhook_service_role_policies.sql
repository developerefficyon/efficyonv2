-- ============================================================================
-- Service Role Policies for Stripe Webhooks
-- ============================================================================
-- These policies allow the backend (using service_role key) to manage
-- subscriptions, payments, and token_balances via webhooks.
-- 
-- IMPORTANT: These are only needed if RLS is enabled. The service_role key
-- should bypass RLS, but these policies provide explicit permissions.
-- ============================================================================

-- Subscriptions: Allow service role to manage (for webhooks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'subscriptions' 
    AND policyname = 'Service role can manage subscriptions'
  ) THEN
    CREATE POLICY "Service role can manage subscriptions" 
    ON public.subscriptions 
    FOR ALL 
    USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Payments: Allow service role to manage (for webhooks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payments' 
    AND policyname = 'Service role can manage payments'
  ) THEN
    CREATE POLICY "Service role can manage payments" 
    ON public.payments 
    FOR ALL 
    USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Token Balances: Allow service role to manage (for webhooks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'token_balances' 
    AND policyname = 'Service role can manage token balances'
  ) THEN
    CREATE POLICY "Service role can manage token balances" 
    ON public.token_balances 
    FOR ALL 
    USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Profiles: Allow service role to read (for webhook validation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Service role can read profiles'
  ) THEN
    CREATE POLICY "Service role can read profiles" 
    ON public.profiles 
    FOR SELECT 
    USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Plan Catalog: Service role should already have access (public read policy exists)
-- But ensure it can read for webhook operations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'plan_catalog' 
    AND policyname = 'Service role can read plan catalog'
  ) THEN
    CREATE POLICY "Service role can read plan catalog" 
    ON public.plan_catalog 
    FOR SELECT 
    USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- Done
-- ============================================================================
-- After running this, your webhook handlers should be able to:
-- 1. Read profiles to validate user_id exists
-- 2. Create/update subscriptions
-- 3. Create/update payments
-- 4. Create/update token_balances
-- 5. Read plan_catalog for plan details
-- ============================================================================
