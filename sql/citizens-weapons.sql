-- Lost Country RP: anagrafe RP e seriali di armi.
create table if not exists public.citizen_registry (
 id uuid primary key default gen_random_uuid(),
 full_name text not null check(length(trim(full_name)) between 3 and 150),
 birth_date date,
 birthplace text,
 residence text,
 occupation text,
 notes text not null default '',
 created_at timestamptz not null default now(),
 created_by uuid not null default auth.uid(),
 updated_at timestamptz not null default now(),
 updated_by uuid not null default auth.uid()
);
create unique index if not exists citizen_registry_name_unique on public.citizen_registry(lower(trim(full_name)));
create table if not exists public.weapon_registry (
 id uuid primary key default gen_random_uuid(),
 serial_number text not null unique check(length(trim(serial_number)) between 3 and 80),
 weapon_type text not null check(length(trim(weapon_type)) between 2 and 120),
 owner_id uuid not null references public.citizen_registry(id) on delete restrict,
 status text not null default 'REGOLARE' check(status in ('REGOLARE','RUBATA','SEQUESTRATA','SMARRITA')),
 notes text not null default '',
 registered_at timestamptz not null default now(),
 registered_by uuid not null default auth.uid(),
 updated_at timestamptz not null default now(),
 updated_by uuid not null default auth.uid()
);
create table if not exists public.weapon_registry_history (
 id bigint generated always as identity primary key,
 weapon_id uuid not null references public.weapon_registry(id) on delete restrict,
 previous_owner_id uuid references public.citizen_registry(id),
 new_owner_id uuid references public.citizen_registry(id),
 previous_status text,
 new_status text,
 reason text not null,
 changed_at timestamptz not null default now(),
 changed_by uuid not null default auth.uid(),
 changed_by_name text not null
);
create or replace function public.log_weapon_registry_change()
returns trigger language plpgsql security invoker as $$
begin
 if tg_op='INSERT' then
  insert into public.weapon_registry_history(weapon_id,new_owner_id,new_status,reason,changed_by_name)
  values(new.id,new.owner_id,new.status,'Prima registrazione',public.current_sheriff_name());
 else
  if new.id is distinct from old.id or new.serial_number is distinct from old.serial_number
     or new.registered_at is distinct from old.registered_at or new.registered_by is distinct from old.registered_by then
    raise exception 'Seriale e dati originari non modificabili';
  end if;
  insert into public.weapon_registry_history(weapon_id,previous_owner_id,new_owner_id,previous_status,new_status,reason,changed_by_name)
  values(new.id,old.owner_id,new.owner_id,old.status,new.status,
   coalesce(nullif(current_setting('app.weapon_change_reason',true),''),'Variazione registro'),
   public.current_sheriff_name());
 end if;
 return new;
end $$;
drop trigger if exists weapon_registry_audit on public.weapon_registry;
create trigger weapon_registry_audit after insert or update on public.weapon_registry
for each row execute function public.log_weapon_registry_change();
do $$
declare t text;
begin
 foreach t in array array['citizen_registry','weapon_registry','weapon_registry_history'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
grant insert,update on public.citizen_registry, public.weapon_registry to authenticated;
grant usage,select on sequence public.weapon_registry_history_id_seq to authenticated;
grant insert on public.weapon_registry_history to authenticated;
drop policy if exists citizens_registry_read on public.citizen_registry;
create policy citizens_registry_read on public.citizen_registry for select to authenticated using (nullif(trim(public.current_sheriff_name()),'') is not null);
drop policy if exists citizens_registry_write on public.citizen_registry;
create policy citizens_registry_write on public.citizen_registry for insert to authenticated with check(created_by=auth.uid() and updated_by=auth.uid() and nullif(trim(public.current_sheriff_name()),'') is not null);
drop policy if exists citizens_registry_update on public.citizen_registry;
create policy citizens_registry_update on public.citizen_registry for update to authenticated using(nullif(trim(public.current_sheriff_name()),'') is not null) with check(updated_by=auth.uid());
drop policy if exists weapon_registry_read on public.weapon_registry;
create policy weapon_registry_read on public.weapon_registry for select to authenticated using(nullif(trim(public.current_sheriff_name()),'') is not null);
drop policy if exists weapon_registry_write on public.weapon_registry;
create policy weapon_registry_write on public.weapon_registry for insert to authenticated with check(registered_by=auth.uid() and updated_by=auth.uid() and nullif(trim(public.current_sheriff_name()),'') is not null);
drop policy if exists weapon_registry_update on public.weapon_registry;
create policy weapon_registry_update on public.weapon_registry for update to authenticated using(nullif(trim(public.current_sheriff_name()),'') is not null) with check(updated_by=auth.uid());
drop policy if exists weapon_history_read on public.weapon_registry_history;
create policy weapon_history_read on public.weapon_registry_history for select to authenticated using(nullif(trim(public.current_sheriff_name()),'') is not null);
drop policy if exists weapon_history_write on public.weapon_registry_history;
create policy weapon_history_write on public.weapon_registry_history for insert to authenticated with check(changed_by=auth.uid() and changed_by_name=public.current_sheriff_name());
