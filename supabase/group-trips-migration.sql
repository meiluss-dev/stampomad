-- ══════════════════════════════════════════════════════
-- Group Trips — Supabase Migration
-- Run this in the Supabase SQL Editor
-- ══════════════════════════════════════════════════════

-- 1. Trip Members (invites & membership)
CREATE TABLE IF NOT EXISTS trip_members (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id bigint NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(trip_id, user_id)
);

-- 2. Trip Expenses
CREATE TABLE IF NOT EXISTS trip_expenses (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id bigint NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  paid_by uuid NOT NULL REFERENCES auth.users(id),
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL DEFAULT '',
  split_type text NOT NULL DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom')),
  created_at timestamptz DEFAULT now()
);

-- 3. Expense Splits (who owes what)
CREATE TABLE IF NOT EXISTS expense_splits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  expense_id bigint NOT NULL REFERENCES trip_expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric(12,2) NOT NULL,
  settled boolean DEFAULT false,
  UNIQUE(expense_id, user_id)
);

-- 4. Shared Items (group packing / supplies list)
CREATE TABLE IF NOT EXISTS shared_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id bigint NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  text text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  assigned_to uuid REFERENCES auth.users(id),
  claimed_by uuid REFERENCES auth.users(id),
  checked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 5. Mark trips as group trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_group boolean DEFAULT false;

-- ══════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════

ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_items ENABLE ROW LEVEL SECURITY;

-- Trip Members: can see if you're a member of that trip or the trip owner
CREATE POLICY "trip_members_select" ON trip_members FOR SELECT USING (
  user_id = auth.uid() OR
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
);
CREATE POLICY "trip_members_insert" ON trip_members FOR INSERT WITH CHECK (
  -- Only trip owner can invite (owner = the user_id in trips table)
  trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  OR user_id = auth.uid() -- user can accept their own invite
);
CREATE POLICY "trip_members_update" ON trip_members FOR UPDATE USING (
  user_id = auth.uid() -- can update own membership (accept/decline)
  OR trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()) -- owner can manage
);
CREATE POLICY "trip_members_delete" ON trip_members FOR DELETE USING (
  user_id = auth.uid()
  OR trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
);

-- Expenses: visible to all trip members
CREATE POLICY "expenses_select" ON trip_expenses FOR SELECT USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted')
  OR trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
);
CREATE POLICY "expenses_insert" ON trip_expenses FOR INSERT WITH CHECK (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted')
  OR trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
);
CREATE POLICY "expenses_update" ON trip_expenses FOR UPDATE USING (
  paid_by = auth.uid()
  OR trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
);
CREATE POLICY "expenses_delete" ON trip_expenses FOR DELETE USING (
  paid_by = auth.uid()
  OR trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
);

-- Expense Splits: same as expenses
CREATE POLICY "splits_select" ON expense_splits FOR SELECT USING (
  expense_id IN (
    SELECT id FROM trip_expenses WHERE trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    ) OR trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  )
);
CREATE POLICY "splits_insert" ON expense_splits FOR INSERT WITH CHECK (
  expense_id IN (
    SELECT id FROM trip_expenses WHERE trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted'
    ) OR trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  )
);
CREATE POLICY "splits_update" ON expense_splits FOR UPDATE USING (
  user_id = auth.uid()
  OR expense_id IN (SELECT id FROM trip_expenses WHERE paid_by = auth.uid())
);
CREATE POLICY "splits_delete" ON expense_splits FOR DELETE USING (
  expense_id IN (SELECT id FROM trip_expenses WHERE paid_by = auth.uid())
);

-- Shared Items: visible to all trip members
CREATE POLICY "items_select" ON shared_items FOR SELECT USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted')
  OR trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
);
CREATE POLICY "items_insert" ON shared_items FOR INSERT WITH CHECK (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted')
  OR trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
);
CREATE POLICY "items_update" ON shared_items FOR UPDATE USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted')
  OR trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
);
CREATE POLICY "items_delete" ON shared_items FOR DELETE USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND status = 'accepted')
  OR trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
);
