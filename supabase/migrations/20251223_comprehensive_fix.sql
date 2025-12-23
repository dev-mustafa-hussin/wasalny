-- COMPREHENSIVE FIX FOR MERCHANT & ADMIN VISIBILITY

-- 1. FIX ENUM (Safely add store_owner if missing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'customer', 'driver', 'store_owner');
    ELSE
        BEGIN
            ALTER TYPE public.app_role ADD VALUE 'store_owner';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- 2. REPAIR TABLES (Ensure status column exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'status') THEN
        ALTER TABLE public.stores ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'status') THEN
        ALTER TABLE public.drivers ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;

    -- Ensure owner_id exists in stores
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'owner_id') THEN
        ALTER TABLE public.stores ADD COLUMN owner_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- 3. REPAIR PROFILE RELATIONSHIP (Ensure stores and drivers are linked to profiles via user_id/owner_id)
-- This is fine if the schema is correct.

-- 4. FIX/ADD is_admin() FUNCTION
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'::public.app_role
  );
END;
$$;

-- 5. SET RLS POLICIES FOR STORES
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all stores" ON public.stores;
DROP POLICY IF EXISTS "Store owners can manage their own stores" ON public.stores;
DROP POLICY IF EXISTS "Authenticated users can create stores" ON public.stores;
DROP POLICY IF EXISTS "Public read stores" ON public.stores;

CREATE POLICY "Admins can manage all stores" ON public.stores 
    FOR ALL TO authenticated 
    USING (public.is_admin());

CREATE POLICY "Store owners can manage their own stores" ON public.stores 
    FOR ALL TO authenticated 
    USING (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create stores" ON public.stores 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Public read stores" ON public.stores 
    FOR SELECT USING (true);

-- 6. SET RLS POLICIES FOR DRIVERS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all drivers" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can view own profile" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can update own profile" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can insert own profile" ON public.drivers;
DROP POLICY IF EXISTS "Public read drivers" ON public.drivers;

CREATE POLICY "Admins can manage all drivers" ON public.drivers 
    FOR ALL TO authenticated 
    USING (public.is_admin());

CREATE POLICY "Drivers can view own profile" ON public.drivers 
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Drivers can update own profile" ON public.drivers 
    FOR UPDATE TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Drivers can insert own profile" ON public.drivers 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read drivers" ON public.drivers 
    FOR SELECT USING (true);

-- 7. ENSURE ADMIN ROLE FOR THE USER
DO $$
DECLARE
  v_user_email text := 'dev-mustafa-hussin@hotmail.com';
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;
  IF v_user_id IS NOT NULL THEN
    -- Delete any existing role for this user and insert admin
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin'::public.app_role);
  END IF;
END $$;
