-- Create driver_ratings table for customer ratings
CREATE TABLE public.driver_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Enable RLS
ALTER TABLE public.driver_ratings ENABLE ROW LEVEL SECURITY;

-- Customers can create ratings for their delivered orders
CREATE POLICY "Customers can create driver ratings"
ON public.driver_ratings
FOR INSERT
WITH CHECK (auth.uid() = customer_id);

-- Customers can view their own ratings
CREATE POLICY "Customers can view own ratings"
ON public.driver_ratings
FOR SELECT
USING (auth.uid() = customer_id);

-- Drivers can view ratings about them
CREATE POLICY "Drivers can view their ratings"
ON public.driver_ratings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.drivers 
    WHERE drivers.id = driver_ratings.driver_id 
    AND drivers.user_id = auth.uid()
  )
);

-- Admins can manage all ratings
CREATE POLICY "Admins can manage driver ratings"
ON public.driver_ratings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));