-- Add location columns to stores if they don't exist
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;

-- Update 'SecureForce Market' with Cairo location and details
UPDATE public.stores
SET 
  latitude = 30.0444, 
  longitude = 31.2357,
  address = 'Cairo, Egypt',
  description = 'Best supermarket in Cairo',
  opening_time = '09:00',
  closing_time = '23:00',
  is_active = true,
  status = 'approved' -- Ensure it is approved
WHERE name = 'SecureForce Market';

-- Insert generic categories for the store (safely)
-- We need the store ID. relying on name is safe for this context.
DO $$
DECLARE
  store_id uuid;
  cat_beverages uuid;
  cat_snacks uuid;
BEGIN
  SELECT id INTO store_id FROM public.stores WHERE name = 'SecureForce Market' LIMIT 1;
  
  IF store_id IS NOT NULL THEN
    -- 1. Create Categories
    INSERT INTO public.categories (store_id, name) VALUES (store_id, 'Beverages') 
    ON CONFLICT DO NOTHING RETURNING id INTO cat_beverages;
    
    -- If ON CONFLICT matched, we need to select it
    IF cat_beverages IS NULL THEN
        SELECT id INTO cat_beverages FROM public.categories WHERE store_id = store_id AND name = 'Beverages';
    END IF;

    INSERT INTO public.categories (store_id, name) VALUES (store_id, 'Snacks') 
    ON CONFLICT DO NOTHING RETURNING id INTO cat_snacks;

    IF cat_snacks IS NULL THEN
        SELECT id INTO cat_snacks FROM public.categories WHERE store_id = store_id AND name = 'Snacks';
    END IF;

    -- 2. Insert Products
    -- Pepsi
    INSERT INTO public.products (store_id, category_id, name, description, price, is_available)
    VALUES (store_id, cat_beverages, 'Pepsi Can 330ml', 'Refreshing cola drink', 15.00, true);

    -- Water
    INSERT INTO public.products (store_id, category_id, name, description, price, is_available)
    VALUES (store_id, cat_beverages, 'Mineral Water 600ml', 'Natural mineral water', 5.00, true);

    -- Chips
    INSERT INTO public.products (store_id, category_id, name, description, price, is_available)
    VALUES (store_id, cat_snacks, 'Potato Chips', 'Crunchy salted chips', 10.00, true);
    
    -- Chocolate
    INSERT INTO public.products (store_id, category_id, name, description, price, is_available)
    VALUES (store_id, cat_snacks, 'Chocolate Bar', 'Milk chocolate', 25.00, true);

  END IF;
END $$;
