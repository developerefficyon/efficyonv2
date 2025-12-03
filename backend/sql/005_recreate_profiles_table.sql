-- Recreate profiles table with less restrictive constraints
-- This allows profiles to be created even when some data is missing

-- First, ensure the app_role enum includes 'customer'
do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'customer'
    and enumtypid = (select oid from pg_type where typname = 'app_role')
  ) then
    alter type app_role add value 'customer';
  end if;
end $$;

-- Drop the profiles table first (CASCADE will automatically drop all dependent triggers, functions, etc.)
drop table if exists public.profiles cascade;

-- Drop triggers on auth.users (these don't depend on profiles table, so safe to drop)
drop trigger if exists on_email_confirmed on auth.users;
drop trigger if exists on_user_created_email_confirmed on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_email_updated on auth.users;

-- Recreate profiles table with less restrictive constraints
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, -- NULLABLE - can be set later
  full_name text, -- NULLABLE
  role app_role default 'customer', -- Default to customer, can be null
  email_verified boolean default false,
  admin_approved boolean default false,
  status text default 'pending_email' check (status in ('pending_email', 'pending_admin', 'active', 'disabled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create index on email for faster lookups (but allow nulls)
create index if not exists idx_profiles_email on public.profiles(email) where email is not null;

-- Create unique constraint on email only when email is not null and not empty
-- This allows multiple NULL emails but ensures uniqueness for actual email addresses
create unique index if not exists idx_profiles_email_unique 
on public.profiles(email) 
where email is not null and trim(email) != '';

-- Keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Function to automatically create profile when user is created
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role app_role := 'customer';
  user_name text := '';
  user_email text := null;
begin
  -- Safely extract role from metadata
  begin
    if new.raw_user_meta_data->>'role' is not null then
      user_role := (new.raw_user_meta_data->>'role')::app_role;
    end if;
  exception when others then
    -- If role casting fails, default to customer
    user_role := 'customer';
  end;
  
  -- Extract name safely
  if new.raw_user_meta_data->>'name' is not null then
    user_name := new.raw_user_meta_data->>'name';
  end if;
  
  -- Use email only if it's not null/empty
  if new.email is not null and trim(new.email) != '' then
    user_email := new.email;
  end if;
  
  -- Create profile for new user, even if email is not confirmed yet
  -- Use NULL for email if it's not set (don't use empty string to avoid unique constraint issues)
  insert into public.profiles (id, email, full_name, role, email_verified, admin_approved, status)
  values (
    new.id,
    user_email, -- NULL if not set, which is allowed
    nullif(trim(user_name), ''), -- NULL if empty
    user_role,
    coalesce(new.email_confirmed_at is not null, false),
    false,
    case 
      when new.email_confirmed_at is not null then 'pending_admin'
      else 'pending_email'
    end
  )
  on conflict (id) do nothing;
  
  return new;
exception when others then
  -- Log error but don't fail the user creation
  -- Supabase will log this in the database logs
  raise warning 'Failed to create profile for user %: %', new.id, sqlerrm;
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger to auto-create profile on user signup
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Function to update email_verified when email is confirmed
create or replace function public.handle_email_confirmation()
returns trigger as $$
declare
  user_role app_role := 'customer';
  user_name text := '';
  user_email text := null;
begin
  -- When email_confirmed_at is set (not null), update the profile
  if new.email_confirmed_at is not null and (old.email_confirmed_at is null or old.email_confirmed_at is distinct from new.email_confirmed_at) then
    -- Safely extract role from metadata
    begin
      if new.raw_user_meta_data->>'role' is not null then
        user_role := (new.raw_user_meta_data->>'role')::app_role;
      end if;
    exception when others then
      user_role := 'customer';
    end;
    
    -- Extract name safely
    if new.raw_user_meta_data->>'name' is not null then
      user_name := new.raw_user_meta_data->>'name';
    end if;
    
    -- Use email only if it's not null/empty
    if new.email is not null and trim(new.email) != '' then
      user_email := new.email;
    end if;
    
    -- Update existing profile
    update public.profiles
    set 
      email_verified = true,
      email = coalesce(nullif(trim(profiles.email), ''), user_email), -- Set email if it was null
      status = case 
        when status = 'pending_email' then 'pending_admin'
        else status
      end,
      updated_at = now()
    where id = new.id;
    
    -- If profile doesn't exist yet, create it
    insert into public.profiles (id, email, full_name, role, email_verified, admin_approved, status)
    select
      new.id,
      user_email, -- NULL if not set
      nullif(trim(user_name), ''), -- NULL if empty
      user_role,
      true,
      false,
      'pending_admin'
    where not exists (select 1 from public.profiles where id = new.id)
    on conflict (id) do update
    set 
      email_verified = true,
      email = coalesce(nullif(trim(profiles.email), ''), excluded.email),
      status = case 
        when profiles.status = 'pending_email' then 'pending_admin'
        else profiles.status
      end,
      updated_at = now();
  end if;
  
  return new;
exception when others then
  -- Log error but don't fail the email confirmation
  raise warning 'Failed to update profile for user %: %', new.id, sqlerrm;
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger on auth.users table for email confirmation
create trigger on_email_confirmed
after update of email_confirmed_at on auth.users
for each row
when (new.email_confirmed_at is not null and (old.email_confirmed_at is null or old.email_confirmed_at is distinct from new.email_confirmed_at))
execute function public.handle_email_confirmation();

-- Function to sync email when it changes in auth.users
create or replace function public.handle_email_update()
returns trigger as $$
begin
  -- Update profile email when auth.users.email changes
  if new.email is distinct from old.email then
    update public.profiles
    set 
      email = new.email,
      updated_at = now()
    where id = new.id;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to sync email changes
create trigger on_email_updated
after update of email on auth.users
for each row
when (new.email is distinct from old.email)
execute function public.handle_email_update();

-- Backfill: Create profiles for existing users who don't have one
-- Use a safer approach with explicit role handling
do $$
declare
  user_record record;
  user_role app_role;
  user_name text;
  user_email text;
begin
  for user_record in 
    select u.id, u.email, u.raw_user_meta_data, u.email_confirmed_at
    from auth.users u
    where not exists (select 1 from public.profiles where id = u.id)
  loop
    -- Safely extract role
    begin
      if user_record.raw_user_meta_data->>'role' is not null then
        user_role := (user_record.raw_user_meta_data->>'role')::app_role;
      else
        user_role := 'customer';
      end if;
    exception when others then
      user_role := 'customer';
    end;
    
    -- Extract name
    if user_record.raw_user_meta_data->>'name' is not null then
      user_name := user_record.raw_user_meta_data->>'name';
    else
      user_name := null;
    end if;
    
    -- Use email only if not null/empty
    if user_record.email is not null and trim(user_record.email) != '' then
      user_email := user_record.email;
    else
      user_email := null;
    end if;
    
    -- Insert profile
    insert into public.profiles (id, email, full_name, role, email_verified, admin_approved, status)
    values (
      user_record.id,
      user_email,
      nullif(trim(user_name), ''),
      user_role,
      coalesce(user_record.email_confirmed_at is not null, false),
      false,
      case 
        when user_record.email_confirmed_at is not null then 'pending_admin'
        else 'pending_email'
      end
    )
    on conflict (id) do nothing;
  end loop;
end $$;

-- Update existing profiles to sync with auth.users
update public.profiles p
set 
  email = coalesce(p.email, u.email, ''),
  email_verified = coalesce(u.email_confirmed_at is not null, p.email_verified),
  status = case 
    when u.email_confirmed_at is not null and p.status = 'pending_email' then 'pending_admin'
    else p.status
  end,
  updated_at = now()
from auth.users u
where p.id = u.id;

-- Seed admin profile if it doesn't exist
insert into public.profiles (id, email, full_name, role, email_verified, admin_approved, status)
select
  u.id,
  u.email,
  'Admin User' as full_name,
  'admin'::app_role as role,
  true,
  true,
  'active'
from auth.users u
where u.email = 'admin@efficyon.com'
  and not exists (select 1 from public.profiles where id = u.id)
on conflict (id) do update
set 
  role = 'admin'::app_role,
  admin_approved = true,
  status = 'active',
  email_verified = true;

