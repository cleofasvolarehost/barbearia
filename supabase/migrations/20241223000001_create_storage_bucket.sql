-- 1. Add Branding Columns to Establishments
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#7C3AED';

-- 2. Create Storage Bucket for Shop Assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-assets', 'shop-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies (Security) - Drop if exists first to avoid conflict
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Owners Update Own Assets" ON storage.objects;
DROP POLICY IF EXISTS "Owners Delete Own Assets" ON storage.objects;

-- Allow public read access to shop assets
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'shop-assets' );

-- Allow authenticated owners to upload assets
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'shop-assets' AND auth.role() = 'authenticated' );

CREATE POLICY "Owners Update Own Assets"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'shop-assets' AND auth.uid() = owner );

CREATE POLICY "Owners Delete Own Assets"
ON storage.objects FOR DELETE
USING ( bucket_id = 'shop-assets' AND auth.uid() = owner );
