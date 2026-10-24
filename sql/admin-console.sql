-- Lost Country RP | Console Amministratori | 24/10/2026
-- Le policy qui elencate sono state applicate sul database Supabase.
-- Questo file serve per versionamento/ripristino; NON rieseguirlo
-- dove esistono gia policy con i medesimi nomi.
-- Amministratori ammessi: definiti nella funzione public.is_sheriff_admin().
-- Si presuppone che le tabelle abbiano RLS abilitata.

-- Pubblicazioni e moderazione (senza cancellazione definitiva).
create policy lc_admin_all_news_read on public.frontier_news
for select to authenticated using ((select public.is_sheriff_admin()));
create policy lc_admin_edit_news on public.frontier_news
for update to authenticated using ((select public.is_sheriff_admin()))
with check ((select public.is_sheriff_admin()));
create policy lc_admin_edit_business on public.commercial_registry
for update to authenticated using ((select public.is_sheriff_admin()))
with check ((select public.is_sheriff_admin()));
create policy lc_admin_edit_events on public.frontier_events
for update to authenticated using ((select public.is_sheriff_admin()))
with check ((select public.is_sheriff_admin()));
grant update on public.frontier_news,public.commercial_registry,public.frontier_events to authenticated;

-- Gestione assegnazioni ruolo medico e redazione, senza eliminare gli account.
create policy lc_admin_medical_staff_read on public.medical_staff
for select to authenticated using ((select public.is_sheriff_admin()));
create policy lc_admin_medical_staff_insert on public.medical_staff
for insert to authenticated with check ((select public.is_sheriff_admin()));
create policy lc_admin_medical_staff_update on public.medical_staff
for update to authenticated using ((select public.is_sheriff_admin()))
with check ((select public.is_sheriff_admin()));
create policy lc_admin_journalist_staff_read on public.journalist_staff
for select to authenticated using ((select public.is_sheriff_admin()));
create policy lc_admin_journalist_staff_insert on public.journalist_staff
for insert to authenticated with check ((select public.is_sheriff_admin()));
create policy lc_admin_journalist_staff_update on public.journalist_staff
for update to authenticated using ((select public.is_sheriff_admin()))
with check ((select public.is_sheriff_admin()));

-- Nessuna policy DELETE aggiunta.
-- Le autorizzazioni sul database dipendono anche dai GRANT e dalle altre policy esistenti.
