-- Migration: Add Branding Fields to Establishments
-- Description: Adds logo, banner, and primary color support. Creates storage bucket for assets.

-- 1. Add columns to establishments table
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS banner_url text,
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#7C3AED';

-- 2. Create Storage Bucket for Shop Assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-assets', 'shop-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Policies for 'shop-assets'

-- Policy: Public Read Access (Anyone can view logos/banners)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'shop-assets' );

-- Policy: Owners can upload/update/delete their own assets
-- We use a folder structure convention: shop-assets/{shop_id}/{filename}
-- But for simplicity, we'll allow authenticated owners to upload anywhere in the bucket for now, 
-- or restrict by folder if needed. Let's allow authenticated users to upload (Owners/Admins).

CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'shop-assets' );

CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'shop-assets' );

CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'shop-assets' );
