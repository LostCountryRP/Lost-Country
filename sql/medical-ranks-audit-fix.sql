-- Correzione storico: una variazione di grado produce una sola voce di audit.
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
 PERFORM set_config('app.medical_rank_reason',btrim(p_reason),true);
 UPDATE public.medical_staff SET rank=p_new_rank WHERE user_id=p_user_id;
 PERFORM set_config('app.medical_rank_reason','',true);
END;
$fn$;
CREATE OR REPLACE FUNCTION private.medical_rank_direct_change_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE message text;
BEGIN
 IF OLD.rank IS DISTINCT FROM NEW.rank THEN
  message := NULLIF(btrim(current_setting('app.medical_rank_reason',true)),'');
  INSERT INTO public.medical_rank_history(user_id,old_rank,new_rank,changed_by,reason)
  VALUES(NEW.user_id,OLD.rank,NEW.rank,auth.uid(),
         COALESCE(message,'Modifica diretta amministrativa al grado sanitario'));
 END IF;
 RETURN NEW;
END;
$fn$;