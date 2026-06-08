-- Product Enhancement: pricing, sorting, multiple images
-- Run this in Supabase SQL Editor. Safe to run multiple times.

ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_price NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Migrate existing data: set price = base_price where price is null
UPDATE products SET price = base_price WHERE price IS NULL;

-- Storefront pricing: 495 EGP sale / 550 EGP compare
UPDATE products SET base_price = 495, price = 495, compare_price = 550;

-- Ensure images is TEXT[] if it's not already
ALTER TABLE products ALTER COLUMN images SET DATA TYPE TEXT[] USING COALESCE(images::TEXT[], '{}');

NOTIFY pgrst, 'reload schema';
