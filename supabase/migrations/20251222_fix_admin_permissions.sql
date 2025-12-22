-- Super Admin & RLS Fixes (Updated)

-- 1. Ensure the specific user is an ADMIN
DO $$
DECLARE
  v_user_email text := 'dev-mustafa-hussin@hotmail.com';
  v_user_id uuid;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;

  IF v_user_id IS NOT NULL THEN
    -- Insert admin role if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'admin') THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'admin');
      RAISE NOTICE 'Admin role applied for user: %', v_user_email;
    ELSE
      RAISE NOTICE 'User % already has admin role', v_user_email;
    END IF;
  ELSE
    RAISE WARNING 'User with email % not found', v_user_email;
  END IF;
END $$;

-- 2. Refine Delivery Settings Policies
DROP POLICY IF EXISTS "Delivery settings viewable by everyone" ON public.delivery_settings;
DROP POLICY IF EXISTS "Admins can manage delivery settings" ON public.delivery_settings;

CREATE POLICY "Delivery settings viewable by everyone" 
  ON public.delivery_settings FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage delivery settings" 
  ON public.delivery_settings 
  FOR ALL 
  TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- Ensure at least one row exists for delivery_settings
INSERT INTO public.delivery_settings (base_price, price_per_km, min_order_amount)
SELECT 10.00, 2.00, 20.00
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_settings);


-- 3. Refine Email Templates Policies
DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Email templates readable by service role" ON public.email_templates;

-- Allow admins to do everything
CREATE POLICY "Admins can manage email templates" 
  ON public.email_templates 
  FOR ALL 
  TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- Default email template
INSERT INTO public.email_templates (template_key, subject_template, header_text, footer_text, footer_text_en)
SELECT 'order_status', 'تحديث طلبك #{order_id} - {status}', 'وصلني - Waslni', 'شكراً لاستخدامك وصلني', 'Thank you for using Waslni'
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE template_key = 'order_status');


-- 4. Fix Drivers View Policy
DROP POLICY IF EXISTS "Admins can view all drivers" ON public.drivers;

CREATE POLICY "Admins can view all drivers" 
  ON public.drivers 
  FOR SELECT 
  TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));
