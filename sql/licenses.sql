-- Lost Country RP — Registro licenze, prima categoria: ricerca dell'oro.
create table if not exists public.licenses (
 id uuid primary key default gen_random_uuid(),
 license_number text unique not null default ('LC-LIC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
 license_type text not null default 'RICERCA_ORO' check (license_type='RICERCA_ORO'),
 citizen_name text not null check (char_length(trim(citizen_name)) between 3 and 150),
 issued_at timestamptz not null default now(),
 expires_at timestamptz not null,
 notes text not null default '',
 issued_by uuid not null default auth.uid(),
 issued_by_name text not null,
 revoked_at timestamptz,
 revoked_by uuid,
 revoked_by_name text,
 revocation_reason text,
 created_at timestamptz not null default now(),
 constraint licenses_expiry_after_issue check (expires_at > issued_at)
);
create index if not exists licenses_citizen_idx on public.licenses (lower(citizen_name));
alter table public.licenses enable row level security;
revoke all on public.licenses from anon;
grant select,insert,update on public.licenses to authenticated;
drop policy if exists licenses_sheriff_read on public.licenses;
create policy licenses_sheriff_read on public.licenses for select to authenticated
using (nullif(trim(public.current_sheriff_name()),'') is not null);
drop policy if exists licenses_sheriff_issue on public.licenses;
create policy licenses_sheriff_issue on public.licenses for insert to authenticated
with check (issued_by=auth.uid() and issued_by_name=public.current_sheriff_name()
and revoked_at is null and revoked_by is null and revoked_by_name is null and revocation_reason is null);
drop policy if exists licenses_sheriff_revoke on public.licenses;
create policy licenses_sheriff_revoke on public.licenses for update to authenticated
using (nullif(trim(public.current_sheriff_name()),'') is not null and revoked_at is null)
with check (revoked_by=auth.uid() and revoked_by_name=public.current_sheriff_name()
and revoked_at is not null and nullif(trim(revocation_reason),'') is not null);
create or replace function public.protect_license_update()
returns trigger language plpgsql as $$
begin
 if old.revoked_at is not null then raise exception 'Licenza già revocata'; end if;
 if (to_jsonb(new) - 'revoked_at' - 'revoked_by' - 'revoked_by_name' - 'revocation_reason')
    is distinct from (to_jsonb(old) - 'revoked_at' - 'revoked_by' - 'revoked_by_name' - 'revocation_reason')
 then raise exception 'I dati originali della licenza non sono modificabili'; end if;
 if new.revoked_at is null or new.revoked_by is distinct from auth.uid()
 or new.revoked_by_name is distinct from public.current_sheriff_name()
 or nullif(trim(new.revocation_reason),'') is null
 then raise exception 'Revoca non valida'; end if;
 return new;
end $$;
drop trigger if exists licenses_protect_update on public.licenses;
create trigger licenses_protect_update before update on public.licenses
for each row execute function public.protect_license_update();
