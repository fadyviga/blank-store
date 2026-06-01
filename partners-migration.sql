-- BLANK EG — Partners & Profit Sharing Schema (v3: Immutable Snapshots)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_tx_partner ON partner_transactions(partner_id);

CREATE TABLE IF NOT EXISTS partner_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_capital DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_snapshot_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES partner_snapshots(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  capital DECIMAL(12,2) NOT NULL DEFAULT 0,
  percentage DECIMAL(10,6) NOT NULL DEFAULT 0,
  UNIQUE(snapshot_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_snapshot_items_snapshot ON partner_snapshot_items(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_items_partner ON partner_snapshot_items(partner_id);

INSERT INTO partners (name) VALUES ('Fady'), ('Kirollos'), ('Bola'), ('Tony')
ON CONFLICT DO NOTHING;

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_snapshot_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on partners" ON partners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on partner_transactions" ON partner_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on partner_snapshots" ON partner_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on partner_snapshot_items" ON partner_snapshot_items FOR ALL USING (true) WITH CHECK (true);

-- Drop obsolete tables (only after migrating data)
-- DROP TABLE IF EXISTS partner_capital_transactions CASCADE;
-- DROP TABLE IF EXISTS capital_snapshots CASCADE;
-- DROP TABLE IF EXISTS partner_contributions CASCADE;
-- DROP TABLE IF EXISTS profit_distributions CASCADE;

-- Migrate existing transaction data (uncomment when ready):
-- INSERT INTO partner_transactions (partner_id, amount, type, created_at)
-- SELECT partner_id, amount, type, created_at FROM partner_capital_transactions;
