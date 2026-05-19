-- Fix: Add missing customer_address column to existing orders table
-- Run this in Supabase SQL Editor if you get:
--   "Could not find the 'customer_address' column of 'orders' in the schema cache"

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT DEFAULT '';
