-- Add the phone column to profiles if it doesn't exist yet
alter table if exists public.profiles
  add column if not exists phone text unique;

-- Refresh the schema cache so the Supabase JS client picks it up
notify pgrst, 'reload schema';
