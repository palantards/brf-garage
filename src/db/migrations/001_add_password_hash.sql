-- Migration 001: Add password_hash to users
-- Applied: 2026-03-06

ALTER TABLE users ADD COLUMN password_hash TEXT;
