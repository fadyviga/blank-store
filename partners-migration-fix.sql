-- BLANK EG — Partners Capital Snapshots Schema Fix
-- Run this in Supabase SQL Editor if you already ran the initial migration
-- but capital_snapshots is missing columns like 'capital' or 'is_current'.

-- 1. Ensure all columns exist (idempotent — safe to re-run)
ALTER TABLE capital_snapshots ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE CASCADE;
ALTER TABLE capital_snapshots ADD COLUMN IF NOT EXISTS capital DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (capital >= 0);
ALTER TABLE capital_snapshots ADD COLUMN IF NOT EXISTS ownership_percentage DECIMAL(5,4) NOT NULL DEFAULT 0 CHECK (ownership_percentage >= 0 AND ownership_percentage <= 1);
ALTER TABLE capital_snapshots ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true;
ALTER TABLE capital_snapshots ADD COLUMN IF NOT EXISTS effective_from DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE capital_snapshots ADD COLUMN IF NOT EXISTS effective_to DATE;
ALTER TABLE capital_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Change effective_from and effective_to to TIMESTAMPTZ
ALTER TABLE capital_snapshots ALTER COLUMN effective_from TYPE TIMESTAMPTZ USING effective_from::TIMESTAMPTZ;
ALTER TABLE capital_snapshots ALTER COLUMN effective_to TYPE TIMESTAMPTZ USING effective_to::TIMESTAMPTZ;

-- 3. Change is_current default from false to true
ALTER TABLE capital_snapshots ALTER COLUMN is_current SET DEFAULT true;

-- 4. Trigger: enforce at most one active (is_current = true) snapshot per partner
CREATE OR REPLACE FUNCTION ensure_single_current_capital_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current THEN
    UPDATE capital_snapshots
    SET is_current = false,
        effective_to = NEW.effective_from - INTERVAL '1 microsecond'
    WHERE partner_id = NEW.partner_id
      AND is_current = true
      AND id IS DISTINCT FROM NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_current_snapshot ON capital_snapshots;
CREATE TRIGGER trg_single_current_snapshot
  AFTER INSERT OR UPDATE OF is_current
  ON capital_snapshots
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION ensure_single_current_capital_snapshot();
