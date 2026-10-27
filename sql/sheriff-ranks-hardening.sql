
-- Impedisce agli agenti senza grado di comando di annullare ricerche
-- aggirando il pulsante "Chiudi ricerca" del portale.
CREATE OR REPLACE FUNCTION private.sheriff_enforcement_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path=''
AS $fn$
BEGIN
 IF OLD.evading IS TRUE AND NEW.evading IS FALSE
    AND NOT private.sheriff_can('close_wanted') THEN
  RAISE EXCEPTION 'Solo Vice Sceriffo o Sceriffo possono chiudere una ricerca';
 END IF;
 RETURN NEW;
END
$fn$;
DROP TRIGGER IF EXISTS sheriff_enforcement_rank_guard ON public.case_enforcement;
CREATE TRIGGER sheriff_enforcement_rank_guard
 BEFORE UPDATE ON public.case_enforcement
 FOR EACH ROW EXECUTE FUNCTION private.sheriff_enforcement_guard();

-- Le nuove contestazioni create dai Deputy non possono segnarsi come pagate
-- già in fase di inserimento per aggirare il permesso "registra pagamento".
CREATE POLICY sheriff_rank_offense_payment_initial ON public.case_offenses
 AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK ((SELECT private.sheriff_can('pay_fines')) OR
    (COALESCE(is_paid,FALSE)=FALSE AND paid_at IS NULL AND paid_by IS NULL));
