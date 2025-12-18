-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true);

-- Allow anyone to view images (public bucket)
CREATE POLICY "Public read access for images"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- Allow authenticated admins to upload images
CREATE POLICY "Admins can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow authenticated admins to update images
CREATE POLICY "Admins can update images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow authenticated admins to delete images
CREATE POLICY "Admins can delete images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);