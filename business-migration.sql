-- ===================================================
-- Business Management & Profitability System
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ===================================================

-- ===================================================
-- 1. COUPON SUPPORT
-- ===================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- ===================================================
-- 2. PURCHASES (inventory procurement from suppliers)
-- ===================================================
CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  supplier_name TEXT NOT NULL DEFAULT '',
  notes TEXT DEFAULT '',
  total_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================================================
-- 3. PURCHASE ITEMS (line items for each purchase)
-- ===================================================
CREATE TABLE IF NOT EXISTS purchase_items (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  color_id UUID REFERENCES product_colors(id) ON DELETE SET NULL,
  size_id UUID REFERENCES product_sizes(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON purchase_items(product_id);

-- ===================================================
-- 4. EXPENSES (advertising + operational costs)
-- ===================================================
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other',
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- ===================================================
-- 5. COST PRICE on product_variants
-- ===================================================
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;

-- ===================================================
-- 6. SEED DEFAULT COUPON: BLANK50
-- ===================================================
INSERT INTO orders (coupon_code, discount_amount)
SELECT 'BLANK50', 50
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE coupon_code = 'BLANK50')
LIMIT 0;

-- Actually, create a dedicated coupons table for validation
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  min_order_value NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT 0,
  use_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO coupons (code, discount_type, discount_value, is_active)
SELECT 'BLANK50', 'fixed', 50, true
WHERE NOT EXISTS (SELECT 1 FROM coupons WHERE code = 'BLANK50');

NOTIFY pgrst, 'reload schema';
