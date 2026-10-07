-- Add ratings JSONB column to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS ratings jsonb DEFAULT '{}';
