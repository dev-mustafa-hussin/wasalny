-- Enable public read access to stores so customers can see them
-- Drop first to avoid conflicts if it exists (though "IF NOT EXISTS" is safer, Supabase policies don't support IF NOT EXISTS clause easily in raw SQL without DO block)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'stores' AND policyname = 'Public read stores'
    ) THEN
        CREATE POLICY "Public read stores" ON public.stores FOR SELECT USING (true);
    END IF;
END
$$;
