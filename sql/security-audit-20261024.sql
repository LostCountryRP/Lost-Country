-- Correzioni Supabase LostCountryRP, da eseguire con ruolo proprietario DB.
-- Preserva i dati RP esistenti.
revoke execute on function public.change_evidence_status(uuid,text,text) from public,anon;
revoke execute on function public.is_medical_staff() from public,anon;
revoke execute on function public.is_journalist_staff() from public,anon;
revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
alter function public.protect_city_ban_updates() set search_path = public,pg_temp;
alter function public.protect_license_update() set search_path = public,pg_temp;
-- Controllare separatamente Auth > Security per attivare leaked password protection.
-- L'anagrafe e le armi vengono create con sql/citizens-weapons.sql.
