-- Create storage bucket for company logos
-- Run this in your Supabase SQL editor

-- Create the logos bucket (public so logos can be accessed via URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Idempotent policy recreation (safe to re-run)
DROP POLICY IF EXISTS "Users can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete company logos" ON storage.objects;

-- Storage policy: Authenticated users can upload logos
-- Users can upload their own company logos
CREATE POLICY "Users can upload company logos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'logos' AND
    auth.role() = 'authenticated'
);

-- Storage policy: Anyone can view logos (public bucket)
CREATE POLICY "Anyone can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- Storage policy: Users can update their own company logos
-- This allows updating/replacing logos
CREATE POLICY "Users can update company logos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'logos' AND
    auth.role() = 'authenticated'
)
WITH CHECK (
    bucket_id = 'logos' AND
    auth.role() = 'authenticated'
);

-- Storage policy: Users can delete their own company logos
CREATE POLICY "Users can delete company logos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'logos' AND
    auth.role() = 'authenticated'
);

