-- Lost Country RP | Gerarchia amministratori | applicata 24/10/2026
-- ARCHIVIO DELLE MIGRAZIONI GIA' APPLICATE: NON ESEGUIRE ALLA CIECA.
-- Mantenere la vecchia public.is_sheriff_admin() e la Edge Function degli Sceriffi
-- senza modifiche: l'accesso medico e agli Sceriffi e' ancora indipendente.

create table public.lc_admin_assignments(
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id),
 role text not null check(role in ('super_admin','admin','section_manager')),
 section text not null check(section in ('all','news','business','events','content')),
 active boolean not null default true,
 assigned_by uuid references auth.users(id),
 assigned_at timestamptz not null default now(),
 unique(user_id,role,section),
 constraint lc_admin_assignments_scope check(
   (role in ('super_admin','admin') and section='all') or
   (role='section_manager' and section<>'all'))
);
create index lc_admin_assignments_user_active on public.lc_admin_assignments(user_id,active);
alter table public.lc_admin_assignments enable row level security;
revoke all on public.lc_admin_assignments from PUBLIC,anon,authenticated;
grant select on public.lc_admin_assignments to authenticated;

-- Funzioni installate e versionate: gli helper definer leggono SOLO
-- le assegnazioni dell'utente corrente, mai un UID scelto dal client.
-- In Supabase cercare: lc_portal_is_super, lc_portal_is_admin,
-- lc_portal_can_manage, lc_my_portal_access, lc_set_portal_role.
-- La funzione di scrittura accetta solo role=admin o section_manager,
-- verifica prima lc_portal_is_super(), non permette di modificarsi,
-- e rifiuta sospensioni dell'admin storico Diego.

create policy lc_portal_role_super_read on public.lc_admin_assignments
 for select to authenticated using ((select public.lc_portal_is_super()));

create policy lc_manager_news_read on public.frontier_news
 for select to authenticated using ((select public.lc_portal_can_manage('news')));
create policy lc_manager_news_edit on public.frontier_news
 for update to authenticated using ((select public.lc_portal_can_manage('news')))
 with check ((select public.lc_portal_can_manage('news')));

create policy lc_manager_business_edit on public.commercial_registry
 for update to authenticated using ((select public.lc_portal_can_manage('business')))
 with check ((select public.lc_portal_can_manage('business')));

create policy lc_manager_events_edit on public.frontier_events
 for update to authenticated using ((select public.lc_portal_can_manage('events')))
 with check ((select public.lc_portal_can_manage('events')));

create policy lc_manager_content_read on public.lc_site_edits
 for select to authenticated using ((select public.lc_portal_can_manage('content')));
create policy lc_manager_content_insert on public.lc_site_edits
 for insert to authenticated with check ((select public.lc_portal_can_manage('content')));
create policy lc_manager_content_edit on public.lc_site_edits
 for update to authenticated using ((select public.lc_portal_can_manage('content')))
 with check ((select public.lc_portal_can_manage('content')));

create policy lc_portal_audit_admin_read on public.lc_admin_history
 for select to authenticated using ((select public.lc_portal_is_admin()));

create policy lc_portal_medics_admin_read on public.medical_staff
 for select to authenticated using ((select public.lc_portal_is_admin()));
create policy lc_portal_medics_admin_insert on public.medical_staff
 for insert to authenticated with check ((select public.lc_portal_is_admin()));
create policy lc_portal_medics_admin_update on public.medical_staff
 for update to authenticated using ((select public.lc_portal_is_admin()))
 with check ((select public.lc_portal_is_admin()));

create policy lc_portal_journalists_admin_read on public.journalist_staff
 for select to authenticated using ((select public.lc_portal_is_admin()));
create policy lc_portal_journalists_admin_insert on public.journalist_staff
 for insert to authenticated with check ((select public.lc_portal_is_admin()));
create policy lc_portal_journalists_admin_update on public.journalist_staff
 for update to authenticated using ((select public.lc_portal_is_admin()))
 with check ((select public.lc_portal_is_admin()));

create trigger lc_portal_role_history after insert or update on public.lc_admin_assignments
 for each row execute function public.lc_record_admin_change();

-- ASSEGNAZIONI BOOTSTRAP: Mineko super_admin, Diego admin.
insert into public.lc_admin_assignments(user_id,role,section,active)
values ('940f7bf3-f6ba-4ea2-9081-b3929fa4a682','super_admin','all',true),
       ('153d969d-0a90-454d-b800-465f24ce7101','admin','all',true)
on conflict(user_id,role,section) do nothing;

-- Per il testo esatto e aggiornato delle funzioni:
-- select pg_get_functiondef(p.oid) from pg_proc p
-- join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
-- and p.proname like 'lc_portal_%' or p.proname in
-- ('lc_my_portal_access','lc_set_portal_role');
