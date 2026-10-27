
CREATE OR REPLACE FUNCTION public.lc_assign_sheriff_rank(
 p_user_id uuid, p_rank text, p_actor uuid, p_reason text
) RETURNS TABLE(previous_rank text, assigned_rank text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $fn$
DECLARE old_rank text;
BEGIN
 IF p_rank NOT IN ('recruit','deputy','senior_deputy','vice_sheriff','sheriff') THEN
  RAISE EXCEPTION 'Grado non riconosciuto';
 END IF;
 IF length(btrim(coalesce(p_reason,'')))<5 THEN RAISE EXCEPTION 'Inserisci una motivazione di almeno 5 caratteri'; END IF;
 SELECT sm.rank INTO old_rank FROM public.sheriff_members sm WHERE sm.user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account sceriffo senza abilitazione'; END IF;
 IF old_rank=p_rank THEN RAISE EXCEPTION 'Il grado è già assegnato'; END IF;
 UPDATE public.sheriff_members SET rank=p_rank WHERE user_id=p_user_id;
 INSERT INTO public.sheriff_rank_history(user_id,previous_rank,new_rank,changed_by,reason)
 VALUES(p_user_id,old_rank,p_rank,p_actor,btrim(p_reason));
 RETURN QUERY SELECT old_rank,p_rank;
END
$fn$;
REVOKE ALL ON FUNCTION public.lc_assign_sheriff_rank(uuid,text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lc_assign_sheriff_rank(uuid,text,uuid,text) TO service_role;
