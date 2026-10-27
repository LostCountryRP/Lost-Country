
-- Lost Country RP — gradi operativi Sceriffi (2026-10-27).
-- Amministratori del sito e gradi RP restano separati.
BEGIN;
ALTER TABLE public.sheriff_members
 ADD COLUMN IF NOT EXISTS rank text NOT NULL DEFAULT 'deputy'
 CONSTRAINT sheriff_rank_valid CHECK (rank IN ('recruit','deputy','senior_deputy','vice_sheriff','sheriff'));
CREATE TABLE IF NOT EXISTS public.sheriff_rank_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL,
 previous_rank text NOT NULL,
 new_rank text NOT NULL,
 changed_by uuid,
 changed_at timestamptz NOT NULL DEFAULT now(),
 reason text NOT NULL CHECK(length(btrim(reason)) >= 5)
);
ALTER TABLE public.sheriff_rank_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sheriff_rank_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.sheriff_rank_history TO authenticated;
DROP POLICY IF EXISTS sheriff_rank_history_admin_read ON public.sheriff_rank_history;
CREATE POLICY sheriff_rank_history_admin_read ON public.sheriff_rank_history
 FOR SELECT TO authenticated USING ((SELECT public.is_sheriff_admin()));

CREATE OR REPLACE FUNCTION private.sheriff_can(p_action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
 WITH me AS (
  SELECT CASE rank
   WHEN 'recruit' THEN 0
   WHEN 'deputy' THEN 1
   WHEN 'senior_deputy' THEN 2
   WHEN 'vice_sheriff' THEN 3
   WHEN 'sheriff' THEN 4 ELSE -1 END AS level
  FROM public.sheriff_members WHERE user_id=(SELECT auth.uid())
 ), needed AS (
  SELECT CASE p_action
   WHEN 'read' THEN 0
   WHEN 'create_case' THEN 1
   WHEN 'modify_case' THEN 1
   WHEN 'registry_edit' THEN 1
   WHEN 'evidence_add' THEN 1
   WHEN 'pay_fines' THEN 2
   WHEN 'enforce_case' THEN 2
   WHEN 'ban_issue' THEN 2
   WHEN 'license_issue' THEN 2
   WHEN 'weapons_edit' THEN 2
   WHEN 'close_wanted' THEN 3
   WHEN 'ban_revoke' THEN 3
   WHEN 'license_revoke' THEN 3
   WHEN 'evidence_status' THEN 3
   ELSE 99 END AS level
 )
 SELECT EXISTS(SELECT 1 FROM me,needed WHERE needed.level<=4
  AND (me.level>=needed.level OR public.is_sheriff_admin()));
$fn$;
REVOKE ALL ON FUNCTION private.sheriff_can(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.sheriff_can(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_sheriff_rank()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT CASE WHEN public.is_sheriff_admin() THEN 'sheriff' ELSE sm.rank END
 FROM public.sheriff_members sm WHERE sm.user_id=(SELECT auth.uid());
$fn$;
REVOKE ALL ON FUNCTION public.current_sheriff_rank() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.current_sheriff_rank() TO authenticated,service_role;

-- Restrictive policies compose AND with all existing permissive policies.
-- Reports.
CREATE POLICY sheriff_rank_citizens_insert ON public.citizens AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT private.sheriff_can('create_case')));
CREATE POLICY sheriff_rank_citizens_update ON public.citizens AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT private.sheriff_can('modify_case'))) WITH CHECK ((SELECT private.sheriff_can('modify_case')));
CREATE POLICY sheriff_rank_cases_insert ON public.cases AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT private.sheriff_can('create_case')));
CREATE POLICY sheriff_rank_cases_update ON public.cases AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT private.sheriff_can('modify_case'))) WITH CHECK ((SELECT private.sheriff_can('modify_case')));
CREATE POLICY sheriff_rank_offenses_insert ON public.case_offenses AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT private.sheriff_can('create_case')));
CREATE POLICY sheriff_rank_offenses_update ON public.case_offenses AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT private.sheriff_can('pay_fines'))) WITH CHECK ((SELECT private.sheriff_can('pay_fines')));
CREATE POLICY sheriff_rank_wanted_close ON public.wanted_closures AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT private.sheriff_can('close_wanted')));
CREATE POLICY sheriff_rank_enforce_add ON public.case_enforcement AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT private.sheriff_can('enforce_case')));
CREATE POLICY sheriff_rank_enforce_edit ON public.case_enforcement AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT private.sheriff_can('enforce_case'))) WITH CHECK ((SELECT private.sheriff_can('enforce_case')));
-- Bans and licenses.
CREATE POLICY sheriff_rank_bans_issue ON public.city_bans AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT private.sheriff_can('ban_issue')));
CREATE POLICY sheriff_rank_bans_revoke ON public.city_bans AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT private.sheriff_can('ban_revoke'))) WITH CHECK ((SELECT private.sheriff_can('ban_revoke')));
CREATE POLICY sheriff_rank_licenses_issue ON public.licenses AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT private.sheriff_can('license_issue')));
CREATE POLICY sheriff_rank_licenses_revoke ON public.licenses AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT private.sheriff_can('license_revoke'))) WITH CHECK ((SELECT private.sheriff_can('license_revoke')));
-- Registers and evidence.
CREATE POLICY sheriff_rank_registry_add ON public.citizen_registry AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT private.sheriff_can('registry_edit')));
CREATE POLICY sheriff_rank_registry_edit ON public.citizen_registry AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT private.sheriff_can('registry_edit'))) WITH CHECK ((SELECT private.sheriff_can('registry_edit')));
CREATE POLICY sheriff_rank_weapon_add ON public.weapon_registry AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT private.sheriff_can('weapons_edit')));
CREATE POLICY sheriff_rank_weapon_edit ON public.weapon_registry AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT private.sheriff_can('weapons_edit'))) WITH CHECK ((SELECT private.sheriff_can('weapons_edit')));
CREATE POLICY sheriff_rank_evidence_add ON public.evidence_registry AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT private.sheriff_can('evidence_add')));
-- The evidence status RPC runs with definer rights, and must check the current rank itself.
CREATE OR REPLACE FUNCTION public.change_evidence_status(p_evidence_id uuid, p_new_status text, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $fn$
DECLARE oldrow public.evidence_registry%rowtype;
BEGIN
 IF auth.uid() IS NULL OR NOT private.sheriff_can('evidence_status') THEN
  RAISE EXCEPTION 'Grado insufficiente per cambiare lo stato delle prove';
 END IF;
 IF p_new_status NOT IN ('CUSTODIA','RESTITUITA','CONFISCATA','DISTRUTTA') THEN RAISE EXCEPTION 'Stato non valido'; END IF;
 IF length(trim(coalesce(p_reason,'')))<5 THEN RAISE EXCEPTION 'Motivazione obbligatoria'; END IF;
 SELECT * INTO oldrow FROM public.evidence_registry WHERE id=p_evidence_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Prova inesistente'; END IF;
 IF oldrow.status=p_new_status THEN RAISE EXCEPTION 'Stato invariato'; END IF;
 UPDATE public.evidence_registry SET status=p_new_status,updated_at=now() WHERE id=p_evidence_id;
 INSERT INTO public.evidence_movements(evidence_id,action,reason,previous_status,new_status,changed_by,changed_by_name)
 VALUES(p_evidence_id,'CAMBIO_STATO',trim(p_reason),oldrow.status,p_new_status,auth.uid(),public.current_sheriff_name());
END
$fn$;
COMMIT;
