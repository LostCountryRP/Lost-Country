-- Lost Country: esecuzione pena e stato di irreperibilita per verbale.
-- Applicare dal SQL Editor del progetto Supabase.
create table if not exists public.case_enforcement (
 case_id uuid primary key references public.cases(id) on delete cascade,
 jail_served boolean not null default false,
 jail_served_at timestamptz,
 evading boolean not null default false,
 evading_reason text,
 updated_at timestamptz not null default now(),
 updated_by uuid not null default auth.uid()
);
alter table public.case_enforcement enable row level security;
grant select, insert, update on public.case_enforcement to authenticated;
drop policy if exists case_enforcement_read on public.case_enforcement;
create policy case_enforcement_read on public.case_enforcement for select to authenticated
using (nullif(trim(public.current_sheriff_name()),'') is not null);
drop policy if exists case_enforcement_write on public.case_enforcement;
create policy case_enforcement_write on public.case_enforcement for insert to authenticated
with check (updated_by=auth.uid() and nullif(trim(public.current_sheriff_name()),'') is not null);
drop policy if exists case_enforcement_edit on public.case_enforcement;
create policy case_enforcement_edit on public.case_enforcement for update to authenticated
using (nullif(trim(public.current_sheriff_name()),'') is not null)
with check (updated_by=auth.uid() and nullif(trim(public.current_sheriff_name()),'') is not null);
