-- Storage RLS: proprietario approvato verificato con il legame autorizzato.
DROP POLICY IF EXISTS lc_merchant_media_upload ON storage.objects;
CREATE POLICY lc_merchant_media_upload ON storage.objects
 FOR INSERT TO authenticated
 WITH CHECK (
  bucket_id='merchant-media'
  AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$'
  AND split_part(name,'/',2)=(SELECT auth.uid())::text
  AND EXISTS (
   SELECT 1 FROM public.business_owner_requests r
   JOIN public.commercial_registry c ON c.id=r.business_id
   WHERE r.user_id=(SELECT auth.uid())
     AND r.business_id::text=split_part(storage.objects.name,'/',1)
     AND r.status='approved' AND c.status='ATTIVA'
  )
 );
