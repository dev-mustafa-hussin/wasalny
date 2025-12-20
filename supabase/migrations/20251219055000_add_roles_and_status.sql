-- 1. Create app_role type
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('admin', 'customer', 'driver', 'store_owner');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create drivers table if missing
CREATE TABLE IF NOT EXISTS drivers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    vehicle_type text,
    vehicle_number text,
    current_lat double precision,
    current_lng double precision,
    is_available boolean DEFAULT false,
    total_earnings double precision DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- 3. Create stores table if missing
CREATE TABLE IF NOT EXISTS stores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id uuid REFERENCES auth.users(id),
    name text NOT NULL,
    description text,
    type text NOT NULL,
    image_url text,
    address text,
    phone text,
    is_active boolean DEFAULT true,
    opening_time time,
    closing_time time,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- 4. Create user_roles table if missing
CREATE TABLE IF NOT EXISTS user_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    role app_role DEFAULT 'customer',
    created_at timestamptz DEFAULT now()
);

-- 5. Create profiles table if missing
CREATE TABLE IF NOT EXISTS profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    full_name text,
    phone text,
    avatar_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 6. Add columns safely
DO $$ BEGIN
    ALTER TABLE drivers ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE stores ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE stores ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 7. Add 'store_owner' to enum safely
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'store_owner';

-- 8. Enable RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 9. Create/Replace Policies (Using SECURITY DEFINER function for admin check to avoid recursion)

-- Admin check function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old policies
DROP POLICY IF EXISTS "Enable read access for all users" ON drivers;
DROP POLICY IF EXISTS "Drivers can insert/update own profile" ON drivers;
DROP POLICY IF EXISTS "Drivers can view own profile" ON drivers;
DROP POLICY IF EXISTS "Admins can manage all drivers" ON drivers;

DROP POLICY IF EXISTS "Store owners can manage their own stores" ON stores;
DROP POLICY IF EXISTS "Authenticated users can create stores" ON stores;
DROP POLICY IF EXISTS "Admins can manage all stores" ON stores;

DROP POLICY IF EXISTS "Admins can manage user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;


-- Driver Policies
CREATE POLICY "Drivers can view own profile" ON drivers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Drivers can update own profile" ON drivers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Drivers can insert own profile" ON drivers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all drivers" ON drivers FOR ALL USING (is_admin());

-- Store Policies
CREATE POLICY "Store owners can manage their own stores" ON stores FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Authenticated users can create stores" ON stores FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Admins can manage all stores" ON stores FOR ALL USING (is_admin());

-- Role Policies
CREATE POLICY "Admins can manage user_roles" ON user_roles FOR ALL USING (is_admin());
CREATE POLICY "Users can read own role" ON user_roles FOR SELECT USING (auth.uid() = user_id);
