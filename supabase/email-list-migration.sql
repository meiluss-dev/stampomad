-- ══════════════════════════════════════════════════════
-- Email List & Auto Profile Creation
-- Run this in the Supabase SQL Editor
-- ══════════════════════════════════════════════════════

-- 1. Add email column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Backfill emails for existing users
UPDATE user_profiles
SET email = u.email
FROM auth.users u
WHERE user_profiles.user_id = u.id
  AND user_profiles.email IS NULL;

-- 3. Auto-create a user_profiles row on every signup
--    This ensures every user has a profile with their email from day one
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, display_name, avatar_url, updated_at)
  VALUES (
    NEW.id,
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

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. View for quickly exporting the email list (run anytime in SQL Editor)
-- SELECT display_name, email, username, created_at
-- FROM user_profiles
-- WHERE email IS NOT NULL
-- ORDER BY created_at DESC;
