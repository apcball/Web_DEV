-- Run this AFTER creating tables with supabase-init.sql
-- This sets up Row Level Security policies to allow API access

-- Enable RLS on both tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Create policies for products table
CREATE POLICY "Allow all operations on products" ON public.products
FOR ALL USING (true) WITH CHECK (true);

-- Create policies for reservations table
CREATE POLICY "Allow all operations on reservations" ON public.reservations
FOR ALL USING (true) WITH CHECK (true);

-- Insert sample data for testing
INSERT INTO public.products (sku, name, category, price, quantity) VALUES
('BTH-0001', 'Single-Handle Basin Faucet', 'Faucet', 1290, 25),
('BTH-0002', 'Wall-Mounted Shower Set', 'Shower', 2590, 18),
('BTH-0003', 'One-Piece Toilet 4.8L', 'Toilet', 6490, 10),
('BTH-0004', 'Pedestal Basin 50cm', 'Basin', 1890, 14)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  quantity = EXCLUDED.quantity;