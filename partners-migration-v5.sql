-- BLANK EG — Partner Accounting Reset (v5: clean baseline 20 May)
-- Run this in Supabase SQL Editor.
-- Wipes test data, seeds official opening capital, rebuilds snapshots.

-- ============================================================
-- STEP 1: Add is_test column to partner_transactions
-- ============================================================
ALTER TABLE partner_transactions
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;

-- ============================================================
-- STEP 2: Rename "Pola" → "Bola" if needed
-- ============================================================
UPDATE partners SET name = 'Bola' WHERE name = 'Pola';

-- ============================================================
-- STEP 3: Mark ALL existing transactions as test data
-- ============================================================
UPDATE partner_transactions SET is_test = TRUE;

-- ============================================================
-- STEP 4: Insert clean opening capital for 20 May
-- ============================================================
INSERT INTO partner_transactions (partner_id, amount, type, date, notes, is_test)
SELECT p.id, 3000, 'deposit', '2026-05-20T23:59:59Z', 'Opening capital', FALSE
FROM partners p WHERE p.name = 'Fady';

INSERT INTO partner_transactions (partner_id, amount, type, date, notes, is_test)
SELECT p.id, 3000, 'deposit', '2026-05-20T23:59:59Z', 'Opening capital', FALSE
FROM partners p WHERE p.name = 'Kirollos';

INSERT INTO partner_transactions (partner_id, amount, type, date, notes, is_test)
SELECT p.id, 1500, 'deposit', '2026-05-20T23:59:59Z', 'Opening capital', FALSE
FROM partners p WHERE p.name = 'Bola';

INSERT INTO partner_transactions (partner_id, amount, type, date, notes, is_test)
SELECT p.id, 1500, 'deposit', '2026-05-20T23:59:59Z', 'Opening capital', FALSE
FROM partners p WHERE p.name = 'Tony';

-- ============================================================
-- STEP 5: Clear ALL existing snapshots (cascade deletes items)
-- ============================================================
DELETE FROM partner_snapshots;

-- ============================================================
-- STEP 6: Generate fresh snapshot for 20 May
-- ============================================================
DO $$
DECLARE
  snap_id UUID;
  total DECIMAL(14,2);
  rec RECORD;
BEGIN
  -- Compute total from clean (non-test) transactions
  SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0)
    INTO total
    FROM partner_transactions
    WHERE is_test IS NOT TRUE;

  IF total > 0 THEN
    INSERT INTO partner_snapshots (total_capital, snapshot_date)
    VALUES (total, '2026-05-20T23:59:59Z')
    RETURNING id INTO snap_id;

    FOR rec IN
      SELECT partner_id, COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) AS capital
      FROM partner_transactions
      WHERE is_test IS NOT TRUE
      GROUP BY partner_id
      HAVING COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) > 0
    LOOP
      INSERT INTO partner_snapshot_items (snapshot_id, partner_id, capital, percentage)
      VALUES (snap_id, rec.partner_id, rec.capital, rec.capital / total);
    END LOOP;
  END IF;
END $$;
