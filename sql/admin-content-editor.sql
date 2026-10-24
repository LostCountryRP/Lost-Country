-- Lost Country RP: editor contenuti sito + registro operazioni.
-- APPLICATO SU SUPABASE 24/10/2026.
-- File per recupero/documentazione: NON rieseguire sulle tabelle gia' presenti
-- senza prima controllare migrazioni, trigger e policy.
-- Dipendenza: public.is_sheriff_admin().

create table public.lc_site_edits (
 page text not null,
 block_key text not null,
 html text not null,
 enabled boolean not null default true,
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id),
 primary key(page,block_key),
 constraint lc_site_edits_page_allowed check(page in ('index.html','approfondimenti.html','codice-penale.html')),
 constraint lc_site_edits_key_allowed check(block_key ~ '^(rule|deep|law)-[0-9]{3}$'),
 constraint lc_site_edits_key_page check (
  (page='index.html' and block_key like 'rule-%') or
  (page='approfondimenti.html' and block_key like 'deep-%') or
  (page='codice-penale.html' and block_key like 'law-%')),
 constraint lc_site_edits_html_limit check(char_length(html) between 1 and 20000)
);
create index lc_site_edits_editor_idx on public.lc_site_edits(updated_by);
alter table public.lc_site_edits enable row level security;
revoke all on public.lc_site_edits from anon,authenticated;
grant select on public.lc_site_edits to anon,authenticated;
grant insert,update on public.lc_site_edits to authenticated;

create policy lc_site_edits_public_read on public.lc_site_edits
 for select to anon,authenticated using (enabled);
create policy lc_site_edits_admin_read on public.lc_site_edits
 for select to authenticated using ((select public.is_sheriff_admin()));
create policy lc_site_edits_admin_insert on public.lc_site_edits
 for insert to authenticated with check ((select public.is_sheriff_admin()));
create policy lc_site_edits_admin_update on public.lc_site_edits
 for update to authenticated using ((select public.is_sheriff_admin()))
 with check ((select public.is_sheriff_admin()));

create table public.lc_admin_history (
 id bigint generated always as identity primary key,
 changed_at timestamptz not null default now(),
 changed_by uuid,
 section text not null,
 entity_id text not null,
 action text not null,
 before_value jsonb,
 after_value jsonb
);
create index lc_admin_history_latest on public.lc_admin_history(changed_at desc);
create index lc_admin_history_entity on public.lc_admin_history(section,entity_id,changed_at desc);
alter table public.lc_admin_history enable row level security;
revoke all on public.lc_admin_history from anon,authenticated;
grant select on public.lc_admin_history to authenticated;
create policy lc_admin_history_read on public.lc_admin_history
 for select to authenticated using ((select public.is_sheriff_admin()));

create function public.lc_site_edits_stamp()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 new.updated_by := auth.uid();
 new.updated_at := now();
 if tg_op='UPDATE' then new.version := old.version+1; else new.version:=1; end if;
 return new;
end $$;
revoke all on function public.lc_site_edits_stamp() from PUBLIC,anon,authenticated;
create trigger lc_site_edits_stamping
 before insert or update on public.lc_site_edits
 for each row execute function public.lc_site_edits_stamp();

create function public.lc_record_admin_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare rid text;
begin
 if tg_table_name='lc_site_edits' then
   rid := new.page||':'||new.block_key;
 elsif tg_table_name in ('journalist_staff','medical_staff') then
   rid := new.user_id::text;
 else
   rid := new.id::text;
 end if;
 insert into public.lc_admin_history(changed_by,section,entity_id,action,before_value,after_value)
 values(auth.uid(),tg_table_name,rid,tg_op,
   case when tg_op='INSERT' then null else to_jsonb(old) end,to_jsonb(new));
 return new;
end $$;
revoke all on function public.lc_record_admin_change() from PUBLIC,anon,authenticated;
create trigger lc_site_edits_history after insert or update on public.lc_site_edits
 for each row execute function public.lc_record_admin_change();
create trigger lc_news_history after insert or update on public.frontier_news
 for each row execute function public.lc_record_admin_change();
create trigger lc_business_history after insert or update on public.commercial_registry
 for each row execute function public.lc_record_admin_change();
create trigger lc_events_history after insert or update on public.frontier_events
 for each row execute function public.lc_record_admin_change();
create trigger lc_medical_staff_history after insert or update on public.medical_staff
 for each row execute function public.lc_record_admin_change();
create trigger lc_journalist_staff_history after insert or update on public.journalist_staff
 for each row execute function public.lc_record_admin_change();
