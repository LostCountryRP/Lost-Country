-- Ruolo autonomo per la redazione di La Voce della Frontiera.
create table if not exists public.journalist_staff (
 user_id uuid primary key references auth.users(id) on delete cascade,
 pen_name text not null,
 active boolean not null default true
);
alter table public.journalist_staff enable row level security;
revoke all on public.journalist_staff from anon;
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
