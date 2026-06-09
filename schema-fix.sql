-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Or via psql: psql "$DATABASE_URL" -f schema-fix.sql
--
-- This migration adds ALL tables and columns expected by the Blank EG store.
-- It is safe to run multiple times (uses IF NOT EXISTS).

-- ===================================================
-- 1. FIX ORDERS TABLE - Add all missing columns
-- ===================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS display_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;

UPDATE orders SET display_id = 'BLK-' || LPAD(id::TEXT, 6, '0') WHERE display_id IS NULL;

-- ===================================================
-- 2. ORDER ITEMS TABLE (normalized item storage)
-- ===================================================
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  size TEXT,
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ===================================================
-- 3. PRODUCTS
-- ===================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  base_price NUMERIC NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'tees',
  image TEXT DEFAULT '',
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===================================================
-- 4. PRODUCT COLORS
-- ===================================================
CREATE TABLE IF NOT EXISTS product_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex TEXT DEFAULT '#000000',
  image TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================================================
-- 5. PRODUCT SIZES
-- ===================================================
CREATE TABLE IF NOT EXISTS product_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================================================
-- 6. PRODUCT VARIANTS (color × size matrix)
-- ===================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  color_id UUID REFERENCES product_colors(id) ON DELETE CASCADE,
  size_id UUID REFERENCES product_sizes(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  price NUMERIC,
  stock INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, color_id, size_id)
);

-- ===================================================
-- 7. INVENTORY LOGS
-- ===================================================
CREATE TABLE IF NOT EXISTS inventory_logs (
  id SERIAL PRIMARY KEY,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  order_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant ON inventory_logs(variant_id);

-- ===================================================
-- 8. PROFILES (user profiles linked to auth)
-- ===================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  phone TEXT,
  name TEXT,
  role TEXT DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================================================
-- 9. CART ITEMS (table already exists, ensure schema)
-- ===================================================
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- ===================================================
-- 10. SEED DATA - Default product with 9 colors + 4 sizes
-- ===================================================
INSERT INTO products (id, name, description, base_price, category, image)
SELECT gen_random_uuid(), 'Oversized Essential Tee', 'Premium oversized cotton tee. Relaxed fit, dropped shoulders.', 495, 'tees', '/placeholder.svg'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Oversized Essential Tee');

DO $$
DECLARE
  prod_id UUID;
BEGIN
  SELECT id INTO prod_id FROM products WHERE name = 'Oversized Essential Tee' LIMIT 1;

  -- Insert colors if they don't exist
  INSERT INTO product_colors (product_id, name, hex, image, sort_order)
  SELECT prod_id, 'Black', '#0a0a0a', '/placeholder.svg', 1
  WHERE NOT EXISTS (SELECT 1 FROM product_colors WHERE product_id = prod_id AND name = 'Black');

  INSERT INTO product_colors (product_id, name, hex, image, sort_order)
  SELECT prod_id, 'White', '#f5f5f5', '/placeholder.svg', 2
  WHERE NOT EXISTS (SELECT 1 FROM product_colors WHERE product_id = prod_id AND name = 'White');

  INSERT INTO product_colors (product_id, name, hex, image, sort_order)
  SELECT prod_id, 'Navy', '#1a2744', '/placeholder.svg', 3
  WHERE NOT EXISTS (SELECT 1 FROM product_colors WHERE product_id = prod_id AND name = 'Navy');

  INSERT INTO product_colors (product_id, name, hex, image, sort_order)
  SELECT prod_id, 'Gray', '#6b7280', '/placeholder.svg', 4
  WHERE NOT EXISTS (SELECT 1 FROM product_colors WHERE product_id = prod_id AND name = 'Gray');

  INSERT INTO product_colors (product_id, name, hex, image, sort_order)
  SELECT prod_id, 'Burgundy', '#800020', '/placeholder.svg', 5
  WHERE NOT EXISTS (SELECT 1 FROM product_colors WHERE product_id = prod_id AND name = 'Burgundy');

  INSERT INTO product_colors (product_id, name, hex, image, sort_order)
  SELECT prod_id, 'Green', '#2d5a27', '/placeholder.svg', 6
  WHERE NOT EXISTS (SELECT 1 FROM product_colors WHERE product_id = prod_id AND name = 'Green');

  INSERT INTO product_colors (product_id, name, hex, image, sort_order)
  SELECT prod_id, 'Brown', '#4a3728', '/placeholder.svg', 7
  WHERE NOT EXISTS (SELECT 1 FROM product_colors WHERE product_id = prod_id AND name = 'Brown');

  INSERT INTO product_colors (product_id, name, hex, image, sort_order)
  SELECT prod_id, 'Blue', '#1e3a5f', '/placeholder.svg', 8
  WHERE NOT EXISTS (SELECT 1 FROM product_colors WHERE product_id = prod_id AND name = 'Blue');

  INSERT INTO product_colors (product_id, name, hex, image, sort_order)
  SELECT prod_id, 'Beige', '#e8d5b7', '/placeholder.svg', 9
  WHERE NOT EXISTS (SELECT 1 FROM product_colors WHERE product_id = prod_id AND name = 'Beige');

  -- Insert sizes
  INSERT INTO product_sizes (label, sort_order)
  SELECT 'M', 1 WHERE NOT EXISTS (SELECT 1 FROM product_sizes WHERE label = 'M');
  INSERT INTO product_sizes (label, sort_order)
  SELECT 'L', 2 WHERE NOT EXISTS (SELECT 1 FROM product_sizes WHERE label = 'L');
  INSERT INTO product_sizes (label, sort_order)
  SELECT 'XL', 3 WHERE NOT EXISTS (SELECT 1 FROM product_sizes WHERE label = 'XL');
  INSERT INTO product_sizes (label, sort_order)
  SELECT '2XL', 4 WHERE NOT EXISTS (SELECT 1 FROM product_sizes WHERE label = '2XL');
  INSERT INTO product_sizes (label, sort_order)
  SELECT '3XL', 5 WHERE NOT EXISTS (SELECT 1 FROM product_sizes WHERE label = '3XL');

  -- Create variants for all color × size combinations
  INSERT INTO product_variants (product_id, color_id, size_id, sku, stock)
  SELECT
    prod_id,
    pc.id,
    ps.id,
    UPPER(CONCAT(LEFT(REPLACE(prod_id::TEXT, '-', ''), 4), '-', LEFT(REPLACE(pc.id::TEXT, '-', ''), 4), '-', LEFT(REPLACE(ps.id::TEXT, '-', ''), 4))),
    0
  FROM product_colors pc
  CROSS JOIN product_sizes ps
  WHERE pc.product_id = prod_id
  AND NOT EXISTS (
    SELECT 1 FROM product_variants pv
    WHERE pv.product_id = prod_id AND pv.color_id = pc.id AND pv.size_id = ps.id
  );
END $$;

-- ===================================================
-- 11. Notify PostgREST to reload schema cache
-- ===================================================
NOTIFY pgrst, 'reload schema';
