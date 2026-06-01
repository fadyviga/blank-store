-- Fix: Add missing columns to existing orders table
-- Run this in Supabase SQL Editor if you get schema cache errors.
-- Safe to run multiple times (uses IF NOT EXISTS).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_processed BOOLEAN DEFAULT FALSE;

-- Migrate existing data: copy delivery -> delivery_fee where delivery_fee is 0
UPDATE orders SET delivery_fee = delivery WHERE delivery_fee = 0 AND delivery IS NOT NULL;
-- Copy subtotal from existing value
UPDATE orders SET subtotal = total - COALESCE(delivery, 0) + COALESCE(discount_amount, 0) WHERE subtotal = 0 AND total > 0;

NOTIFY pgrst, 'reload schema';
