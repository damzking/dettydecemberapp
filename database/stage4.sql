BEGIN;
CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  plan text NOT NULL CHECK (plan IN ('day','week','month')),
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL,
  reference text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','abandoned')),
  provider text NOT NULL,
  provider_id text UNIQUE,
  provider_payment_id text UNIQUE,
  mock_status text NOT NULL DEFAULT 'pending',
  pass_id text UNIQUE REFERENCES passes(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
COMMIT;
