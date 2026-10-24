-- Indici mancanti verificati il 24/10/2026. Nessuna modifica ai dati.
create index if not exists case_offenses_paid_by_fk_idx on public.case_offenses (paid_by);
create index if not exists wanted_closures_closed_by_fk_idx on public.wanted_closures (closed_by);
create index if not exists citizens_created_by_fk_idx on public.citizens (created_by);
create index if not exists cases_created_by_fk_idx on public.cases (created_by);
create index if not exists evidence_registry_citizen_id_fk_idx on public.evidence_registry (citizen_id);
create index if not exists evidence_movements_evidence_id_fk_idx on public.evidence_movements (evidence_id);
create index if not exists evidence_registry_case_id_fk_idx on public.evidence_registry (case_id);
create index if not exists weapon_registry_owner_id_fk_idx on public.weapon_registry (owner_id);
create index if not exists weapon_registry_history_weapon_id_fk_idx on public.weapon_registry_history (weapon_id);
create index if not exists weapon_registry_history_previous_owner_id_fk_idx on public.weapon_registry_history (previous_owner_id);
create index if not exists weapon_registry_history_new_owner_id_fk_idx on public.weapon_registry_history (new_owner_id);
create index if not exists lc_admin_assignments_assigned_by_fk_idx on public.lc_admin_assignments (assigned_by);
