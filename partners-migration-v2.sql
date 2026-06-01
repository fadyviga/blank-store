-- BLANK EG — Historical Partner Ownership & Profit Allocation (v4)
-- Run this in Supabase SQL Editor

-- Add date column to transactions for custom transaction dates
ALTER TABLE partner_transactions ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ;

-- Add snapshot_date to snapshots for timeline-based lookup
ALTER TABLE partner_snapshots ADD COLUMN IF NOT EXISTS snapshot_date TIMESTAMPTZ;

-- Update existing records: set date = created_at where null
UPDATE partner_transactions SET date = created_at WHERE date IS NULL;
UPDATE partner_snapshots SET snapshot_date = created_at WHERE snapshot_date IS NULL;
