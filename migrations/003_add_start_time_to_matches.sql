-- Migration: Add start_time to matches
ALTER TABLE matches ADD COLUMN start_time TEXT;
-- Format: h:mm (string, no calculation needed)
