# Console Amministratori — Lost Country RP

**URL:** https://lostcountryrp.github.io/Lost-Country/amministrazione.html

## Accesso e sicurezza
- La console usa Supabase Auth e consente l'accesso ai soli account che superano \`public.is_sheriff_admin()\` (attualmente Mineko e Diego).
- Le verifiche effettive di scrittura avvengono in Supabase tramite Row Level Security, non tramite pulsanti nascosti.
- Non sono presenti chiavi di servizio o token GitHub nel browser. L'account del pannello non sostituisce il login amministrativo di GitHub o Supabase.
- Il registro medico rimane protetto dai permessi medici specifici; il pannello gestisce solo l'assegnazione e sospensione del ruolo.

## Sezioni gestibili
- **Giornale:** revisione di titolo/rubrica/testo, pubblicazione o ritiro di articoli.
- **Attività commerciali:** aggiornamento dati e stato ATTIVA/SOSPESA/CHIUSA.
- **Eventi:** modifica e annullamento/ripristino.
- **Utenti medici e giornalisti:** assegnazione ad account Supabase già esistenti tramite UID, sospensione e riattivazione.
- **Sceriffi:** collegamento al portale Sceriffi e alla gestione dedicata degli account (con ulteriori verifiche lato server).
- **Immagini:** accesso all'hosting e galleria separati.
- **Gestione tecnica:** link a repository GitHub, workflow di backup, console Supabase.

