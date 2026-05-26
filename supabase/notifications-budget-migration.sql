-- ══════════════════════════════════════════════════════
-- Notifications + Personal Trip Budget
-- Run this in the Supabase SQL Editor
-- ══════════════════════════════════════════════════════

-- 1. Notifications / Activity Feed
CREATE TABLE IF NOT EXISTS notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'invite_received','invite_accepted','invite_declined','expense_added','item_added','item_claimed','member_joined'
  trip_id bigint REFERENCES trips(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (
  -- Any trip member or trip owner can create notifications for other members
  true
);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_delete" ON notifications FOR DELETE USING (user_id = auth.uid());

-- 2. Personal Trip Budget
CREATE TABLE IF NOT EXISTS trip_budgets (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id bigint NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_budget numeric(12,2) DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  UNIQUE(trip_id, user_id)
);

CREATE TABLE IF NOT EXISTS budget_expenses (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id bigint NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL DEFAULT '',
  date text, -- YYYY-MM-DD
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trip_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budgets_select" ON trip_budgets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "budgets_insert" ON trip_budgets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "budgets_update" ON trip_budgets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "budgets_delete" ON trip_budgets FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "budget_expenses_select" ON budget_expenses FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "budget_expenses_insert" ON budget_expenses FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "budget_expenses_update" ON budget_expenses FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "budget_expenses_delete" ON budget_expenses FOR DELETE USING (user_id = auth.uid());
