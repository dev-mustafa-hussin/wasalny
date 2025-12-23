-- AUTOMATIC ACCOUNT SETUP TRIGGER
-- This trigger ensures that profiles, roles, and store/driver requests are created 
-- immediately upon signup, even if the email is not yet confirmed.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_full_name text;
    v_role text;
    v_store_name text;
    v_store_type text;
    v_store_phone text;
    v_vehicle_type text;
    v_vehicle_number text;
BEGIN
    -- Extract metadata
    v_full_name := NEW.raw_user_meta_data->>'full_name';
    v_role := NEW.raw_user_meta_data->>'role';
    
    -- 1. Create Profile
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(v_full_name, split_part(NEW.email, '@', 1)));

    -- 2. Create User Role
    IF v_role IS NOT NULL THEN
        -- Safely cast and insert
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, v_role::public.app_role);
    END IF;

    -- 3. Create Store Request (if applicable)
    IF v_role = 'store_owner' THEN
        v_store_name := NEW.raw_user_meta_data->>'storeName';
        v_store_type := NEW.raw_user_meta_data->>'storeType';
        v_store_phone := NEW.raw_user_meta_data->>'storePhone';
        
        INSERT INTO public.stores (owner_id, name, type, phone, status)
        VALUES (NEW.id, COALESCE(v_store_name, 'New Store'), COALESCE(v_store_type, 'restaurant'), v_store_phone, 'pending');
    END IF;

    -- 4. Create Driver Request (if applicable)
    IF v_role = 'driver' THEN
        v_vehicle_type := NEW.raw_user_meta_data->>'vehicleType';
        v_vehicle_number := NEW.raw_user_meta_data->>'vehicleNumber';
        
        INSERT INTO public.drivers (user_id, vehicle_type, vehicle_number, status)
        VALUES (NEW.id, v_vehicle_type, v_vehicle_number, 'pending');
    END IF;

    RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER tr_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
