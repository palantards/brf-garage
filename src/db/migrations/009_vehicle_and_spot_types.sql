-- Add vehicle_type to users: 'car', 'mc', or 'electric_car'
ALTER TABLE users ADD COLUMN vehicle_type TEXT NOT NULL DEFAULT 'car';

-- Allow 'electric' as a spot map_type (no constraint exists — just documenting).
-- Existing values: 'car' (standard), 'mc'. New: 'electric' (car spot with charger).

-- Association-level setting: when true, EV spots are offered to electric_car users
-- first, falling back to any car user if no EV owner is in queue.
-- When false, EV spots are offered to any car user with no priority.
ALTER TABLE associations ADD COLUMN ev_priority_only BOOLEAN NOT NULL DEFAULT true;
