-- Newsletter subscribers from the marketing site footer.
-- Public endpoint (no auth) writes here on every signup.
-- Honest pre-launch email list — one short brief per month, unsubscribe one-click.

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lowercased + trimmed at insert time. UNIQUE so duplicate signups become idempotent.
  email TEXT NOT NULL UNIQUE,

  -- Where the signup came from. e.g. "site-footer", "blog-bottom", "compare-cta".
  -- Free-form so the marketing pages can self-tag without backend changes.
  source TEXT,

  -- Status lets us distinguish active subscribers from those who unsubscribed
  -- without losing the row (we want to honor "do not re-subscribe").
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'unsubscribed', 'bounced')),

  -- Single-click unsubscribe token. Generated at insert. Sent in every email's
  -- List-Unsubscribe header so users can leave without logging in.
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),

  -- Audit columns.
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx
  ON public.newsletter_subscribers (status);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_created_at_idx
  ON public.newsletter_subscribers (created_at DESC);

-- We don't enable RLS here because writes only flow through the public
-- /api/email/newsletter-subscribe handler (using the service-role key) and
-- the table is never queried from the browser.
