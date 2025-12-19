-- Add store_owner to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'store_owner';

-- Add status column to drivers table
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing drivers to approved
UPDATE drivers SET status = 'approved' WHERE status IS NULL OR status = 'pending';

-- Add status and owner_id to stores table
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

-- Update existing stores to approved
UPDATE stores SET status = 'approved' WHERE status IS NULL OR status = 'pending';

-- Add policy for store owners to manage their own stores
CREATE POLICY "Store owners can manage their own stores" ON stores
    FOR ALL
    USING (auth.uid() = owner_id);

-- Add policy for authenticated users to create stores (for sign up)
CREATE POLICY "Authenticated users can create stores" ON stores
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Add policy for drivers to view own status
CREATE POLICY "Drivers can view own profile" ON drivers
    FOR SELECT
    USING (auth.uid() = user_id);
