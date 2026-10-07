CREATE TABLE IF NOT EXISTS daily_entries (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  title text,
  text text NOT NULL DEFAULT '',
  mood text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, id)
);

ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily entries"
  ON daily_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily entries"
  ON daily_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily entries"
  ON daily_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily entries"
  ON daily_entries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_daily_entries_user_date ON daily_entries(user_id, date DESC);
