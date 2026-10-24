-- Corregge la lettura pubblica senza dipendere dai permessi Sceriffo.
-- Non modifica articoli o autorizzazioni di scrittura.
drop policy if exists frontier_news_public on public.frontier_news;
create policy frontier_news_public on public.frontier_news for select to anon,authenticated using (is_published);
drop policy if exists frontier_news_author_read on public.frontier_news;
create policy frontier_news_author_read on public.frontier_news for select to authenticated using (created_by=(select auth.uid()) and exists (select 1 from public.journalist_staff where user_id=(select auth.uid()) and active));