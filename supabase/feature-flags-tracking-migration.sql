-- ══════════════════════════════════════════════════════════════
-- Feature Flags & Usage Tracking migration
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ── User Tiers ──
-- Stores each user's subscription tier (free by default)
CREATE TABLE IF NOT EXISTS user_tiers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'lifetime')),
  upgraded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,          -- null = never expires (lifetime)
  stripe_customer_id TEXT,          -- ready for Stripe integration
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tier"
  ON user_tiers FOR SELECT
  USING (auth.uid() = user_id);

-- Admin can manage tiers (via service role)
-- No INSERT/UPDATE policy for regular users — only admin/server can change tiers

-- Auto-create a free tier row when a user signs up
CREATE OR REPLACE FUNCTION handle_new_user_tier()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_tiers (user_id, tier)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_tier'
  ) THEN
    CREATE TRIGGER on_auth_user_created_tier
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user_tier();
  END IF;
END
$$;

-- Backfill existing users
INSERT INTO user_tiers (user_id, tier)
SELECT id, 'free' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ── Feature Overrides ──
-- Admin can override feature access per user (e.g. beta testers)
CREATE TABLE IF NOT EXISTS feature_overrides (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature)
);

ALTER TABLE feature_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own overrides"
  ON feature_overrides FOR SELECT
  USING (auth.uid() = user_id);

-- ── Usage Events (anonymous tracking) ──
CREATE TABLE IF NOT EXISTS usage_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'use',  -- 'use', 'view', 'create', 'gate_hit'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Users can insert their own events
CREATE POLICY "Users can insert own events"
  ON usage_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read own events (for potential personal analytics later)
CREATE POLICY "Users can read own events"
  ON usage_events FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_usage_events_user ON usage_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_feature ON usage_events(feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_feature_action ON usage_events(feature, action, created_at DESC);

-- ══════════════════════════════════════════════════════════════
-- Done! Tables: user_tiers, feature_overrides, usage_events
-- ══════════════════════════════════════════════════════════════
