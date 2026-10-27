-- Trasferimento una tantum: gli account sceriffo già presenti
-- mantengono le funzionalità originarie, in attesa che l'admin scelga il grado.
BEGIN;
WITH changed AS (
 UPDATE public.sheriff_members SET rank='sheriff' WHERE rank='deputy'
 RETURNING user_id
)
INSERT INTO public.sheriff_rank_history
 (user_id,previous_rank,new_rank,changed_by,reason)
SELECT user_id,'deputy','sheriff',NULL,
 'Migrazione iniziale: mantenimento dei permessi preesistenti'
FROM changed;
ALTER TABLE public.sheriff_members ALTER COLUMN rank SET DEFAULT 'recruit';
COMMIT;