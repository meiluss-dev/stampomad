-- Add transit_countries column to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS transit_countries jsonb DEFAULT '[]'::jsonb;

-- Add count_transit_as_visited setting to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS count_transit_as_visited boolean DEFAULT false;
