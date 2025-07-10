-- Policies for 'posts' bucket

-- 1. Allow authenticated users to upload files to the 'posts' bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'posts');

-- 2. Allow public read access to files in the 'posts' bucket
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'posts');

-- Drop existing policies for 'avatars' bucket to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated avatar uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated avatar updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access for avatars" ON storage.objects;

-- Policies for 'avatars' bucket

-- 1. Allow authenticated users to upload files to their own folder in the 'avatars' bucket
CREATE POLICY "Allow authenticated avatar uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[2]::uuid);

-- 2. Allow authenticated users to update their own files in the 'avatars' bucket
CREATE POLICY "Allow authenticated avatar updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[2]::uuid);

-- 3. Allow public read access to files in the 'avatars' bucket
CREATE POLICY "Allow public read access for avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policies for 'covers' bucket

-- 1. Allow authenticated users to upload their own files in the 'covers' bucket
CREATE POLICY "Allow authenticated cover photo uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'covers' AND auth.uid() = (storage.foldername(name))[2]::uuid);

-- 2. Allow authenticated users to update their own files in the 'covers' bucket
CREATE POLICY "Allow authenticated cover photo updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'covers' AND auth.uid() = (storage.foldername(name))[2]::uuid);

-- 3. Allow public read access to files in the 'covers' bucket
CREATE POLICY "Allow public read access for covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'covers');
