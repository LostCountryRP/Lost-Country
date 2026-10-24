-- Lost Country RP — prove e sequestri + cartelle mediche RP.
-- Eseguire dal SQL Editor Supabase. Dati fittizi del gioco, non reali.
create table if not exists public.evidence_registry (
 id uuid primary key default gen_random_uuid(),
 reference_code text unique not null default ('PR-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
 case_id uuid references public.cases(id) on delete set null,
 citizen_id uuid references public.citizens(id) on delete set null,
 title text not null check(length(trim(title)) between 3 and 160),
 category text not null check(category in ('ARMA','OGGETTO','DOCUMENTO','ALTRO')),
 description text not null check(length(trim(description))>=10),
 storage_location text not null,
 status text not null default 'CUSTODIA' check(status in ('CUSTODIA','RESTITUITA','CONFISCATA','DISTRUTTA')),
 recorded_at timestamptz not null default now(),
 recorded_by uuid not null default auth.uid(),
 recorded_by_name text not null,
 updated_at timestamptz not null default now()
);
create table if not exists public.evidence_movements (
 id uuid primary key default gen_random_uuid(),
 evidence_id uuid not null references public.evidence_registry(id) on delete restrict,
 action text not null,
 reason text not null check(length(trim(reason))>=5),
 previous_status text,
 new_status text,
 changed_at timestamptz not null default now(),
 changed_by uuid not null default auth.uid(),
 changed_by_name text not null
);
-- Solo gli operatori inseriti qui dal proprietario del database hanno accesso alle cartelle.
create table if not exists public.medical_staff (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null,
 active boolean not null default true
);
create table if not exists public.medical_records (
 id uuid primary key default gen_random_uuid(),
 patient_name text not null check(length(trim(patient_name)) between 3 and 150),
 visit_at timestamptz not null default now(),
 reason text not null check(length(trim(reason))>=5),
 findings text not null check(length(trim(findings))>=5),
 treatment text not null default '',
 notes text not null default '',
 physician_id uuid not null default auth.uid(),
 physician_name text not null,
 created_at timestamptz not null default now()
);
alter table public.evidence_registry enable row level security;
alter table public.evidence_movements enable row level security;
alter table public.medical_staff enable row level security;
alter table public.medical_records enable row level security;
revoke all on public.evidence_registry,public.evidence_movements,public.medical_staff,public.medical_records from anon;
grant select,insert on public.evidence_registry,public.evidence_movements to authenticated;
grant select on public.medical_staff to authenticated;
grant select,insert on public.medical_records to authenticated;
create or replace function public.is_medical_staff() returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.medical_staff where user_id=auth.uid() and active=true)
$$;
revoke all on function public.is_medical_staff() from public;
grant execute on function public.is_medical_staff() to authenticated;
drop policy if exists evidence_read on public.evidence_registry;
create policy evidence_read on public.evidence_registry for select to authenticated using(nullif(trim(public.current_sheriff_name()),'') is not null);
drop policy if exists evidence_insert on public.evidence_registry;
create policy evidence_insert on public.evidence_registry for insert to authenticated with check(recorded_by=auth.uid() and recorded_by_name=public.current_sheriff_name() and status='CUSTODIA');
drop policy if exists evidence_movements_read on public.evidence_movements;
create policy evidence_movements_read on public.evidence_movements for select to authenticated using(nullif(trim(public.current_sheriff_name()),'') is not null);
-- I movimenti sono creati soltanto dalla funzione sicura.
drop policy if exists medical_staff_self on public.medical_staff;
create policy medical_staff_self on public.medical_staff for select to authenticated using(user_id=auth.uid());
drop policy if exists medical_read on public.medical_records;
create policy medical_read on public.medical_records for select to authenticated using(public.is_medical_staff());
drop policy if exists medical_insert on public.medical_records;
create policy medical_insert on public.medical_records for insert to authenticated with check(public.is_medical_staff() and physician_id=auth.uid() and physician_name=(select display_name from public.medical_staff where user_id=auth.uid() and active));
create or replace function public.change_evidence_status(p_evidence_id uuid,p_new_status text,p_reason text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare oldrow public.evidence_registry%rowtype;
begin
 if auth.uid() is null or nullif(trim(public.current_sheriff_name()),'') is null then raise exception 'Sceriffo non autorizzato'; end if;
 if p_new_status not in ('CUSTODIA','RESTITUITA','CONFISCATA','DISTRUTTA') then raise exception 'Stato non valido'; end if;
 if length(trim(coalesce(p_reason,'')))<5 then raise exception 'Motivazione obbligatoria'; end if;
 select * into oldrow from public.evidence_registry where id=p_evidence_id for update;
 if not found then raise exception 'Prova inesistente'; end if;
 if oldrow.status=p_new_status then raise exception 'Stato invariato'; end if;
 update public.evidence_registry set status=p_new_status,updated_at=now() where id=p_evidence_id;
 insert into public.evidence_movements(evidence_id,action,reason,previous_status,new_status,changed_by,changed_by_name)
 values(p_evidence_id,'CAMBIO_STATO',trim(p_reason),oldrow.status,p_new_status,auth.uid(),public.current_sheriff_name());
end $$;
revoke all on function public.change_evidence_status(uuid,text,text) from public;
grant execute on function public.change_evidence_status(uuid,text,text) to authenticated;
-- ABILITAZIONE MEDICO: sostituire UUID con auth.users.id della persona autorizzata.
-- insert into public.medical_staff(user_id,display_name) values ('UUID-UTENTE','Nome Medico RP');
