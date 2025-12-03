-- Add 'customer' to the app_role enum if it doesn't exist
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

