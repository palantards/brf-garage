-- Migration 003: Add garage map layout columns
-- Applied: 2026-03-08

ALTER TABLE spots
  ADD COLUMN map_x      NUMERIC,
  ADD COLUMN map_y      NUMERIC,
  ADD COLUMN map_width  NUMERIC,
  ADD COLUMN map_height NUMERIC,
  ADD COLUMN map_type   TEXT NOT NULL DEFAULT 'car';

ALTER TABLE associations
  ADD COLUMN map_image_url TEXT;
