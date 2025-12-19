-- Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES auth.users(id),
  store_id uuid REFERENCES public.stores(id),
  total_amount numeric(10, 2) NOT NULL,
  delivery_fee numeric(10, 2) NOT NULL,
  delivery_address text NOT NULL,
  delivery_lat double precision,
  delivery_lng double precision,
  driver_id uuid REFERENCES public.drivers(id),
  status text NOT NULL DEFAULT 'pending', -- pending, preparing, ready, out_for_delivery, delivered, cancelled
  notes text,
  rating integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Policies
-- Customer can create orders
CREATE POLICY "Customers can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Customer can select own orders
CREATE POLICY "Customers can view own orders" ON public.orders FOR SELECT USING (auth.uid() = customer_id);

-- Stores can view orders for their store
CREATE POLICY "Store owners view orders" ON public.orders FOR SELECT USING (
  auth.uid() IN (SELECT owner_id FROM public.stores WHERE id = store_id)
);

-- Admins can view/manage all orders
CREATE POLICY "Admins manage all orders" ON public.orders FOR ALL USING (
  auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
);

-- Same for Order Items (simplified)
CREATE POLICY "Public read order items" ON public.order_items FOR SELECT USING (true); -- Or restrict to order owner
CREATE POLICY "Customers create order items" ON public.order_items FOR INSERT WITH CHECK (
  order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid())
);
