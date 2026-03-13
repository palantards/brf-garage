CREATE TABLE spot_preferences (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID NOT NULL REFERENCES associations(id),
  user_id        UUID NOT NULL REFERENCES users(id),
  spot_id        UUID NOT NULL REFERENCES spots(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, spot_id)
);
