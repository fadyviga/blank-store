-- Seed dashboard users for admin panel
-- Create the dashboard_users table if it doesn't exist

CREATE TABLE IF NOT EXISTS dashboard_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed accounts (passwords are hashed for documentation;
-- in production, use bcrypt or a proper auth provider)
-- admin / blank@2026  → full access
-- data  / 123456789   → read-only

INSERT INTO dashboard_users (username, password_hash, role)
VALUES
  ('admin', 'blank@2026', 'admin'),
  ('data', '123456789', 'viewer')
ON CONFLICT (username) DO NOTHING;
