-- ══════════════════════════════════════════════════════
-- Fix: Ensure all core tables have proper RLS policies
-- for authenticated users (INSERT, UPDATE, DELETE, SELECT).
--
-- Problem: New user data (trips, settings) is not persisting.
-- Root cause: Missing INSERT/UPDATE/DELETE policies on core tables.
-- The tables have RLS enabled but only SELECT policies exist.
--
-- Run this in the Supabase SQL Editor.
-- ══════════════════════════════════════════════════════

-- ── TRIPS ──────────────────────────────────────────────

-- Ensure RLS is on
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- SELECT: users can read their own trips + published trips for public pages
DROP POLICY IF EXISTS "trips_select" ON trips;
CREATE POLICY "trips_select" ON trips FOR SELECT USING (
  user_id = auth.uid() OR published = true
);

-- INSERT: users can insert their own trips
DROP POLICY IF EXISTS "trips_insert" ON trips;
CREATE POLICY "trips_insert" ON trips FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- UPDATE: users can update their own trips
DROP POLICY IF EXISTS "trips_update" ON trips;
CREATE POLICY "trips_update" ON trips FOR UPDATE USING (
  user_id = auth.uid()
);

-- DELETE: users can delete their own trips
DROP POLICY IF EXISTS "trips_delete" ON trips;
CREATE POLICY "trips_delete" ON trips FOR DELETE USING (
  user_id = auth.uid()
);


-- ── USER_SETTINGS ──────────────────────────────────────

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select" ON user_settings;
CREATE POLICY "settings_select" ON user_settings FOR SELECT USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "settings_insert" ON user_settings;
CREATE POLICY "settings_insert" ON user_settings FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "settings_update" ON user_settings;
CREATE POLICY "settings_update" ON user_settings FOR UPDATE USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "settings_delete" ON user_settings;
CREATE POLICY "settings_delete" ON user_settings FOR DELETE USING (
  user_id = auth.uid()
);


-- ── JOURNAL_ENTRIES ────────────────────────────────────

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_select" ON journal_entries;
CREATE POLICY "journal_select" ON journal_entries FOR SELECT USING (
  user_id = auth.uid()
  OR trip_id IN (SELECT id FROM trips WHERE published = true AND user_id = journal_entries.user_id)
);

DROP POLICY IF EXISTS "journal_insert" ON journal_entries;
CREATE POLICY "journal_insert" ON journal_entries FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "journal_update" ON journal_entries;
CREATE POLICY "journal_update" ON journal_entries FOR UPDATE USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "journal_delete" ON journal_entries;
CREATE POLICY "journal_delete" ON journal_entries FOR DELETE USING (
  user_id = auth.uid()
);


-- ── ROUTES ─────────────────────────────────────────────

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "routes_select" ON routes;
CREATE POLICY "routes_select" ON routes FOR SELECT USING (
  user_id = auth.uid()
  OR trip_id IN (SELECT id FROM trips WHERE published = true AND user_id = routes.user_id)
);

DROP POLICY IF EXISTS "routes_insert" ON routes;
CREATE POLICY "routes_insert" ON routes FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "routes_update" ON routes;
CREATE POLICY "routes_update" ON routes FOR UPDATE USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "routes_delete" ON routes;
CREATE POLICY "routes_delete" ON routes FOR DELETE USING (
  user_id = auth.uid()
);


-- ── TRIP_PHOTOS ────────────────────────────────────────

ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photos_select" ON trip_photos;
CREATE POLICY "photos_select" ON trip_photos FOR SELECT USING (
  user_id = auth.uid()
  OR trip_id IN (SELECT id FROM trips WHERE published = true AND user_id = trip_photos.user_id)
);

DROP POLICY IF EXISTS "photos_insert" ON trip_photos;
CREATE POLICY "photos_insert" ON trip_photos FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "photos_update" ON trip_photos;
CREATE POLICY "photos_update" ON trip_photos FOR UPDATE USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "photos_delete" ON trip_photos;
CREATE POLICY "photos_delete" ON trip_photos FOR DELETE USING (
  user_id = auth.uid()
);


-- ── USER_PROFILES ──────────────────────────────────────

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Public profiles can be read by anyone (for /u/username pages)
DROP POLICY IF EXISTS "profiles_select" ON user_profiles;
CREATE POLICY "profiles_select" ON user_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON user_profiles;
CREATE POLICY "profiles_insert" ON user_profiles FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "profiles_update" ON user_profiles;
CREATE POLICY "profiles_update" ON user_profiles FOR UPDATE USING (
  user_id = auth.uid()
);


-- ── USER_TIERS ─────────────────────────────────────────
-- (Already has SELECT policy from feature-flags migration, add INSERT for trigger)

DROP POLICY IF EXISTS "tiers_insert_self" ON user_tiers;
CREATE POLICY "tiers_insert_self" ON user_tiers FOR INSERT WITH CHECK (
  user_id = auth.uid()
);


-- ── USAGE_EVENTS ───────────────────────────────────────
-- (Should already have INSERT policy, ensure it exists)

DROP POLICY IF EXISTS "events_insert_own" ON usage_events;
CREATE POLICY "events_insert_own" ON usage_events FOR INSERT WITH CHECK (
  user_id = auth.uid()
);


-- ══════════════════════════════════════════════════════
-- Backfill: Create missing profiles rows (FK dependency for user_settings)
-- ══════════════════════════════════════════════════════

INSERT INTO profiles (id, email, full_name, avatar_url, created_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'avatar_url',
  u.created_at
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;


-- ══════════════════════════════════════════════════════
-- Backfill: Create missing user_tiers for existing users
-- ══════════════════════════════════════════════════════

INSERT INTO user_tiers (user_id, tier)
SELECT id, 'free'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_tiers)
ON CONFLICT (user_id) DO NOTHING;


-- ══════════════════════════════════════════════════════
-- Backfill: Create missing user_settings for existing users
-- (Must run AFTER profiles backfill due to FK constraint)
-- ══════════════════════════════════════════════════════

INSERT INTO user_settings (user_id, lang, lived_places, clocks, translations, wishlist)
SELECT id, 'en', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_settings)
ON CONFLICT (user_id) DO NOTHING;


-- ══════════════════════════════════════════════════════
-- Fix: Update handle_new_user trigger to also insert into profiles
-- (The original trigger only inserted into user_profiles, not profiles)
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_username text;
BEGIN
  -- 1. Insert into profiles (FK target for user_settings, trips, etc.)
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.raw_user_meta_data->>'avatar_url',
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
      avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: profiles insert failed: %', SQLERRM;
  END;

  -- 2. Insert into user_profiles (public profile with username)
  BEGIN
    default_username := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));
    IF length(default_username) < 3 THEN
      default_username := 'user' || default_username;
    END IF;
    default_username := default_username || '-' || substr(md5(random()::text), 1, 4);

    INSERT INTO public.user_profiles (user_id, username, email, display_name, avatar_url, updated_at)
    VALUES (
      NEW.id,
      default_username,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.raw_user_meta_data->>'avatar_url',
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = COALESCE(user_profiles.display_name, EXCLUDED.display_name),
      avatar_url = COALESCE(user_profiles.avatar_url, EXCLUDED.avatar_url);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: user_profiles insert failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ══════════════════════════════════════════════════════
-- Done! Verify policies exist:
-- ══════════════════════════════════════════════════════

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('trips', 'user_settings', 'journal_entries', 'routes', 'trip_photos', 'user_profiles', 'user_tiers', 'usage_events')
ORDER BY tablename, cmd;
