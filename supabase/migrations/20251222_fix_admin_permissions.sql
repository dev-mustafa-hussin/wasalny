-- Final Admin & Schema Fixes (Total Reconstruction)

-- 1. Create app_role type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'customer', 'driver');
    END IF;
END $$;

-- 2. Create/Replace has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. Create missing tables
-- delivery_settings
CREATE TABLE IF NOT EXISTS public.delivery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_price DECIMAL(10,2) DEFAULT 10.00,
  price_per_km DECIMAL(10,2) DEFAULT 2.00,
  min_order_amount DECIMAL(10,2) DEFAULT 20.00,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

-- email_templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key text NOT NULL UNIQUE,
  subject_template text NOT NULL,
  header_text text NOT NULL DEFAULT 'وصلني - Waslni',
  primary_color text NOT NULL DEFAULT '#3b82f6',
  secondary_color text NOT NULL DEFAULT '#1d4ed8',
  footer_text text NOT NULL DEFAULT 'شكراً لاستخدامك وصلني',
  footer_text_en text NOT NULL DEFAULT 'Thank you for using Waslni',
  custom_message_pending text,
  custom_message_confirmed text,
  custom_message_preparing text,
  custom_message_ready text,
  custom_message_out_for_delivery text,
  custom_message_delivered text,
  custom_message_cancelled text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;


-- 4. Ensure ADMIN Role for the user
DO $$
DECLARE
  v_user_email text := 'dev-mustafa-hussin@hotmail.com';
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;
  IF v_user_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'admin'::app_role) THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin'::app_role);
    END IF;
  END IF;
END $$;


-- 5. Set/Refine Policies
-- Delivery settings
DROP POLICY IF EXISTS "Delivery settings viewable by everyone" ON public.delivery_settings;
DROP POLICY IF EXISTS "Admins can manage delivery settings" ON public.delivery_settings;
CREATE POLICY "Delivery settings viewable by everyone" ON public.delivery_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage delivery settings" ON public.delivery_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Email templates
DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Email templates readable by everyone" ON public.email_templates;
CREATE POLICY "Admins can manage email templates" ON public.email_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Email templates readable by everyone" ON public.email_templates FOR SELECT USING (true);

-- Drivers
DROP POLICY IF EXISTS "Admins can view all drivers" ON public.drivers;
CREATE POLICY "Admins can view all drivers" ON public.drivers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));


-- 6. Insert Default Data
INSERT INTO public.delivery_settings (base_price, price_per_km, min_order_amount)
SELECT 10.00, 2.00, 20.00
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_settings);

INSERT INTO public.email_templates (template_key, subject_template, header_text, footer_text, footer_text_en)
SELECT 'order_status', 'تحديث طلبك #{order_id} - {status}', 'وصلني - Waslni', 'شكراً لاستخدامك وصلني', 'Thank you for using Waslni'
WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE template_key = 'order_status');
