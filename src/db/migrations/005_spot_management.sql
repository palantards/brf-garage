-- Add ending_at to spot_assignments: admin sets this when a resident gives notice.
-- A spot with an active assignment AND a non-null ending_at is shown as "upcoming".
ALTER TABLE spot_assignments ADD COLUMN ending_at TIMESTAMPTZ;

-- Add available flag to spots: false means the spot is physically unavailable
-- (e.g. under renovation) and should be hidden from queue logic and the map.
ALTER TABLE spots ADD COLUMN available BOOLEAN NOT NULL DEFAULT true;
