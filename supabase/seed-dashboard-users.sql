-- Admin dashboard users table
-- Run this migration in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial accounts
-- Passwords are hashed using Node.js crypto.scryptSync (salt:hash format)
INSERT INTO admin_users (username, password_hash, role) VALUES
  ('admin', '83725399088ae092fb3cc1074c77a893:caede31f212cf18984596be81d62a7241812bd5e026370b01991a3855fa3677fddb99783ff66632659673f3d37e014ef1245d72e21c9b08a24102da132d8a672', 'admin'),
  ('data', 'a44415658dcbcd95ddd13e1138a47c88:e6669c4166ead2727edf9f7a60115de4047a2c83d0560720f6034c9828b466908b8b52e938c494c519c6fdb483d601deb98274bf9ae288ec91ef39f913783ae3', 'viewer')
ON CONFLICT (username) DO NOTHING;
