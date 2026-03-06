-- Migration 002: Add created_at to invite_tokens
-- Applied: 2026-03-06

ALTER TABLE invite_tokens ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
