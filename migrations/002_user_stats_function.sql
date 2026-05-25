-- Function to get user's total stats (bypasses RLS so public profile shows all stats)
-- Run this in the Supabase SQL Editor

create or replace function get_user_stats(target_user_id uuid)
returns json
language sql
security definer
stable
as $$
  select json_build_object(
    'countries', (
      select count(distinct code) from public.trips
      where user_id = target_user_id
    ),
    'trips', (
      select count(*) from public.trips
      where user_id = target_user_id and quick_pin = false
    ),
    'days', (
      select coalesce(sum(days), 0) from public.trips
      where user_id = target_user_id and quick_pin = false
    ),
    'entries', (
      select count(*) from public.journal_entries
      where user_id = target_user_id
    )
  )
$$;

-- Function to get a user's mapbox token for public map rendering
create or replace function get_user_mapbox_token(target_user_id uuid)
returns text
language sql
security definer
stable
as $$
  select coalesce(mapbox_token, '') from public.user_settings
  where user_id = target_user_id
$$;
