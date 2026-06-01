-- BLANK EG — Partners & Profit Sharing Schema
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_capital_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capital_tx_partner ON partner_capital_transactions(partner_id);

INSERT INTO partners (name) VALUES ('Fady'), ('Kirollos'), ('Bola'), ('Tony')
ON CONFLICT DO NOTHING;

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_capital_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on partners" ON partners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on capital_transactions" ON partner_capital_transactions FOR ALL USING (true) WITH CHECK (true);

-- Drop obsolete tables (only if they exist and you've migrated data)
-- DROP TABLE IF EXISTS profit_distributions CASCADE;
-- DROP TABLE IF EXISTS capital_snapshots CASCADE;
-- DROP TABLE IF EXISTS partner_contributions CASCADE;
