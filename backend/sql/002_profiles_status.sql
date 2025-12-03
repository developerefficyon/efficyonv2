-- Add status flags to profiles for email/admin verification

alter table public.profiles
  add column if not exists email_verified boolean not null default false,
  add column if not exists admin_approved boolean not null default false;

-- Optionally, a high-level status column if you want
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'profiles'
      and column_name  = 'status'
  ) then
    alter table public.profiles
      add column status text not null default 'pending_email'
      check (status in ('pending_email', 'pending_admin', 'active', 'disabled'));
  end if;
end $$;

-- Initial backfill: mark email_verified based on auth.users.email_confirmed_at
update public.profiles p
set email_verified = (u.email_confirmed_at is not null)
from auth.users u
where p.id = u.id;

-- Initial backfill: mark admin_approved for admin profiles
update public.profiles
set admin_approved = true,
    status = 'active'
where role = 'admin';


