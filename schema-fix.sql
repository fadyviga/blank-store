-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Or via psql: psql "$DATABASE_URL" -f schema-fix.sql
--
-- This migration adds all columns expected by the dashboard & API code
-- that are missing from the current orders table.

-- Add missing columns to orders (each with IF NOT EXISTS for idempotency)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS display_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- Create order_items table (needed for relational item storage)
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

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Update existing orders to have a display_id based on their id
UPDATE orders SET display_id = 'BLK-' || LPAD(id::TEXT, 6, '0') WHERE display_id IS NULL;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
