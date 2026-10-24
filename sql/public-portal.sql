-- Portale pubblico Lost Country: giornale, imprese ed eventi. 
create table if not exists public.frontier_news (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 5 and 160),
 body text not null check(length(trim(body)) between 20 and 12000),
 category text not null default 'Cronaca',
 published_at timestamptz not null default now(),
 author_name text not null,
 created_by uuid not null default auth.uid(),
 is_published boolean not null default true
);
create table if not exists public.commercial_registry (
 id uuid primary key default gen_random_uuid(),
 business_name text not null check(length(trim(business_name)) between 3 and 150),
 category text not null,
 town text not null,
 owner_name text not null,
 description text not null default '',
 status text not null default 'ATTIVA' check(status in ('ATTIVA','SOSPESA','CHIUSA')),
 created_at timestamptz not null default now(),
 created_by uuid not null default auth.uid()
);
create table if not exists public.frontier_events (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 3 and 160),
 description text not null default '',
 town text not null,
 location_name text not null,
 starts_at timestamptz not null,
 ends_at timestamptz,
 organizer text not null,
 created_at timestamptz not null default now(),
 created_by uuid not null default auth.uid(),
 is_cancelled boolean not null default false,
 constraint frontier_events_dates check(ends_at is null or ends_at>starts_at)
);
do $$ declare t text; begin
 foreach t in array array['frontier_news','commercial_registry','frontier_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('grant select on public.%I to anon, authenticated',t);
  execute format('revoke insert,update,delete,truncate,references,trigger on public.%I from anon',t);
  execute format('revoke update,delete,truncate,references,trigger on public.%I from authenticated',t);
  execute format('grant insert on public.%I to authenticated',t);
 end loop;
end $$;
drop policy if exists frontier_news_public on public.frontier_news;
create policy frontier_news_public on public.frontier_news for select to anon,authenticated using (is_published);
-- La scrittura del giornale è gestita esclusivamente da journalist-staff.sql.
-- Non sovrascrivere le policy della redazione quando questo script viene rieseguito.
drop policy if exists commercial_public on public.commercial_registry;
create policy commercial_public on public.commercial_registry for select to anon,authenticated using(true);
drop policy if exists commercial_write on public.commercial_registry;
create policy commercial_write on public.commercial_registry for insert to authenticated with check(created_by=auth.uid() and nullif(trim(public.current_sheriff_name()),'') is not null);
drop policy if exists events_public on public.frontier_events;
create policy events_public on public.frontier_events for select to anon,authenticated using(true);
drop policy if exists events_write on public.frontier_events;
create policy events_write on public.frontier_events for insert to authenticated with check(created_by=auth.uid() and nullif(trim(public.current_sheriff_name()),'') is not null);
-- Attività ed eventi riservati agli Sceriffi; giornale alla redazione.
revoke update on public.frontier_news,public.commercial_registry,public.frontier_events from authenticated;
