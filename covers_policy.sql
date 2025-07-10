-- 1. Allow authenticated users to upload their own files in the 'covers' bucket
CREATE POLICY "Allow authenticated cover photo uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'covers' AND auth.uid() = (storage.foldername(name))[1]::uuid);

-- 2. Allow authenticated users to update their own files in the 'covers' bucket
CREATE POLICY "Allow authenticated cover photo updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'covers' AND auth.uid() = (storage.foldername(name))[1]::uuid);

-- 3. Allow public read access to files in the 'covers' bucket
CREATE POLICY "Allow public read access for covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'covers');
