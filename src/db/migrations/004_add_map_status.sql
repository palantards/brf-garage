-- Migration 004: Add map processing status to associations
-- Applied: 2026-03-08
-- Values: 'unconfigured' | 'pending' | 'ready'

ALTER TABLE associations ADD COLUMN map_status TEXT NOT NULL DEFAULT 'unconfigured';
