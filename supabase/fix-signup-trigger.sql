-- ══════════════════════════════════════════════════════
-- Fix: handle_new_user trigger fails because username is NOT NULL
-- but the trigger doesn't set one. Generate a default username.
-- Run this in the Supabase SQL Editor
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_username text;
BEGIN
  -- Generate a default username from email prefix + random suffix
  default_username := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));
  -- Ensure minimum length
  IF length(default_username) < 3 THEN
    default_username := 'user' || default_username;
  END IF;
  -- Add random suffix to avoid collisions
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
