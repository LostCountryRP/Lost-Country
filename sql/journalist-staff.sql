-- Solo installazione iniziale; protegge i grant della console.
do $$ begin
 if to_regclass('public.lc_admin_assignments') is not null then
 raise exception 'Console gia installata: usare migrazioni incrementali, non journalist-staff.sql';
 end if;
end $$;
-- Ruolo autonomo per la redazione di La Voce della Frontiera.
create table if not exists public.journalist_staff (
 user_id uuid primary key references auth.users(id) on delete cascade,
 pen_name text not null,
 active boolean not null default true
);
alter table public.journalist_staff enable row level security;
revoke all on public.journalist_staff from anon;
revoke insert,update,delete,truncate,references,trigger on public.journalist_staff from authenticated;
grant select on public.journalist_staff to authenticated;
drop policy if exists journalist_staff_self on public.journalist_staff;
create policy journalist_staff_self on public.journalist_staff for select to authenticated using(user_id=auth.uid());
create or replace function public.is_journalist_staff() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.journalist_staff where user_id=auth.uid() and active)
$$;
revoke all on function public.is_journalist_staff() from public;
grant execute on function public.is_journalist_staff() to authenticated;
drop policy if exists frontier_news_write on public.frontier_news;
create policy frontier_news_write on public.frontier_news for insert to authenticated
with check(created_by=auth.uid() and public.is_journalist_staff()
and author_name=(select pen_name from public.journalist_staff where user_id=auth.uid() and active));
-- Autorizzazione giornalista (inserire un ID reale da Authentication > Users):
-- insert into public.journalist_staff(user_id,pen_name) values ('UUID-UTENTE','Nome giornalista RP');

-- Corregge la lettura pubblica senza dipendere dai permessi Sceriffo.
-- Non modifica articoli o autorizzazioni di scrittura.
drop policy if exists frontier_news_public on public.frontier_news;
create policy frontier_news_public on public.frontier_news for select to anon,authenticated using (is_published);
drop policy if exists frontier_news_author_read on public.frontier_news;
create policy frontier_news_author_read on public.frontier_news for select to authenticated using (created_by=(select auth.uid()) and exists (select 1 from public.journalist_staff where user_id=(select auth.uid()) and active));
