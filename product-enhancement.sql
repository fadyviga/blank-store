-- Product Enhancement: pricing, sorting, multiple images
-- Run this in Supabase SQL Editor. Safe to run multiple times.

ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_price NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Migrate existing data: set price = base_price where price is null
UPDATE products SET price = base_price WHERE price IS NULL;

-- Ensure images is TEXT[] if it's not already
ALTER TABLE products ALTER COLUMN images SET DATA TYPE TEXT[] USING COALESCE(images::TEXT[], '{}');

NOTIFY pgrst, 'reload schema';