## Editor delle pagine informative (nuovo 24 ottobre 2026)
È disponibile nella console la sezione **Editor dei testi del sito**.
- Regolamento: 15 blocchi \`.rule-content\`.
- Approfondimenti: 18 blocchi \`.deep-dive-content\`.
- Codice Penale: 70 blocchi di descrizione/preambolo. **Non modifica gli importi delle pene**, che devono restare coerenti con le tabelle dei reati e il codice usato dall'ufficio Sceriffi.
- È possibile cercare un blocco, editarne l'HTML semplice, vedere l'anteprima, pubblicare e ripristinare il testo statico originale.
- Le revisioni vengono conservate nel registro delle modifiche. L'editor consente di caricare il testo precedente e ripubblicarlo.
- L'HTML dinamico viene filtrato lato client da \`lc-cms-core.js\`: nessuno script, stile iniettato o evento HTML è ammesso. Non modificare la whitelist senza analisi di sicurezza.
- I contenuti originali restano nei file HTML su GitHub. In caso di errore di rete o di database, le pagine pubbliche continuano a mostrare il testo originale.
- **Limite**: le pagine sono statiche e non esiste un editor visuale per tutta la struttura grafica, per le immagini della Lore o per aggiungere sezioni nuove. Tali modifiche richiedono ancora GitHub. I riferimenti ai blocchi \`data-lc-edit\` devono restare stabili nel tempo.

## Registro attività
La tabella \`lc_admin_history\` registra da quando è stata installata la funzionalità:
- Modifiche ai testi \`lc_site_edits\`;
- inserimenti/aggiornamenti su giornale, attività ed eventi;
- inserimenti/aggiornamenti delle abilitazioni mediche e giornalistiche.
Sono registrati orario, autore identificato dalla sessione Supabase, origine, ID record, valore prima e dopo (accessibile solo agli amministratori).
**Non è uno storico retroattivo.** Le modifiche agli account Sceriffo gestiti via Edge Function e i cambi nei file GitHub non vengono ancora raccolti qui.

## Deploy
- I file statici sono serviti da GitHub Pages dal branch principale.
- La struttura database per questa funzionalità è già stata installata su Supabase; non rilanciare automaticamente le DDL senza verificarne lo stato.
- Files: \`amministrazione-contenuti.js\`, \`lc-cms-core.js\`, \`lc-cms-public.js\`, \`amministrazione.html\`, \`amministrazione.js\`, \`amministrazione.css\`.
- Test database in transazione con rollback: inserimento -> modifica di testo -> incremento versione e due voci audit correttamente generati.
- Controllo statico della sintassi JS effettuato. Restano raccomandati test da browser autentico con account autorizzato e account non autorizzato.

## Gestione gerarchica dei permessi (24 ottobre 2026)

Ruoli correnti:
- **Super Amministratore**: Mineko, accesso alle funzioni del portale e delega dei ruoli. Non può sospendere autonomamente il proprio ruolo via pannello.
- **Amministratore**: Diego, gestione centrale di articoli, attività commerciali, eventi, testi e personale medico/giornalistico; non può assegnare amministratori.
- **Responsabile di sezione**: nominato dal Super Amministratore tramite UID Supabase già esistente. Si possono assegnare anche più sezioni: `news`, `business`, `events`, `content`. Non accede alla gestione ruoli, alla lista del personale, ai backup o al registro generale.
- Nessun ruolo di Responsabile è assegnato al momento dell'attivazione della funzione.

### Controlli tecnici
- `public.lc_admin_assignments` usa RLS; la tabella è leggibile solo dal Super Amministratore. I client non hanno privilegi diretti per inserire/aggiornare ruoli.
- `public.lc_set_portal_role(uid,role,section,active)` è l'unico endpoint per le assegnazioni, controlla a ogni invocazione la sessione corrente e impedisce escalation, auto-modifica e sospensione degli amministratori storici protetti.
- `public.lc_portal_can_manage(section)` è richiamata dalle policy RLS per Giornale, Attività, Eventi, Editor testi.
- `public.lc_portal_is_admin()` abilita le funzioni comuni della direzione: elenco e abilitazioni dei giornalisti e medici, storico amministrativo. **Non** concede accesso ai referti medici.
- Lo storico `lc_admin_history` registra anche l'attivazione e la sospensione dei nuovi ruoli.
- La console nasconde sezioni non autorizzate, ma la protezione reale è applicata nel database. L'editor testi può essere utilizzato da un Responsabile della sezione `content` senza esporre lo storico completo.

### Permessi specialistici non unificati
Le funzioni degli Sceriffi (`admin-sceriffi.html` e `manage-sheriffs`) e l'hosting immagini possiedono ancora controlli specialistici legati a `is_sheriff_admin()`. Un nuovo **Amministratore del portale** non ottiene automaticamente tali privilegi. Mineko e Diego mantengono gli accessi preesistenti.

Per evitare revoche soltanto apparenti, la console **non consente di sospendere l'account storico di Diego** mentre `is_sheriff_admin()` continua a riconoscerlo come amministratore Sceriffi. La modifica di questi accessi richiede interventi coordinati sul sistema legacy.

L'editor del Codice Penale modifica solamente le descrizioni: multe, durata del carcere e dati dei reati devono essere mantenuti coerenti tramite intervento tecnico.

### Collaudi
- Simulazione SQL di Mineko: `super_admin=true`, gestione dei contenuti autorizzata.
- Simulazione SQL di Diego: `admin=true`, nomina nuovi amministratori negata.
- Simulazione SQL di account estraneo: nessun ruolo e nessuna autorizzazione.
- Simulazione temporanea di Responsabile `content`: controllo `content=true` e `news=false` (transazione poi annullata).
- Simulazione di assegnazione tramite RPC come Super Amministratore: riuscita, quindi annullata con `ROLLBACK`.
- Test statico sintassi degli script JavaScript. Resta da verificare manualmente l'interfaccia in browser con account autentici dopo pubblicazione GitHub Pages.


## Recupero della gerarchia
- `sql/admin-role-hierarchy.sql`: schema, policy e assegnazioni iniziali (già applicati).
- `sql/admin-role-functions.sql`: copie estratte dal database delle cinque funzioni di autorizzazione effettivamente installate.
- Le istruzioni di recupero non vanno eseguite sul database di produzione senza verifica preventiva. L'ordine corretto è tabella → funzioni → policy, poi ruoli iniziali e trigger.
