-- BLANK EG — Partners & Profit Sharing Migration
-- Run this in Supabase SQL Editor

-- 1. Partners table
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Capital snapshots (immutable per period)
CREATE TABLE IF NOT EXISTS capital_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  capital DECIMAL(12,2) NOT NULL CHECK (capital >= 0),
  ownership_percentage DECIMAL(5,4) NOT NULL CHECK (ownership_percentage >= 0 AND ownership_percentage <= 1),
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Partner contributions (individual capital additions)
CREATE TABLE IF NOT EXISTS partner_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  contribution_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Profit distributions (calculated per partner per period)
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
CREATE INDEX IF NOT EXISTS idx_capital_snapshots_partner_id ON capital_snapshots(partner_id);
CREATE INDEX IF NOT EXISTS idx_capital_snapshots_is_current ON capital_snapshots(is_current);
CREATE INDEX IF NOT EXISTS idx_capital_snapshots_effective_from ON capital_snapshots(effective_from);
CREATE INDEX IF NOT EXISTS idx_partner_contributions_partner_id ON partner_contributions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_contributions_date ON partner_contributions(contribution_date);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_partner_id ON profit_distributions(partner_id);
CREATE INDEX IF NOT EXISTS idx_profit_distributions_period ON profit_distributions(period_start, period_end);

-- Seed partners
INSERT INTO partners (name) VALUES ('Fady'), ('Kirollos'), ('Bola'), ('Tony')
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_distributions ENABLE ROW LEVEL SECURITY;

-- RLS policies: allow all authenticated/service-role access
CREATE POLICY "Allow all on partners" ON partners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on capital_snapshots" ON capital_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on partner_contributions" ON partner_contributions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on profit_distributions" ON profit_distributions FOR ALL USING (true) WITH CHECK (true);
