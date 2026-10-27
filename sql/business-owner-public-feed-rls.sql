-- Public feed must not read protected owner applications directly under anonymous RLS.
CREATE OR REPLACE FUNCTION private.business_post_visible(p_business uuid,p_author uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT EXISTS (
   SELECT 1 FROM public.commercial_registry c
   JOIN public.business_owner_requests r ON r.business_id=c.id
   WHERE c.id=p_business AND c.status='ATTIVA'
     AND r.user_id=p_author AND r.status='approved'
 );
$fn$;
REVOKE ALL ON FUNCTION private.business_post_visible(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.business_post_visible(uuid,uuid) TO anon,authenticated;
DROP POLICY IF EXISTS lc_business_posts_public ON public.business_posts;
CREATE POLICY lc_business_posts_public ON public.business_posts
 FOR SELECT TO anon,authenticated
 USING (is_published AND moderation_status='visible'
    AND (expires_at IS NULL OR expires_at>now())
    AND (SELECT private.business_post_visible(business_id,author_id)));
