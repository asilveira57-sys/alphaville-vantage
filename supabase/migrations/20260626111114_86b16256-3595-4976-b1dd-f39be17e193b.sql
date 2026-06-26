
CREATE POLICY "Admins can upload editorial images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'editorial-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update editorial images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'editorial-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete editorial images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'editorial-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read editorial images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'editorial-images');
