-- Optionally disable the auto-create trigger if you prefer to create profiles via API
-- This is useful if the trigger is causing issues during signup

-- Disable the auto-create trigger
drop trigger if exists on_auth_user_created on auth.users;

-- If you want to re-enable it later, run:
-- create trigger on_auth_user_created
-- after insert on auth.users
-- for each row
-- execute function public.handle_new_user();

