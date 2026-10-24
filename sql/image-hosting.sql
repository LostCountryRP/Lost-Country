-- Lost Country RP: permessi Supabase Storage per il pannello image hosting.
-- Applicate direttamente al progetto il 24/10/2026.
-- NON rieseguire se le policy con questi nomi esistono gia'.
-- Prima creare dal pannello Supabase Storage il bucket pubblico "lc-image-hosting".
-- Limitare dal pannello MIME a jpeg/png/webp/gif e dimensioni a 10MB.

create policy lc_image_host_admin_list
on storage.objects
for select to authenticated
using (
 bucket_id = 'lc-image-hosting'
 and (select public.is_sheriff_admin())
);

create policy lc_image_host_admin_upload
on storage.objects
for insert to authenticated
with check (
 bucket_id = 'lc-image-hosting'
 and (select public.is_sheriff_admin())
 and name ~ '^uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[a-z0-9-]{1,55}\.(jpg|png|webp|gif)$'
);

create policy lc_image_host_admin_delete
on storage.objects
for delete to authenticated
using (
 bucket_id = 'lc-image-hosting'
 and (select public.is_sheriff_admin())
);

-- Nessuna policy UPDATE intenzionalmente.
-- Gli oggetti nel bucket public sono leggibili da chi conosce il link,
-- ma lista, upload e cancellazione restano sotto RLS.
