CREATE TABLE IF NOT EXISTS phase_two_capacity_holds (
  request_key text NOT NULL,
  option_id text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL CHECK (status IN ('pending')) DEFAULT 'pending',
  airtable_saved boolean NOT NULL DEFAULT false,
  airtable_saved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (request_key, option_id)
);

CREATE INDEX IF NOT EXISTS phase_two_capacity_holds_option_expiry_idx
  ON phase_two_capacity_holds (option_id, expires_at)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS phase_two_capacity_limits (
  resource_id text PRIMARY KEY,
  capacity integer NOT NULL CHECK (capacity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
