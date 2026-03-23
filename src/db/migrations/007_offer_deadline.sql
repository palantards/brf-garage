-- Add configurable offer deadline per association (default 48 hours)
ALTER TABLE associations ADD COLUMN offer_deadline_hours INT NOT NULL DEFAULT 48;
