-- Migration 011: Resignation form flow
-- Applied: 2026-06-11

CREATE TABLE resignations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id      UUID NOT NULL REFERENCES associations(id),
  spot_assignment_id  UUID NOT NULL REFERENCES spot_assignments(id),
  token               TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status              TEXT NOT NULL DEFAULT 'form_sent',
  email               TEXT NOT NULL,
  resident_name       TEXT,
  spot_identifier     TEXT NOT NULL,
  agreement_type      TEXT NOT NULL,
  reason              TEXT,
  preferred_end_date  DATE,
  admin_notes         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at        TIMESTAMPTZ,
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID REFERENCES users(id),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_resignations_association ON resignations(association_id);
CREATE INDEX idx_resignations_token ON resignations(token);
CREATE INDEX idx_resignations_status ON resignations(association_id, status);
