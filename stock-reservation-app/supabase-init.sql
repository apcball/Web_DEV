-- supabase-init.sql
-- Run this in Supabase SQL editor (or psql) to create the required tables.

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id serial PRIMARY KEY,
  sku text UNIQUE NOT NULL,
  name text,
  category text,
  price numeric,
  quantity integer DEFAULT 0
);

-- Create reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id serial PRIMARY KEY,
  product_sku text NOT NULL,
  customer_name text NOT NULL,
  reserved_quantity integer NOT NULL,
  status text DEFAULT 'pending',
  discount numeric DEFAULT 0,
  vat numeric DEFAULT 0,
  sales_person text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Foreign key constraint (optional) - use if you want referential integrity
ALTER TABLE public.reservations
  ADD CONSTRAINT fk_reservations_product_sku
  FOREIGN KEY (product_sku) REFERENCES public.products (sku) ON DELETE SET NULL;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
CREATE INDEX IF NOT EXISTS idx_reservations_product_sku ON public.reservations (product_sku);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON public.reservations (created_at DESC);

-- Note: If you plan to have the backend perform inserts/updates/deletes, use a service_role key or set appropriate RLS policies.
