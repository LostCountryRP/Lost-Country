-- LOST COUNTRY RP — Bilanci separati Ufficio Sceriffi / Servizio Medico (2026-10-27).
-- Valuta di gioco: dollari RP ($). Movimenti immutabili: rettifiche con nuovo movimento inverso.
BEGIN;
CREATE TABLE IF NOT EXISTS public.office_finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office text NOT NULL CHECK (office IN ('sheriff','medical')),
  direction text NOT NULL CHECK (direction IN ('income','expense')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  category text NOT NULL CHECK (length(btrim(category)) BETWEEN 2 AND 80),
  description text NOT NULL CHECK (length(btrim(description)) BETWEEN 5 AND 1000),
  reference_code text CHECK (reference_code IS NULL OR length(reference_code) <= 80),
  occurred_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_by_name text NOT NULL CHECK (length(btrim(created_by_name)) >= 2)
);
CREATE INDEX IF NOT EXISTS office_finance_entries_recent_idx
 ON public.office_finance_entries(office,occurred_on DESC,created_at DESC);

-- Le funzioni private consultano le assegnazioni, mai attributi modificabili dall'utente.
CREATE OR REPLACE FUNCTION private.office_finance_can(p_office text,p_write boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT CASE p_office
 WHEN 'sheriff' THEN EXISTS (
  SELECT 1 FROM public.sheriff_members sm WHERE sm.user_id=(SELECT auth.uid())
   AND (NOT p_write OR sm.rank IN ('senior_deputy','vice_sheriff','sheriff')
        OR public.is_sheriff_admin())
 )
 WHEN 'medical' THEN EXISTS (
  SELECT 1 FROM public.medical_staff ms WHERE ms.user_id=(SELECT auth.uid())
    AND ms.active=true AND (NOT p_write OR ms.rank IN ('chief_physician','medical_director'))
 )
 ELSE false END;
$fn$;
REVOKE ALL ON FUNCTION private.office_finance_can(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.office_finance_can(text,boolean) TO authenticated,service_role;

ALTER TABLE public.office_finance_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.office_finance_entries FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.office_finance_entries TO authenticated;
CREATE POLICY office_finance_read_authorized
 ON public.office_finance_entries FOR SELECT TO authenticated
 USING ((SELECT private.office_finance_can(office,false)));
-- Nessuna policy INSERT/UPDATE/DELETE per gli utenti browser: soltanto RPC di inserimento
-- con identità e grado verificati sul database.

CREATE OR REPLACE FUNCTION public.lc_office_finance_add(
 p_office text,p_direction text,p_amount numeric,p_category text,
 p_description text,p_occurred_on date DEFAULT NULL,p_reference_code text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE actor uuid; actor_name text; movement_id uuid;
BEGIN
 actor:=(SELECT auth.uid());
 IF actor IS NULL OR NOT private.office_finance_can(p_office,true) THEN
  RAISE EXCEPTION 'Non hai il grado necessario per registrare movimenti in questo ufficio' USING ERRCODE='42501';
 END IF;
 IF p_direction NOT IN ('income','expense') THEN
  RAISE EXCEPTION 'Tipo di movimento non valido' USING ERRCODE='22023';
 END IF;
 IF p_amount IS NULL OR p_amount<=0 OR p_amount>999999999.99 OR p_amount<>round(p_amount,2) THEN
  RAISE EXCEPTION 'Inserisci un importo positivo con massimo due decimali' USING ERRCODE='22023';
 END IF;
 IF length(btrim(coalesce(p_category,''))) NOT BETWEEN 2 AND 80 OR
    length(btrim(coalesce(p_description,''))) NOT BETWEEN 5 AND 1000 OR
    length(btrim(coalesce(p_reference_code,'')))>80 THEN
  RAISE EXCEPTION 'Compila correttamente categoria, causale (minimo 5 caratteri) e riferimento' USING ERRCODE='22023';
 END IF;
 IF COALESCE(p_occurred_on,current_date)>current_date THEN
  RAISE EXCEPTION 'La data del movimento non può essere futura' USING ERRCODE='22023';
 END IF;
 IF p_office='sheriff' THEN
  SELECT sm.officer_name INTO actor_name FROM public.sheriff_members sm WHERE sm.user_id=actor;
 ELSE
  SELECT ms.display_name INTO actor_name FROM public.medical_staff ms WHERE ms.user_id=actor AND ms.active=true;
 END IF;
 IF actor_name IS NULL THEN RAISE EXCEPTION 'Identità ufficio non disponibile' USING ERRCODE='42501'; END IF;
 INSERT INTO public.office_finance_entries
 (office,direction,amount,category,description,reference_code,occurred_on,created_by,created_by_name)
 VALUES(p_office,p_direction,p_amount,btrim(p_category),btrim(p_description),
        NULLIF(btrim(coalesce(p_reference_code,'')),''),COALESCE(p_occurred_on,current_date),
        actor,btrim(actor_name)) RETURNING id INTO movement_id;
 RETURN movement_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.lc_office_finance_add(text,text,numeric,text,text,date,text)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lc_office_finance_add(text,text,numeric,text,text,date,text)
 TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.lc_office_finance_overview(
 p_office text,p_from date,p_to date
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE result jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT private.office_finance_can(p_office,false) THEN
  RAISE EXCEPTION 'Accesso al bilancio non autorizzato' USING ERRCODE='42501';
 END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_from>=p_to OR p_to>current_date+interval '2 years' THEN
  RAISE EXCEPTION 'Periodo non valido' USING ERRCODE='22023';
 END IF;
 SELECT jsonb_build_object(
  'total_income',COALESCE(sum(amount) FILTER(WHERE direction='income'),0),
  'total_expenses',COALESCE(sum(amount) FILTER(WHERE direction='expense'),0),
  'balance',COALESCE(sum(CASE direction WHEN 'income' THEN amount ELSE -amount END),0),
  'period_income',COALESCE(sum(amount) FILTER(WHERE direction='income' AND occurred_on>=p_from AND occurred_on<p_to),0),
  'period_expenses',COALESCE(sum(amount) FILTER(WHERE direction='expense' AND occurred_on>=p_from AND occurred_on<p_to),0),
  'period_balance',COALESCE(sum(CASE direction WHEN 'income' THEN amount ELSE -amount END)
     FILTER(WHERE occurred_on>=p_from AND occurred_on<p_to),0),
  'period_count',count(*) FILTER(WHERE occurred_on>=p_from AND occurred_on<p_to)
 ) INTO result
 FROM public.office_finance_entries WHERE office=p_office;
 RETURN result;
END;
$fn$;
REVOKE ALL ON FUNCTION public.lc_office_finance_overview(text,date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lc_office_finance_overview(text,date,date) TO authenticated,service_role;
COMMIT;