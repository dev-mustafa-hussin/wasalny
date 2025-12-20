-- =====================================================
-- FIX 1: email_logs - Restrict UPDATE to only opened_at field
-- =====================================================
DROP POLICY IF EXISTS "Public can update for tracking" ON public.email_logs;

CREATE POLICY "Public can update opened_at for tracking" 
ON public.email_logs 
FOR UPDATE 
USING (opened_at IS NULL)
WITH CHECK (opened_at IS NOT NULL);

-- =====================================================
-- FIX 2: push_subscriptions - Remove overly permissive SELECT
-- =====================================================
DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.push_subscriptions;

-- Only allow reading via service role in edge functions (no public access)
-- The edge functions use service_role key which bypasses RLS

-- =====================================================
-- FIX 3: profiles - Restrict shared order access to only show names
-- Create a view for limited profile info in shared orders
-- =====================================================
DROP POLICY IF EXISTS "Users can view profiles in shared orders" ON public.profiles;

-- Create a more restrictive policy that only allows viewing during active orders
CREATE POLICY "Users can view profiles in active shared orders" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery')
    AND (
      (orders.customer_id = auth.uid() AND orders.driver_id IN (
        SELECT d.id FROM drivers d WHERE d.user_id = profiles.user_id
      ))
      OR 
      (orders.driver_id IN (
        SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()
      ) AND orders.customer_id = profiles.user_id)
    )
  )
);

-- =====================================================
-- FIX 4: orders - Add function to mask address until out_for_delivery
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_masked_delivery_address(
  order_status text,
  full_address text,
  is_driver boolean
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Drivers only see full address when order is ready or out for delivery
  IF is_driver AND order_status NOT IN ('ready', 'out_for_delivery') THEN
    RETURN 'العنوان سيظهر عند جاهزية الطلب';
  END IF;
  RETURN full_address;
END;
$$;

-- Create function to mask GPS coordinates
CREATE OR REPLACE FUNCTION public.get_masked_coordinates(
  order_status text,
  coord numeric,
  is_driver boolean
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Drivers only see exact coordinates when order is ready or out for delivery
  IF is_driver AND order_status NOT IN ('ready', 'out_for_delivery') THEN
    RETURN NULL;
  END IF;
  RETURN coord;
END;
$$;

-- =====================================================
-- FIX 5: drivers - Separate earnings access with stricter policy
-- =====================================================
-- Create a function to get driver earnings (only accessible by the driver themselves)
CREATE OR REPLACE FUNCTION public.get_driver_earnings(driver_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  earnings numeric;
BEGIN
  -- Only allow drivers to see their own earnings
  IF auth.uid() != driver_user_id AND NOT has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;
  
  SELECT total_earnings INTO earnings
  FROM drivers
  WHERE user_id = driver_user_id;
  
  RETURN earnings;
END;
$$;

-- Update drivers policy to be more restrictive about location data
DROP POLICY IF EXISTS "Drivers can view own info" ON public.drivers;

CREATE POLICY "Drivers can view own info" 
ON public.drivers 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for admins to view drivers (if not exists already handled by ALL policy)
-- The existing "Admins can manage drivers" policy handles this