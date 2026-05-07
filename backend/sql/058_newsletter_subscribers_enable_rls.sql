-- Enable RLS on newsletter_subscribers without adding any policies.
--
-- The Express backend uses the service-role key, which bypasses RLS, so
-- nothing breaks. The anon and authenticated keys get zero access to the
-- table — which is correct, because the marketing footer form posts to the
-- backend, not directly to Supabase. This locks the door on the anon-key
-- attack vector flagged by the Supabase advisor (2026-05-07).
--
-- Note: this is the same intent as a public-only-via-trusted-backend table,
-- now expressed at the database layer instead of relying purely on the
-- backend being the only writer in practice.

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
