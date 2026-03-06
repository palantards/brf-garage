-- BRF Garage Schema
-- Multi-tenant: all tables scoped by association_id

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Associations (tenants)
CREATE TABLE associations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,  -- used in URLs
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id  UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  name            TEXT,
  role            TEXT NOT NULL DEFAULT 'resident' CHECK (role IN ('resident', 'admin')),
  password_hash   TEXT,         -- set when resident accepts invite
  invited_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at       TIMESTAMPTZ,  -- set when they accept invite and set password
  UNIQUE (association_id, email)
);

-- Invite tokens (for email-based onboarding)
CREATE TABLE invite_tokens (
  token           TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(32), 'hex'),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  used_at         TIMESTAMPTZ
);

-- Garage spots
CREATE TABLE spots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id  UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  identifier      TEXT NOT NULL,  -- e.g. "A12", "P3"
  description     TEXT,
  is_available    BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (association_id, identifier)
);

-- Queue entries
CREATE TABLE queue_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id  UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at         TIMESTAMPTZ,  -- set when user leaves queue or is assigned a spot
  UNIQUE (association_id, user_id, left_at)  -- one active entry per user (left_at NULL = active)
);

-- Spot offers
CREATE TABLE spot_offers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id  UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  spot_id         UUID NOT NULL REFERENCES spots(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  queue_entry_id  UUID NOT NULL REFERENCES queue_entries(id),
  offered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  responded_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired'))
);

-- Spot assignments (the result of an accepted offer)
CREATE TABLE spot_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id  UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  spot_id         UUID NOT NULL REFERENCES spots(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ  -- set when spot is returned
);

-- Audit log (append-only, never updated or deleted)
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id  UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES users(id),  -- NULL for system actions
  event_type      TEXT NOT NULL,
  -- event_type values:
  --   queue.joined, queue.left
  --   offer.sent, offer.accepted, offer.declined, offer.expired
  --   spot.assigned, spot.returned
  --   admin.override
  --   user.invited, user.activated
  payload         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX ON users (association_id);
CREATE INDEX ON queue_entries (association_id, left_at) WHERE left_at IS NULL;
CREATE INDEX ON spot_offers (association_id, status) WHERE status = 'pending';
CREATE INDEX ON spot_assignments (spot_id) WHERE ended_at IS NULL;
CREATE INDEX ON audit_log (association_id, created_at DESC);
