-- Lost Country RP · Registrazione autonoma titolari + bacheca commerciale, 27/10/2026
-- Le domande richiedono approvazione amministrativa prima della pubblicazione.
BEGIN;

CREATE TABLE IF NOT EXISTS public.business_owner_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 business_id uuid REFERENCES public.commercial_registry(id),
 business_name text NOT NULL CHECK (length(btrim(business_name)) BETWEEN 3 AND 150),
 category text NOT NULL CHECK (length(btrim(category)) BETWEEN 2 AND 100),
 town text NOT NULL CHECK (length(btrim(town)) BETWEEN 2 AND 100),
 owner_name text NOT NULL CHECK (length(btrim(owner_name)) BETWEEN 3 AND 150),
 description text NOT NULL CHECK (length(btrim(description)) BETWEEN 15 AND 3000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','revoked')),
 review_reason text,
 reviewed_by uuid REFERENCES auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS business_owner_pending_one_per_user
 ON public.business_owner_requests(user_id) WHERE status='pending';
CREATE UNIQUE INDEX IF NOT EXISTS business_owner_approved_link_unique
 ON public.business_owner_requests(user_id,business_id) WHERE status='approved';
CREATE INDEX IF NOT EXISTS business_owner_requests_business_status
 ON public.business_owner_requests(business_id,status);
ALTER TABLE public.business_owner_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_owner_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.business_owner_requests TO authenticated;
GRANT INSERT(user_id,business_id,business_name,category,town,owner_name,description)
 ON public.business_owner_requests TO authenticated;

CREATE POLICY lc_owner_requests_self_read ON public.business_owner_requests
 FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()) OR (SELECT public.lc_portal_can_manage('business')) OR (SELECT public.is_sheriff_admin()));
CREATE POLICY lc_owner_requests_self_apply ON public.business_owner_requests
 FOR INSERT TO authenticated
 WITH CHECK (user_id=(SELECT auth.uid()) AND status='pending'
  AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_reason IS NULL
  AND (business_id IS NULL OR EXISTS(SELECT 1 FROM public.commercial_registry c WHERE c.id=business_id)));

