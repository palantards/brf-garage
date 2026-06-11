-- Migration 010: Application form flow + agreement type on assignments
-- Applied: 2026-06-11

CREATE TABLE applications (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id            UUID NOT NULL REFERENCES associations(id),
  token                     TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status                    TEXT NOT NULL DEFAULT 'form_sent',
  email                     TEXT NOT NULL,
  name                      TEXT,
  phone                     TEXT,
  apartment_number          TEXT,
  spot_type_preference      TEXT,
  agreement_type_preference TEXT,
  start_preference          TEXT,
  start_date                DATE,
  admin_notes               TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at              TIMESTAMPTZ,
  reviewed_at               TIMESTAMPTZ,
  reviewed_by               UUID REFERENCES users(id),
  completed_at              TIMESTAMPTZ
);

CREATE INDEX idx_applications_association ON applications(association_id);
CREATE INDEX idx_applications_token ON applications(token);
CREATE INDEX idx_applications_status ON applications(association_id, status);

ALTER TABLE spot_assignments ADD COLUMN agreement_type TEXT NOT NULL DEFAULT 'permanent';
