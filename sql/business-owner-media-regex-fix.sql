-- Evita ambiguità di escape regex nel controllo del nome file.
DROP POLICY IF EXISTS lc_merchant_media_upload ON storage.objects;
CREATE POLICY lc_merchant_media_upload ON storage.objects
 FOR INSERT TO authenticated
 WITH CHECK (
  bucket_id='merchant-media'
  AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$'
  AND split_part(name,'/',2)=(SELECT auth.uid())::text
  AND (SELECT private.business_owner_can_post(split_part(name,'/',1)::uuid,auth.uid()))
 );
