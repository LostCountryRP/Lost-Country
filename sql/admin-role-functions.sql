-- Lost Country RP | Funzioni ruolo gia' applicate a Supabase (24/10/2026).
-- Versione SQL per il ripristino. Prima creare lc_admin_assignments.
-- Non eseguire se le funzioni esistono senza controllo delle versioni.

CREATE OR REPLACE FUNCTION public.lc_my_portal_access()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
with me as (
 select role,section from public.lc_admin_assignments
 where user_id=(select auth.uid()) and active
), top_role as (
 select case
 when exists(select 1 from me where role='super_admin') then 'super_admin'
 when exists(select 1 from me where role='admin') then 'admin'
 when exists(select 1 from me where role='section_manager') then 'section_manager'
 else 'none' end as role
)
select jsonb_build_object(
 'role', top_role.role,
 'sections', case when top_role.role in ('super_admin','admin')
  then '["news","business","events","content"]'::jsonb
  else coalesce((select jsonb_agg(distinct section) from me where role='section_manager'),'[]'::jsonb) end,
 'legacy_sheriff_admin',coalesce(public.is_sheriff_admin(),false)
)
from top_role;
$function$;

CREATE OR REPLACE FUNCTION public.lc_portal_can_manage(p_section text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (select auth.uid()) is not null
     and p_section in ('news','business','events','content')
     and exists(
       select 1 from public.lc_admin_assignments a
       where a.user_id=(select auth.uid()) and a.active and
        ((a.role in ('super_admin','admin') and a.section='all') or
         (a.role='section_manager' and a.section=p_section))
     );
$function$;

CREATE OR REPLACE FUNCTION public.lc_portal_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select (select auth.uid()) is not null and exists(
 select 1 from public.lc_admin_assignments
 where user_id=(select auth.uid()) and role in ('super_admin','admin') and section='all' and active);
$function$;

CREATE OR REPLACE FUNCTION public.lc_portal_is_super()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.lc_admin_assignments a
      where a.user_id=(select auth.uid()) and a.role='super_admin'
        and a.section='all' and a.active
    );
$function$;

CREATE OR REPLACE FUNCTION public.lc_set_portal_role(p_user_id uuid, p_role text, p_section text, p_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not public.lc_portal_is_super() then
   raise exception 'Accesso non autorizzato' using errcode='42501';
 end if;
 if p_user_id is null or p_user_id=auth.uid()
    or p_role not in ('admin','section_manager')
    or p_active is null
    or (p_role='admin' and p_section<>'all')
    or (p_role='section_manager' and p_section not in ('news','business','events','content')) then
    raise exception 'Ruolo o sezione non validi' using errcode='22023';
 end if;
 if exists(select 1 from public.lc_admin_assignments
          where user_id=p_user_id and role='super_admin') then
    raise exception 'Account Super Amministratore non modificabile';
 end if;
 -- Diego mantiene permessi storici indipendenti: mai simulare una revoca globale.
 if not p_active and p_role='admin'
   and p_user_id='153d969d-0a90-454d-b800-465f24ce7101'::uuid then
    raise exception 'Amministratore storico: revoca da coordinare con le autorizzazioni Sceriffi';
 end if;
 if p_active and p_role='admin' and exists(
     select 1 from public.lc_admin_assignments where user_id=p_user_id
       and role='section_manager' and active
 ) then raise exception 'Sospendi prima i ruoli di responsabile'; end if;
 if p_active and p_role='section_manager' and exists(
     select 1 from public.lc_admin_assignments where user_id=p_user_id
       and role='admin' and active
 ) then raise exception 'Sospendi prima il ruolo amministratore'; end if;
 if p_active then
  insert into public.lc_admin_assignments(user_id,role,section,active,assigned_by)
  values(p_user_id,p_role,p_section,true,auth.uid())
  on conflict(user_id,role,section) do update
  set active=true,assigned_by=auth.uid(),assigned_at=now();
 else
  update public.lc_admin_assignments set active=false,assigned_by=auth.uid(),assigned_at=now()
  where user_id=p_user_id and role=p_role and section=p_section;
  if not found then raise exception 'Assegnazione non trovata'; end if;
 end if;
end $function$;
-- Solo authenticated; ogni funzione verifica l'identita' Supabase.
revoke all on function public.lc_portal_is_super() from PUBLIC,anon;
revoke all on function public.lc_portal_is_admin() from PUBLIC,anon;
revoke all on function public.lc_portal_can_manage(text) from PUBLIC,anon;
revoke all on function public.lc_my_portal_access() from PUBLIC,anon;
revoke all on function public.lc_set_portal_role(uuid,text,text,boolean) from PUBLIC,anon;
grant execute on function public.lc_portal_is_super() to authenticated;
grant execute on function public.lc_portal_is_admin() to authenticated;
grant execute on function public.lc_portal_can_manage(text) to authenticated;
grant execute on function public.lc_my_portal_access() to authenticated;
grant execute on function public.lc_set_portal_role(uuid,text,text,boolean) to authenticated;
