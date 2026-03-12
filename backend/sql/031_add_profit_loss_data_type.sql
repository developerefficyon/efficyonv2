-- Add 'profit_loss' to test_uploads data_type check constraint
-- Required for Fortnox Resultatrapport (P&L) PDF uploads

alter table public.test_uploads
  drop constraint if exists test_uploads_data_type_check;

alter table public.test_uploads
  add constraint test_uploads_data_type_check
    check (data_type in (
      'supplier_invoices', 'invoices', 'customers', 'expenses', 'vouchers', 'accounts', 'articles',
      'licenses', 'users', 'usage_reports',
      'hubspot_users', 'hubspot_account',
      'profit_loss'
    ));
