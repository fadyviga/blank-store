-- BLANK EG — Partners & Profit Sharing Schema (v3: complete from scratch)
-- Run this in Supabase SQL Editor.
-- Handles both fresh installs and upgrades from existing partners/partner_transactions tables.

-- ============================================================
-- STEP 1: Add date column to partner_transactions (if missing)
-- ============================================================
ALTER TABLE partner_transactions
  ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ;

-- Backfill date = created_at for existing rows that don't have a date yet
UPDATE partner_transactions SET date = created_at WHERE date IS NULL;

-- ============================================================
-- STEP 2: Create partner_snapshots table
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_capital DECIMAL(14,2) NOT NULL DEFAULT 0,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_date ON partner_snapshots(snapshot_date);

-- ============================================================
-- STEP 3: Create partner_snapshot_items table
-- ============================================================
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

-- ============================================================
-- STEP 4: Seed initial snapshot from existing transactions
-- ============================================================
DO $$
DECLARE
  snap_id UUID;
  total DECIMAL(14,2);
BEGIN
  -- Compute total capital from all transactions
  SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0)
    INTO total
    FROM partner_transactions;

  -- Only create a snapshot if there's any capital
  IF total > 0 THEN
    INSERT INTO partner_snapshots (total_capital, snapshot_date)
    VALUES (total, NOW())
    RETURNING id INTO snap_id;

    -- Insert per-partner capital and percentage
    INSERT INTO partner_snapshot_items (snapshot_id, partner_id, capital, percentage)
    SELECT
      snap_id,
      partner_id,
      COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) AS capital,
      COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) / total AS percentage
    FROM partner_transactions
    GROUP BY partner_id
    HAVING COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) > 0;
  END IF;
END $$;

-- ============================================================
-- STEP 5: Enable RLS and create policies
-- ============================================================
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_snapshot_items ENABLE ROW LEVEL SECURITY;

-- Drop policies first to allow re-running
DROP POLICY IF EXISTS "Allow all on partners" ON partners;
DROP POLICY IF EXISTS "Allow all on partner_transactions" ON partner_transactions;
DROP POLICY IF EXISTS "Allow all on partner_snapshots" ON partner_snapshots;
DROP POLICY IF EXISTS "Allow all on partner_snapshot_items" ON partner_snapshot_items;

CREATE POLICY "Allow all on partners" ON partners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on partner_transactions" ON partner_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on partner_snapshots" ON partner_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on partner_snapshot_items" ON partner_snapshot_items FOR ALL USING (true) WITH CHECK (true);
