-- Eseguire nell'SQL Editor di Supabase una sola volta.
create table if not exists public.city_bans (
 id uuid primary key default gen_random_uuid(),
 citizen_name text not null check (length(trim(citizen_name)) between 3 and 150),
 city text not null check (length(trim(city)) between 2 and 100),
 reason text not null check (length(trim(reason)) between 10 and 2000),
 issued_at timestamptz not null default now(),
 expires_at timestamptz,
 officer_name text not null,
 officer_id uuid not null default auth.uid(),
 revoked_at timestamptz,
 revoked_by uuid,
 revoked_by_name text,
 revoke_reason text,
 created_at timestamptz not null default now(),
 constraint city_bans_valid_expiry check (expires_at is null or expires_at > issued_at)
);
create index if not exists idx_city_bans_city on public.city_bans (city);
create index if not exists idx_city_bans_active on public.city_bans (revoked_at, expires_at);
alter table public.city_bans enable row level security;
revoke all on public.city_bans from anon;
grant select, insert, update on public.city_bans to authenticated;
drop policy if exists city_bans_read_sheriffs on public.city_bans;
create policy city_bans_read_sheriffs on public.city_bans for select to authenticated
using (nullif(trim(public.current_sheriff_name()), '') is not null);
drop policy if exists city_bans_insert_sheriffs on public.city_bans;
create policy city_bans_insert_sheriffs on public.city_bans for insert to authenticated
with check (auth.uid() = officer_id and officer_name = public.current_sheriff_name()
 and revoked_at is null and revoked_by is null and revoked_by_name is null and revoke_reason is null);
-- La revoca è consentita agli Sceriffi autenticati; il trigger ne tutela l'integrità.
create or replace function public.protect_city_ban_updates()
returns trigger language plpgsql security invoker as $$
begin
 if old.revoked_at is not null then raise exception 'Bando già revocato'; end if;
 if new.id is distinct from old.id or new.citizen_name is distinct from old.citizen_name
 or new.city is distinct from old.city or new.reason is distinct from old.reason
 or new.issued_at is distinct from old.issued_at or new.expires_at is distinct from old.expires_at
 or new.officer_name is distinct from old.officer_name or new.officer_id is distinct from old.officer_id
 or new.created_at is distinct from old.created_at then
 raise exception 'Non è consentito modificare i dati originali del bando';
 end if;
 if new.revoked_at is null or new.revoked_by is distinct from auth.uid()
 or new.revoked_by_name is distinct from public.current_sheriff_name()
 or nullif(trim(new.revoke_reason), '') is null then raise exception 'Revoca non valida'; end if;
 return new;
end $$;
drop trigger if exists city_ban_protect_updates on public.city_bans;
create trigger city_ban_protect_updates before update on public.city_bans
for each row execute function public.protect_city_ban_updates();
drop policy if exists city_bans_revoke_sheriffs on public.city_bans;
create policy city_bans_revoke_sheriffs on public.city_bans for update to authenticated
using (nullif(trim(public.current_sheriff_name()), '') is not null and revoked_at is null)
with check (revoked_by = auth.uid() and revoked_by_name = public.current_sheriff_name()
 and revoked_at is not null and nullif(trim(revoke_reason), '') is not null);
