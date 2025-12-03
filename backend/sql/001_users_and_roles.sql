-- Create an enum type for roles
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'user');
  end if;
end $$;

-- Profiles table linked to Supabase auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute procedure public.set_updated_at();

-- Seed an admin profile for admin@efficyon.com
-- NOTE: this assumes you've created the auth user in Supabase auth
-- with email = 'admin@efficyon.com' already.
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  'Admin User' as full_name,
  'admin'::app_role as role
from auth.users u
where u.email = 'admin@efficyon.com'
on conflict (id) do update
set role = excluded.role;


