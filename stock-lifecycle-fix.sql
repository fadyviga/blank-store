-- ===================================================
-- Add stock_processed column for idempotent stock mgmt
-- Drop DB trigger (replaced by application-level logic)
-- ===================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_processed BOOLEAN DEFAULT false;

-- Drop old DB-level triggers (handled at application level now)
DROP TRIGGER IF EXISTS after_order_status_processing ON orders;
DROP FUNCTION IF EXISTS deduct_stock_on_processing;
DROP TRIGGER IF EXISTS after_order_insert ON orders;
DROP FUNCTION IF EXISTS decrease_stock_on_order;

NOTIFY pgrst, 'reload schema';
