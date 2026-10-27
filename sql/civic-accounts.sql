-- Additive deployment: independent civic accounts; preserve existing sheriff access.
create table public.civic_staff (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (length(btrim(display_name)) between 2 and 120),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.civic_staff enable row level security;
revoke all on public.civic_staff from public, anon, authenticated;
grant select on public.civic_staff to authenticated;
grant all on public.civic_staff to service_role;
create policy civic_staff_self on public.civic_staff for select to authenticated
 using (user_id = (select auth.uid()));
create policy civic_business_insert on public.commercial_registry for insert to authenticated
 with check (created_by = (select auth.uid()) and (
  exists(select 1 from public.civic_staff where user_id=(select auth.uid()) and active)
  or (select public.lc_portal_is_admin()) or (select public.is_sheriff_admin())
 ));
create policy civic_events_insert on public.frontier_events for insert to authenticated
 with check (created_by = (select auth.uid()) and (
  exists(select 1 from public.civic_staff where user_id=(select auth.uid()) and active)
  or (select public.lc_portal_is_admin()) or (select public.is_sheriff_admin())
 ));
