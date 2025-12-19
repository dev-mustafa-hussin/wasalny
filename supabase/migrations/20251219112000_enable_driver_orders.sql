-- Enable Drivers to View Orders
CREATE POLICY "Drivers view orders" ON public.orders FOR SELECT USING (
  -- Can see available orders if they are a driver
  (status = 'ready' AND driver_id IS NULL AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'driver'))
  OR
  -- Can see their own assigned orders
  (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()))
);

-- Enable Drivers to Update Orders (Accept or Change Status)
CREATE POLICY "Drivers update orders" ON public.orders FOR UPDATE USING (
  -- Can pick up available orders
  (status = 'ready' AND driver_id IS NULL AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'driver'))
  OR
  -- Can update their own orders
  (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()))
);
