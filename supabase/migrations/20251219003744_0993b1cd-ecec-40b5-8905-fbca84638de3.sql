-- Fix #1: Restrict profiles SELECT access
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can view profiles of users they share orders with (driver-customer relationship)
CREATE POLICY "Users can view profiles in shared orders" 
  ON public.profiles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE (orders.customer_id = auth.uid() AND orders.driver_id = (SELECT d.user_id FROM drivers d WHERE d.user_id = profiles.user_id))
         OR (orders.driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()) AND orders.customer_id = profiles.user_id)
    )
  );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix #2: Server-side order price validation trigger
-- Create a function to validate and recalculate order totals
CREATE OR REPLACE FUNCTION validate_order_total()
RETURNS TRIGGER AS $$
DECLARE
  calculated_item_total DECIMAL(10,2);
  calculated_delivery_fee DECIMAL(10,2);
BEGIN
  -- Get delivery fee from settings
  SELECT COALESCE(base_price, 10) INTO calculated_delivery_fee
  FROM delivery_settings
  LIMIT 1;
  
  -- If no delivery settings found, use default
  IF calculated_delivery_fee IS NULL THEN
    calculated_delivery_fee := 10;
  END IF;
  
  -- Validate delivery fee is not negative
  IF NEW.delivery_fee < 0 THEN
    RAISE EXCEPTION 'Delivery fee cannot be negative';
  END IF;
  
  -- Validate total amount is positive
  IF NEW.total_amount <= 0 THEN
    RAISE EXCEPTION 'Total amount must be positive';
  END IF;
  
  -- Set the delivery fee from server-side settings (override client value)
  NEW.delivery_fee := calculated_delivery_fee;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for order validation on INSERT
DROP TRIGGER IF EXISTS validate_order_before_insert ON orders;
CREATE TRIGGER validate_order_before_insert
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_total();

-- Create function to validate order items against actual product prices
CREATE OR REPLACE FUNCTION validate_order_items()
RETURNS TRIGGER AS $$
DECLARE
  actual_price DECIMAL(10,2);
  price_diff DECIMAL(10,2);
BEGIN
  -- Look up the actual product price from the database
  SELECT price INTO actual_price
  FROM products
  WHERE id = NEW.product_id AND is_available = true;
  
  -- If product exists, validate the price
  IF actual_price IS NOT NULL THEN
    price_diff := ABS(NEW.unit_price - actual_price);
    
    -- Allow small rounding differences (0.01) but reject price tampering
    IF price_diff > 0.01 THEN
      -- Log the attempt and use actual price
      RAISE WARNING 'Price mismatch detected for product %. Client: %, Actual: %. Using actual price.', 
        NEW.product_id, NEW.unit_price, actual_price;
      NEW.unit_price := actual_price;
    END IF;
  ELSIF NEW.product_id IS NOT NULL THEN
    -- Product not found or not available
    RAISE EXCEPTION 'Product % is not available', NEW.product_id;
  END IF;
  
  -- Ensure quantity is positive
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for order items validation
DROP TRIGGER IF EXISTS validate_order_items_before_insert ON order_items;
CREATE TRIGGER validate_order_items_before_insert
  BEFORE INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_items();

-- Create function to update order total after items are inserted
CREATE OR REPLACE FUNCTION update_order_total_from_items()
RETURNS TRIGGER AS $$
DECLARE
  calculated_total DECIMAL(10,2);
  order_delivery_fee DECIMAL(10,2);
BEGIN
  -- Calculate total from all order items
  SELECT COALESCE(SUM(quantity * unit_price), 0) INTO calculated_total
  FROM order_items
  WHERE order_id = NEW.order_id;
  
  -- Get current delivery fee
  SELECT delivery_fee INTO order_delivery_fee
  FROM orders
  WHERE id = NEW.order_id;
  
  -- Update the order total with calculated amount + delivery fee
  UPDATE orders
  SET total_amount = calculated_total + COALESCE(order_delivery_fee, 0),
      updated_at = now()
  WHERE id = NEW.order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to update order total after items are added
DROP TRIGGER IF EXISTS update_order_total_after_item_insert ON order_items;
CREATE TRIGGER update_order_total_after_item_insert
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_total_from_items();