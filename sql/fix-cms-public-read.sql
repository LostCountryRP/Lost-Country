-- Correzione lettura CMS: nessuna funzione privata nelle policy anonime.
alter policy lc_site_edits_public_read on public.lc_site_edits
 using (enabled);
drop policy if exists lc_site_edits_admin_read on public.lc_site_edits;
create policy lc_site_edits_admin_read on public.lc_site_edits
 for select to authenticated using ((select public.is_sheriff_admin()));
