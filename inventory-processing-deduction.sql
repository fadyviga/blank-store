-- ===================================================
-- Replace old "deduct on creation" trigger with
-- new "deduct only when status -> processing" trigger
-- ===================================================

-- Drop the OLD trigger that deducted stock on order INSERT
DROP TRIGGER IF EXISTS after_order_insert ON orders;
DROP FUNCTION IF EXISTS decrease_stock_on_order;

-- Create new function: deduct stock ONLY when status becomes 'processing'
CREATE OR REPLACE FUNCTION deduct_stock_on_processing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rec RECORD;
  v_product_id UUID;
  v_color_id UUID;
  v_size_id UUID;
  v_variant_id UUID;
BEGIN
  -- Only deduct when status transitions TO 'processing'
  IF NEW.status = 'processing' AND (OLD.status IS DISTINCT FROM 'processing') THEN
    FOR rec IN
      SELECT
        (item->>'name')::TEXT AS product_name,
        (item->>'color')::TEXT AS color,
        (item->>'size')::TEXT AS size,
        (item->>'quantity')::INTEGER AS quantity
      FROM jsonb_array_elements(
        CASE
          WHEN NEW.items::TEXT LIKE '[%' THEN NEW.items::jsonb
          ELSE '[]'::jsonb
        END
      ) AS item
    LOOP
      -- Find product
      SELECT p.id INTO v_product_id FROM products p WHERE p.name = rec.product_name LIMIT 1;
      CONTINUE WHEN v_product_id IS NULL;

      -- Find color
      SELECT pc.id INTO v_color_id
      FROM product_colors pc
      WHERE pc.product_id = v_product_id AND pc.name = rec.color
      LIMIT 1;
      CONTINUE WHEN v_color_id IS NULL;

      -- Find size
      SELECT ps.id INTO v_size_id FROM product_sizes ps WHERE ps.label = rec.size LIMIT 1;
      CONTINUE WHEN v_size_id IS NULL;

      -- Find variant
      SELECT pv.id INTO v_variant_id
      FROM product_variants pv
      WHERE pv.product_id = v_product_id
        AND pv.color_id = v_color_id
        AND pv.size_id = v_size_id
      LIMIT 1;
      CONTINUE WHEN v_variant_id IS NULL;

      -- Deduct stock (allow negative for backorders)
      UPDATE product_variants
      SET stock = stock - rec.quantity,
          updated_at = now()
      WHERE id = v_variant_id;

      -- Log the change
      INSERT INTO inventory_logs (variant_id, change, reason, order_id)
      VALUES (v_variant_id, -(rec.quantity), 'order_processing', NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Create new trigger on UPDATE when status changes to 'processing'
CREATE TRIGGER after_order_status_processing
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'processing')
  EXECUTE FUNCTION deduct_stock_on_processing();

-- ===================================================
NOTIFY pgrst, 'reload schema';
