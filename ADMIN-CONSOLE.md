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

## Note sui permessi
Non è stata introdotta una nuova classe universale di \"super admin\" o una delega generalizzata ai responsabili di sezione. Per ora la console **rispetta gli amministratori preesistenti** per non alterare in modo rischioso le autorizzazioni degli uffici. La gestione gerarchica dei permessi va progettata coordinando anche la Edge Function degli Sceriffi.
