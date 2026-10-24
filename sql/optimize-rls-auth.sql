-- Calcola auth.uid una volta per query, preservando condizioni e ruoli.
do $$
declare p record; q text; w text;
begin
 for p in select * from pg_policies where schemaname='public'
 and policyname in (
 'events_write','city_bans_insert_sheriffs','city_bans_revoke_sheriffs',
 'case_enforcement_write','case_enforcement_edit','licenses_sheriff_issue',
 'licenses_sheriff_revoke','commercial_write','evidence_insert','medical_staff_self',
 'medical_insert','journalist_staff_self','frontier_news_write',
 'citizens_registry_write','citizens_registry_update','weapon_registry_write','weapon_registry_update')
 loop
  q:=p.qual; w:=p.with_check;
  if q is not null and position('SELECT auth.uid()' in q)=0 then
   q:=replace(q,'auth.uid()','(SELECT auth.uid())');
  end if;
  if w is not null and position('SELECT auth.uid()' in w)=0 then
   w:=replace(w,'auth.uid()','(SELECT auth.uid())');
  end if;
  execute format('alter policy %I on public.%I',p.policyname,p.tablename)
   || case when q is null then '' else ' using ('||q||')' end
   || case when w is null then '' else ' with check ('||w||')' end;
 end loop;
end $$;
