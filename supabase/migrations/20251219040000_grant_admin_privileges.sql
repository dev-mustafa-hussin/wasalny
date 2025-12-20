-- Migration to grant super admin privileges to specific user
-- and ensure they get admin role on signup if not already existing

-- 1. Update existing user if they exist
DO $$
DECLARE
  target_email TEXT := 'dev-mustafa-hussin@hotmail.com';
  target_user_id UUID;
BEGIN
  -- Find the user's ID from auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;

  -- If user exists, update/insert their role
  IF target_user_id IS NOT NULL THEN
    -- Check if a role entry already exists
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_user_id) THEN
      UPDATE public.user_roles
      SET role = 'admin'
      WHERE user_id = target_user_id;
    ELSE
      INSERT INTO public.user_roles (user_id, role)
      VALUES (target_user_id, 'admin');
    END IF;
  END IF;
END $$;

-- 2. Modify the handle_new_user function to automatically make this email an admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'مستخدم جديد'));
  
  -- Check if the email matches the super admin email
  IF NEW.email = 'dev-mustafa-hussin@hotmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer');
  END IF;
  
  RETURN NEW;
END;
$$;