CREATE TABLE IF NOT EXISTS public.business_posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES public.commercial_registry(id),
 author_id uuid NOT NULL REFERENCES auth.users(id),
 post_type text NOT NULL DEFAULT 'announcement'
  CHECK(post_type IN ('announcement','offer','event','catalog')),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 5 AND 160),
 body text NOT NULL CHECK(length(btrim(body)) BETWEEN 10 AND 5000),
 image_url text CHECK(image_url IS NULL OR (length(image_url)<=1000 AND image_url ~ '^https://[^[:space:]]+$')),
 expires_at timestamptz,
 is_published boolean NOT NULL DEFAULT true,
 moderation_status text NOT NULL DEFAULT 'visible' CHECK(moderation_status IN ('visible','hidden')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_posts_feed ON public.business_posts(business_id,created_at DESC);
CREATE INDEX IF NOT EXISTS business_posts_public_feed ON public.business_posts(created_at DESC) WHERE is_published AND moderation_status='visible';
ALTER TABLE public.business_posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_posts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.business_posts TO anon,authenticated;
GRANT INSERT(business_id,author_id,post_type,title,body,image_url,expires_at,is_published)
 ON public.business_posts TO authenticated;
GRANT UPDATE(post_type,title,body,image_url,expires_at,is_published,updated_at)
 ON public.business_posts TO authenticated;

-- Un proprietario può creare o modificare post SOLO se la titolarità è stata approvata
-- e l'attività commerciale risulta ATTIVA.
CREATE OR REPLACE FUNCTION private.business_owner_can_post(p_business uuid,p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $f$
 SELECT p_user=(SELECT auth.uid()) AND EXISTS (
  SELECT 1 FROM public.business_owner_requests b
  JOIN public.commercial_registry c ON c.id=b.business_id
  WHERE b.user_id=p_user AND b.business_id=p_business
    AND b.status='approved' AND c.status='ATTIVA'
 );
$f$;
REVOKE ALL ON FUNCTION private.business_owner_can_post(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.business_owner_can_post(uuid,uuid) TO authenticated;

CREATE POLICY lc_business_posts_public ON public.business_posts
 FOR SELECT TO anon,authenticated
 USING (is_published AND moderation_status='visible'
  AND (expires_at IS NULL OR expires_at>now())
  AND EXISTS(SELECT 1 FROM public.commercial_registry c WHERE c.id=business_id AND c.status='ATTIVA')
  AND EXISTS(SELECT 1 FROM public.business_owner_requests b WHERE b.business_id=business_posts.business_id AND b.user_id=business_posts.author_id AND b.status='approved'));

CREATE POLICY lc_business_posts_owner_read ON public.business_posts
 FOR SELECT TO authenticated USING (
  author_id=(SELECT auth.uid()) OR (SELECT public.lc_portal_can_manage('business')) OR (SELECT public.is_sheriff_admin())
 );
CREATE POLICY lc_business_posts_owner_insert ON public.business_posts
 FOR INSERT TO authenticated WITH CHECK(
  author_id=(SELECT auth.uid()) AND moderation_status='visible'
  AND (SELECT private.business_owner_can_post(business_id,author_id))
 );
CREATE POLICY lc_business_posts_owner_update ON public.business_posts
 FOR UPDATE TO authenticated
 USING(author_id=(SELECT auth.uid()) AND moderation_status='visible' AND (SELECT private.business_owner_can_post(business_id,author_id)))
 WITH CHECK(author_id=(SELECT auth.uid()) AND moderation_status='visible' AND (SELECT private.business_owner_can_post(business_id,author_id)));

CREATE TABLE IF NOT EXISTS public.business_owner_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 request_id uuid NOT NULL REFERENCES public.business_owner_requests(id),
 business_id uuid REFERENCES public.commercial_registry(id),
 action text NOT NULL CHECK(action IN ('approve','reject','revoke')),
 performed_by uuid NOT NULL REFERENCES auth.users(id),
 reason text NOT NULL,
 performed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_owner_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_owner_audit FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.business_owner_audit TO authenticated;
CREATE POLICY lc_business_owner_audit_admin_read ON public.business_owner_audit
 FOR SELECT TO authenticated USING ((SELECT public.lc_portal_can_manage('business')) OR (SELECT public.is_sheriff_admin()));

CREATE TABLE IF NOT EXISTS public.business_post_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 post_id uuid NOT NULL REFERENCES public.business_posts(id),
 action text NOT NULL CHECK(action IN ('hide','restore')),
 performed_by uuid NOT NULL REFERENCES auth.users(id),
 reason text NOT NULL,
 performed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_post_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_post_audit FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.business_post_audit TO authenticated;
CREATE POLICY lc_business_post_audit_admin_read ON public.business_post_audit
 FOR SELECT TO authenticated USING ((SELECT public.lc_portal_can_manage('business')) OR (SELECT public.is_sheriff_admin()));

-- Amministratori / responsabili commerciali approvano le domande. Nessuna
-- possibilità per l'utente di autorizzare se stesso.
CREATE OR REPLACE FUNCTION public.lc_business_owner_decide(
 p_request_id uuid,p_action text,p_reason text,p_existing_business_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
DECLARE request_row public.business_owner_requests%ROWTYPE;
        chosen uuid; normalized_reason text;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT (
    public.lc_portal_can_manage('business') OR public.is_sheriff_admin()) THEN
    RAISE EXCEPTION 'Solo la direzione commerciale può autorizzare i proprietari' USING ERRCODE='42501';
 END IF;
 normalized_reason:=btrim(coalesce(p_reason,''));
 IF length(normalized_reason)<5 THEN
    RAISE EXCEPTION 'Inserisci una motivazione di almeno 5 caratteri' USING ERRCODE='22023';
 END IF;
 IF p_action NOT IN ('approve','reject','revoke') THEN
    RAISE EXCEPTION 'Decisione non valida' USING ERRCODE='22023';
 END IF;
 SELECT * INTO request_row FROM public.business_owner_requests
  WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Richiesta inesistente'; END IF;
 IF (p_action IN ('approve','reject') AND request_row.status<>'pending')
    OR (p_action='revoke' AND request_row.status<>'approved') THEN
    RAISE EXCEPTION 'La richiesta non è nello stato necessario'; END IF;
 chosen:=COALESCE(p_existing_business_id,request_row.business_id);
 IF p_action='approve' THEN
   IF chosen IS NULL THEN
     IF EXISTS (SELECT 1 FROM public.commercial_registry c
       WHERE lower(btrim(c.business_name))=lower(btrim(request_row.business_name))
       AND lower(btrim(c.town))=lower(btrim(request_row.town))) THEN
       RAISE EXCEPTION 'Attività già registrata: collegala al registro esistente anziché crearne una duplicata';
     END IF;
     INSERT INTO public.commercial_registry
       (business_name,category,town,owner_name,description,status,created_by)
     VALUES(request_row.business_name,request_row.category,request_row.town,
            request_row.owner_name,request_row.description,'ATTIVA',auth.uid())
     RETURNING id INTO chosen;
   ELSIF NOT EXISTS (SELECT 1 FROM public.commercial_registry WHERE id=chosen) THEN
      RAISE EXCEPTION 'Attività del registro non trovata';
   END IF;
 END IF;
 UPDATE public.business_owner_requests
  SET status=CASE p_action WHEN 'approve' THEN 'approved' WHEN 'reject' THEN 'rejected' ELSE 'revoked' END,
      business_id=chosen,
      review_reason=normalized_reason,reviewed_by=auth.uid(),reviewed_at=now()
  WHERE id=p_request_id;
 INSERT INTO public.business_owner_audit(request_id,business_id,action,performed_by,reason)
 VALUES(p_request_id,chosen,p_action,auth.uid(),normalized_reason);
 RETURN chosen;
END;$f$;
REVOKE ALL ON FUNCTION public.lc_business_owner_decide(uuid,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lc_business_owner_decide(uuid,text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.lc_business_post_moderate(
 p_post_id uuid,p_action text,p_reason text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
DECLARE old_status text;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT (
    public.lc_portal_can_manage('business') OR public.is_sheriff_admin()) THEN
    RAISE EXCEPTION 'Non autorizzato alla moderazione commerciale' USING ERRCODE='42501';
 END IF;
 IF p_action NOT IN ('hide','restore') OR length(btrim(coalesce(p_reason,'')))<5 THEN
    RAISE EXCEPTION 'Azione o motivazione non valide' USING ERRCODE='22023';
 END IF;
 SELECT moderation_status INTO old_status FROM public.business_posts WHERE id=p_post_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pubblicazione non trovata'; END IF;
 IF (p_action='hide' AND old_status='hidden') OR (p_action='restore' AND old_status='visible') THEN
    RAISE EXCEPTION 'La pubblicazione è già nello stato richiesto'; END IF;
 UPDATE public.business_posts
 SET moderation_status=CASE p_action WHEN 'hide' THEN 'hidden' ELSE 'visible' END,updated_at=now()
 WHERE id=p_post_id;
 INSERT INTO public.business_post_audit(post_id,action,performed_by,reason)
 VALUES(p_post_id,p_action,auth.uid(),btrim(p_reason));
END;$f$;
REVOKE ALL ON FUNCTION public.lc_business_post_moderate(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lc_business_post_moderate(uuid,text,text) TO authenticated;
COMMIT;