-- 1. Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Create Products Table (if not exists)
CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric(10, 2) NOT NULL DEFAULT 0,
  image_url text,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Add Location to Stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;

-- 4. Enable RLS (and add basic policies for now)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow read access to all for products/categories
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
-- Allow store owners to manage their own products (simplified for now to "authenticated" or "admin", strict RLS later)
CREATE POLICY "Admins manage all" ON public.products FOR ALL USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));
CREATE POLICY "Admins manage all categories" ON public.categories FOR ALL USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));


-- 5. Seed Data (Cairo)
UPDATE public.stores
SET 
  latitude = 30.0444, 
  longitude = 31.2357,
  address = 'Cairo, Egypt',
  description = 'Best supermarket in Cairo',
  opening_time = '09:00',
  closing_time = '23:00',
  is_active = true,
  status = 'approved'
WHERE name = 'SecureForce Market';

-- 6. Insert Products
DO $$
DECLARE
  store_id_var uuid;
  cat_beverages uuid;
  cat_snacks uuid;
BEGIN
  SELECT id INTO store_id_var FROM public.stores WHERE name = 'SecureForce Market' LIMIT 1;
  
  IF store_id_var IS NOT NULL THEN
    -- Categories
    INSERT INTO public.categories (store_id, name) VALUES (store_id_var, 'Beverages') 
    ON CONFLICT DO NOTHING RETURNING id INTO cat_beverages;
    
    IF cat_beverages IS NULL THEN
        SELECT id INTO cat_beverages FROM public.categories WHERE store_id = store_id_var AND name = 'Beverages';
    END IF;

    INSERT INTO public.categories (store_id, name) VALUES (store_id_var, 'Snacks') 
    ON CONFLICT DO NOTHING RETURNING id INTO cat_snacks;

    IF cat_snacks IS NULL THEN
        SELECT id INTO cat_snacks FROM public.categories WHERE store_id = store_id_var AND name = 'Snacks';
    END IF;

    -- Products
    INSERT INTO public.products (store_id, category_id, name, description, price, is_available)
    VALUES (store_id_var, cat_beverages, 'Pepsi Can 330ml', 'Refreshing cola drink', 15.00, true);

    INSERT INTO public.products (store_id, category_id, name, description, price, is_available)
    VALUES (store_id_var, cat_beverages, 'Mineral Water 600ml', 'Natural mineral water', 5.00, true);

    INSERT INTO public.products (store_id, category_id, name, description, price, is_available)
    VALUES (store_id_var, cat_snacks, 'Potato Chips', 'Crunchy salted chips', 10.00, true);
    
    INSERT INTO public.products (store_id, category_id, name, description, price, is_available)
    VALUES (store_id_var, cat_snacks, 'Chocolate Bar', 'Milk chocolate', 25.00, true);
    
    INSERT INTO public.products (store_id, category_id, name, description, price, is_available)
    VALUES (store_id_var, cat_snacks, 'Gum', 'Mint Gum', 2.00, true);

  END IF;
END $$;
