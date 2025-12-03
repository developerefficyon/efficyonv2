-- Automatically update profiles.email_verified when auth.users.email_confirmed_at changes
-- This trigger ensures email_verified stays in sync with Supabase's email confirmation

-- Function to update email_verified when email is confirmed
create or replace function public.handle_email_confirmation()
returns trigger as $$
begin
  -- When email_confirmed_at is set (not null), update the profile
  if new.email_confirmed_at is not null and (old.email_confirmed_at is null or old.email_confirmed_at is distinct from new.email_confirmed_at) then
    update public.profiles
    set 
      email_verified = true,
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
      new.email,
      coalesce(new.raw_user_meta_data->>'name', new.email, ''),
      coalesce((new.raw_user_meta_data->>'role')::app_role, 'customer'::app_role),
      true,
      false,
      'pending_admin'
    where not exists (select 1 from public.profiles where id = new.id)
    on conflict (id) do nothing;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists
drop trigger if exists on_email_confirmed on auth.users;

-- Create trigger on auth.users table
create trigger on_email_confirmed
after update of email_confirmed_at on auth.users
for each row
when (new.email_confirmed_at is not null and (old.email_confirmed_at is null or old.email_confirmed_at is distinct from new.email_confirmed_at))
execute function public.handle_email_confirmation();

-- Also handle initial email confirmation on insert (if email is already confirmed)
create or replace function public.handle_new_user_email_confirmed()
returns trigger as $$
begin
  -- If user is created with email already confirmed, update profile
  if new.email_confirmed_at is not null then
    insert into public.profiles (id, email, full_name, role, email_verified, admin_approved, status)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'name', new.email, ''),
      coalesce((new.raw_user_meta_data->>'role')::app_role, 'customer'::app_role),
      true,
      false,
      'pending_admin'
    )
    on conflict (id) do update
    set 
      email_verified = true,
      status = case 
        when profiles.status = 'pending_email' then 'pending_admin'
        else profiles.status
      end,
      updated_at = now();
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists
drop trigger if exists on_user_created_email_confirmed on auth.users;

-- Create trigger for new users with confirmed email
create trigger on_user_created_email_confirmed
after insert on auth.users
for each row
when (new.email_confirmed_at is not null)
execute function public.handle_new_user_email_confirmed();

-- Backfill: Update existing profiles where email is confirmed but email_verified is false
update public.profiles p
set 
  email_verified = true,
  status = case 
    when p.status = 'pending_email' then 'pending_admin'
    else p.status
  end,
  updated_at = now()
from auth.users u
where p.id = u.id
  and u.email_confirmed_at is not null
  and p.email_verified = false;


