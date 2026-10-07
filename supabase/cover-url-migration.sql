-- Add cover_url column to trips table for auto-fetched landmark photos
ALTER TABLE trips ADD COLUMN IF NOT EXISTS cover_url text;
