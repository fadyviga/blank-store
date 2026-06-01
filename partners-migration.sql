-- BLANK EG — Partners & Profit Sharing v2 Migration
-- Run this in Supabase SQL Editor

-- 1. Partners table
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Capital transactions (every contribution/withdrawal)
CREATE TABLE IF NOT EXISTS partner_capital_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('contribution', 'withdrawal', 'initial')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Profit distributions (calculated per partner per period)
CREATE TABLE IF NOT EXISTS profit_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  net_profit DECIMAL(12,2) NOT NULL,
  ownership_percentage DECIMAL(5,4) NOT NULL,
  profit_share DECIMAL(12,2) NOT NULL,
  distributed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_capital_tx_partner ON partner_capital_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_capital_tx_date ON partner_capital_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_partner_id ON profit_distributions(partner_id);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_period ON profit_distributions(period_start, period_end);

-- Seed partners
INSERT INTO partners (name) VALUES ('Fady'), ('Kirollos'), ('Bola'), ('Tony')
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_capital_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_distributions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all on partners" ON partners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on capital_transactions" ON partner_capital_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on profit_distributions" ON profit_distributions FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- OPTIONAL: Migrate existing data from v1 tables
-- Run these ONLY if capital_snapshots / partner_contributions exist with data
-- =====================================================

-- Migrate latest capital snapshot as initial transaction
-- INSERT INTO partner_capital_transactions (partner_id, type, amount, note, transaction_date, created_at)
-- SELECT cs.partner_id, 'initial', cs.capital, 'Migrated from capital snapshot', cs.effective_from::DATE, cs.created_at
-- FROM capital_snapshots cs
-- WHERE cs.is_current = true;

-- Migrate partner contributions as contribution transactions
-- INSERT INTO partner_capital_transactions (partner_id, type, amount, note, transaction_date, created_at)
-- SELECT pc.partner_id, 'contribution', pc.amount, pc.note, pc.contribution_date, pc.created_at
-- FROM partner_contributions pc;

-- Drop v1 tables (after confirming data migration)
-- DROP TABLE IF EXISTS capital_snapshots CASCADE;
-- DROP TABLE IF EXISTS partner_contributions CASCADE;
