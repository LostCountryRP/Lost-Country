-- Lost Country RP | gerarchia e convalida sanitaria, 27/10/2026
-- L'abilitazione medica resta indipendente dagli incarichi amministrativi.
BEGIN;
ALTER TABLE public.medical_staff ADD COLUMN IF NOT EXISTS rank text NOT NULL DEFAULT 'trainee';
ALTER TABLE public.medical_staff DROP CONSTRAINT IF EXISTS lc_medical_staff_rank_check;
ALTER TABLE public.medical_staff ADD CONSTRAINT lc_medical_staff_rank_check
 CHECK (rank IN ('trainee','nurse','doctor','chief_physician','medical_director'));

CREATE TABLE IF NOT EXISTS public.medical_rank_history(
 id bigint generated always as identity primary key,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 old_rank text NOT NULL,
 new_rank text NOT NULL,
 changed_by uuid REFERENCES auth.users(id),
 reason text NOT NULL CHECK(length(btrim(reason))>=5),
 changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_rank_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.medical_rank_history FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.medical_rank_history TO authenticated;
CREATE POLICY lc_medical_rank_history_admin_read ON public.medical_rank_history
 FOR SELECT TO authenticated USING ((SELECT public.lc_portal_is_admin()) OR (SELECT public.is_sheriff_admin()));

-- Gli operatori esistenti mantengono le capacità di scrittura precedenti.
WITH old AS (
 UPDATE public.medical_staff SET rank='medical_director'
 WHERE rank='trainee' AND active=true RETURNING user_id
)
INSERT INTO public.medical_rank_history(user_id,old_rank,new_rank,changed_by,reason)
SELECT user_id,'trainee','medical_director',NULL,'Trasferimento iniziale: conservazione dei permessi preesistenti'
FROM old;

CREATE OR REPLACE FUNCTION private.medical_can(p_action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 WITH member AS (
  SELECT CASE ms.rank
    WHEN 'trainee' THEN 0
    WHEN 'nurse' THEN 1
    WHEN 'doctor' THEN 2
    WHEN 'chief_physician' THEN 3
    WHEN 'medical_director' THEN 4
    ELSE -1 END AS level
  FROM public.medical_staff ms
  WHERE ms.user_id=(SELECT auth.uid()) AND ms.active=true
 ), required AS (
  SELECT CASE p_action
   WHEN 'read' THEN 0
   WHEN 'nursing_note' THEN 1
   WHEN 'clinical_report' THEN 2
   WHEN 'validate' THEN 3
   WHEN 'reopen' THEN 4
   ELSE 99 END AS level
 )
 SELECT EXISTS(SELECT 1 FROM member,required WHERE member.level>=required.level AND required.level<=4);
$fn$;
REVOKE ALL ON FUNCTION private.medical_can(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.medical_can(text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.current_medical_rank()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT ms.rank FROM public.medical_staff ms
 WHERE ms.user_id=(SELECT auth.uid()) AND ms.active=true;
$fn$;
REVOKE ALL ON FUNCTION public.current_medical_rank() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.current_medical_rank() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.lc_set_medical_rank(p_user_id uuid,p_new_rank text,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE previous text;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT (
      public.lc_portal_is_admin() OR public.is_sheriff_admin()) THEN
   RAISE EXCEPTION 'Solo gli amministratori possono modificare i gradi sanitari' USING ERRCODE='42501';
 END IF;
 IF p_new_rank NOT IN ('trainee','nurse','doctor','chief_physician','medical_director') THEN
   RAISE EXCEPTION 'Grado medico non valido' USING ERRCODE='22023';
 END IF;
 IF length(btrim(coalesce(p_reason,'')))<5 THEN
   RAISE EXCEPTION 'La motivazione richiede almeno 5 caratteri' USING ERRCODE='22023';
 END IF;
 SELECT rank INTO previous FROM public.medical_staff WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account sanitario inesistente'; END IF;
 IF previous=p_new_rank THEN RAISE EXCEPTION 'Grado già assegnato'; END IF;
 UPDATE public.medical_staff SET rank=p_new_rank WHERE user_id=p_user_id;
 INSERT INTO public.medical_rank_history(user_id,old_rank,new_rank,changed_by,reason)
 VALUES(p_user_id,previous,p_new_rank,auth.uid(),btrim(p_reason));
END;
$fn$;
REVOKE ALL ON FUNCTION public.lc_set_medical_rank(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lc_set_medical_rank(uuid,text,text) TO authenticated;

-- Audit di sicurezza anche per modifiche dirette effettuate da amministratori.
CREATE OR REPLACE FUNCTION private.medical_rank_direct_change_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
 IF OLD.rank IS DISTINCT FROM NEW.rank AND
  current_setting('app.medical_rank_authorized',true) IS DISTINCT FROM 'yes' THEN
  INSERT INTO public.medical_rank_history(user_id,old_rank,new_rank,changed_by,reason)
  VALUES(NEW.user_id,OLD.rank,NEW.rank,auth.uid(),
         'Modifica diretta amministrativa al grado sanitario');
 END IF;
 RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS lc_medical_rank_direct_audit ON public.medical_staff;
CREATE TRIGGER lc_medical_rank_direct_audit AFTER UPDATE OF rank ON public.medical_staff
 FOR EACH ROW EXECUTE FUNCTION private.medical_rank_direct_change_audit();

ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS record_type text NOT NULL DEFAULT 'clinical';
ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);
ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE public.medical_records ADD CONSTRAINT lc_medical_record_type_check
 CHECK(record_type IN ('clinical','nursing'));
ALTER TABLE public.medical_records ADD CONSTRAINT lc_medical_record_review_check
 CHECK(review_status IN ('pending','validated','reopened'));
-- I referti già esistenti sono trattati come referti clinici, senza revisione retroattiva.

CREATE POLICY lc_medical_insert_rank ON public.medical_records
 AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK (
  (record_type='nursing' AND (SELECT private.medical_can('nursing_note'))) OR
  (record_type='clinical' AND (SELECT private.medical_can('clinical_report')))
 );

CREATE TABLE IF NOT EXISTS public.medical_review_history(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 record_id uuid NOT NULL REFERENCES public.medical_records(id),
 old_status text NOT NULL,
 new_status text NOT NULL,
 reviewed_by uuid NOT NULL REFERENCES auth.users(id),
 reason text NOT NULL CHECK (length(btrim(reason))>=5),
 reviewed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_review_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.medical_review_history FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.medical_review_history TO authenticated;
CREATE POLICY lc_medical_review_history_read ON public.medical_review_history
 FOR SELECT TO authenticated USING ((SELECT private.medical_can('read')));

CREATE OR REPLACE FUNCTION public.lc_review_medical_record(
 p_record_id uuid,p_action text,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE old_status text;new_status text;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR
  p_action NOT IN ('validate','reopen') OR
  NOT private.medical_can(p_action) THEN
  RAISE EXCEPTION 'Grado sanitario insufficiente per questa operazione' USING ERRCODE='42501';
 END IF;
 IF length(btrim(coalesce(p_reason,'')))<5 THEN
  RAISE EXCEPTION 'La motivazione deve contenere almeno 5 caratteri' USING ERRCODE='22023';
 END IF;
 SELECT review_status INTO old_status FROM public.medical_records
 WHERE id=p_record_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Referto non trovato'; END IF;
 IF p_action='validate' THEN
  IF old_status NOT IN ('pending','reopened') THEN RAISE EXCEPTION 'Referto già convalidato'; END IF;
  new_status:='validated';
 ELSE
  IF old_status<>'validated' THEN RAISE EXCEPTION 'Puoi riaprire solo referti convalidati'; END IF;
  new_status:='reopened';
 END IF;
 UPDATE public.medical_records
 SET review_status=new_status, reviewed_by=auth.uid(),
     reviewed_at=now(),review_note=btrim(p_reason)
 WHERE id=p_record_id;
 INSERT INTO public.medical_review_history(record_id,old_status,new_status,reviewed_by,reason)
 VALUES(p_record_id,old_status,new_status,auth.uid(),btrim(p_reason));
END;
$fn$;
REVOKE ALL ON FUNCTION public.lc_review_medical_record(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lc_review_medical_record(uuid,text,text) TO authenticated;
COMMIT;