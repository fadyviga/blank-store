-- ============================================================
-- BLANK EG — Schema Migration v2: Products, Variants, Inventory
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  base_price NUMERIC NOT NULL DEFAULT 395,
  category TEXT DEFAULT 'tees',
  image TEXT DEFAULT '',
  images JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 2. COLORS
CREATE TABLE IF NOT EXISTS product_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex TEXT DEFAULT '#000000',
  image TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  UNIQUE(product_id, name)
);

ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;

-- 3. SIZES
CREATE TABLE IF NOT EXISTS product_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0
);

ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;

-- Insert default sizes
INSERT INTO product_sizes (label, sort_order) VALUES
  ('M', 1),
  ('L', 2),
  ('XL', 3),
  ('XXL', 4)
ON CONFLICT (label) DO NOTHING;

-- 4. VARIANTS
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_id UUID NOT NULL REFERENCES product_colors(id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES product_sizes(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  price NUMERIC,
  stock INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, color_id, size_id)
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_color ON product_variants(color_id);
CREATE INDEX idx_variants_size ON product_variants(size_id);

-- 5. INVENTORY LOGS
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_inventory_logs_variant ON inventory_logs(variant_id);
CREATE INDEX idx_inventory_logs_order ON inventory_logs(order_id);

-- 6. Add notes/tracking columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT DEFAULT '';

-- 7. RLS POLICIES

-- Products - public read, admin write
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  USING (is_admin());

-- Colors - public read, admin write
CREATE POLICY "Anyone can view colors"
  ON product_colors FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage colors"
  ON product_colors FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update colors"
  ON product_colors FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete colors"
  ON product_colors FOR DELETE
  USING (is_admin());

-- Sizes - public read, admin write
CREATE POLICY "Anyone can view sizes"
  ON product_sizes FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sizes"
  ON product_sizes FOR ALL
  USING (is_admin());

-- Variants - public read, admin write
CREATE POLICY "Anyone can view variants"
  ON product_variants FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage variants"
  ON product_variants FOR ALL
  USING (is_admin());

-- Inventory logs - admin only
CREATE POLICY "Admins can view inventory logs"
  ON inventory_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert inventory logs"
  ON inventory_logs FOR INSERT
  WITH CHECK (is_admin());

-- 8. Function: Decrease stock on order
CREATE OR REPLACE FUNCTION decrease_stock_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  item_record RECORD;
  v_color_id UUID;
  v_size_id UUID;
  v_variant_id UUID;
BEGIN
  FOR item_record IN
    SELECT oi.product_name, oi.color, oi.size, oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id
  LOOP
    SELECT pc.id INTO v_color_id
    FROM product_colors pc
    JOIN products p ON p.id = pc.product_id
    WHERE p.name = item_record.product_name AND pc.name = item_record.color
    LIMIT 1;

    SELECT ps.id INTO v_size_id
    FROM product_sizes ps
    WHERE ps.label = item_record.size
    LIMIT 1;

    IF v_color_id IS NOT NULL AND v_size_id IS NOT NULL THEN
      SELECT pv.id INTO v_variant_id
      FROM product_variants pv
      WHERE pv.product_id = (SELECT id FROM products WHERE name = item_record.product_name LIMIT 1)
        AND pv.color_id = v_color_id
        AND pv.size_id = v_size_id
      LIMIT 1;

      IF v_variant_id IS NOT NULL THEN
        UPDATE product_variants
        SET stock = stock - item_record.quantity,
            updated_at = now()
        WHERE id = v_variant_id;

        INSERT INTO inventory_logs (variant_id, change, reason, order_id)
        VALUES (v_variant_id, -(item_record.quantity), 'order_placed', NEW.id);
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_order_insert
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'pending' OR NEW.status = 'confirmed')
  EXECUTE FUNCTION decrease_stock_on_order();

-- 9. Function: Restore stock on cancel/refund
CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  item_record RECORD;
  v_variant_id UUID;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    FOR item_record IN
      SELECT oi.product_name, oi.color, oi.size, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = NEW.id
    LOOP
      SELECT pv.id INTO v_variant_id
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      JOIN product_colors pc ON pc.id = pv.color_id
      JOIN product_sizes ps ON ps.id = pv.size_id
      WHERE p.name = item_record.product_name
        AND pc.name = item_record.color
        AND ps.label = item_record.size
      LIMIT 1;

      IF v_variant_id IS NOT NULL THEN
        UPDATE product_variants
        SET stock = stock + item_record.quantity,
            updated_at = now()
        WHERE id = v_variant_id;

        INSERT INTO inventory_logs (variant_id, change, reason, order_id)
        VALUES (v_variant_id, item_record.quantity, 'order_cancelled', NEW.id);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_order_update
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled')
  EXECUTE FUNCTION restore_stock_on_cancel();

-- 10. Seed default product
INSERT INTO products (id, name, description, base_price, category, image)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Oversized Tee',
  'Premium oversized essential tee. 100% cotton, relaxed fit.',
  395,
  'tees',
  '/colors/black.jpeg'
) ON CONFLICT (id) DO NOTHING;

-- Seed colors for the default product
INSERT INTO product_colors (product_id, name, hex, image, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Black', '#000000', '/colors/black.jpeg', 1),
  ('00000000-0000-0000-0000-000000000001', 'White', '#FFFFFF', '/colors/white.jpeg', 2),
  ('00000000-0000-0000-0000-000000000001', 'Blue', '#1E3A5F', '/colors/blue.jpeg', 3),
  ('00000000-0000-0000-0000-000000000001', 'Green', '#2D5016', '/colors/green.jpeg', 4),
  ('00000000-0000-0000-0000-000000000001', 'Gray', '#808080', '/colors/gray.jpeg', 5),
  ('00000000-0000-0000-0000-000000000001', 'Brown', '#4A2C2A', '/colors/brown.jpeg', 6),
  ('00000000-0000-0000-0000-000000000001', 'Navy', '#1B2A44', '/colors/navy.jpeg', 7),
  ('00000000-0000-0000-0000-000000000001', 'Burgundy', '#4C1C24', '/colors/burgundy.jpeg', 8),
  ('00000000-0000-0000-0000-000000000001', 'Beige', '#D4C5A9', '/colors/beige.jpeg', 9)
ON CONFLICT (product_id, name) DO NOTHING;
