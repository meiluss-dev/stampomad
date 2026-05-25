-- Public profiles: username, bio, avatar for shareable profile pages
-- Run this in the Supabase SQL Editor

-- 1. Create user_profiles table
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  bio text default '',
  avatar_url text,
  homebase jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Username must be lowercase alphanumeric + hyphens, 3-30 chars
alter table public.user_profiles
  add constraint username_format check (username ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$');

-- 2. Add published flag to trips
alter table public.trips
  add column if not exists published boolean default false;

-- 3. Enable RLS
alter table public.user_profiles enable row level security;

-- Owners can read/write their own profile
create policy "Users can manage their own profile"
  on public.user_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anyone can read profiles (public pages)
create policy "Public profiles are readable by everyone"
  on public.user_profiles for select
  using (true);

-- 4. Allow anonymous read of published trips + their journal entries, routes, photos
-- Trips: owner full access, public read of published trips
create policy "Public can read published trips"
  on public.trips for select
  using (published = true);

-- Journal entries for published trips
create policy "Public can read journal entries of published trips"
  on public.journal_entries for select
  using (
    exists (
      select 1 from public.trips
      where trips.id = journal_entries.trip_id
        and trips.published = true
    )
  );

-- Routes for published trips
create policy "Public can read routes of published trips"
  on public.routes for select
  using (
    exists (
      select 1 from public.trips
      where trips.id = routes.trip_id
        and trips.published = true
    )
  );

-- Trip photos for published trips
create policy "Public can read photos of published trips"
  on public.trip_photos for select
  using (
    exists (
      select 1 from public.trips
      where trips.id = trip_photos.trip_id
        and trips.published = true
    )
  );

-- 5. Index for fast username lookups
create index if not exists idx_user_profiles_username on public.user_profiles(username);
create index if not exists idx_trips_published on public.trips(published) where published = true;
