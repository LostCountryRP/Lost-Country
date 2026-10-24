# Archivio lavori — Lost Country RP
**Data di riferimento:** 24 ottobre 2026  
**Repository:** https://github.com/LostCountryRP/Lost-Country  
**Sito:** https://lostcountryrp.github.io/Lost-Country/  
**Supabase:** progetto `LostCountryRP` (`rzwgfjejnuwqsypbhnmk`)

> Questo documento fotografa gli interventi effettuati fino al 24 ottobre 2026. È un riepilogo tecnico, non una garanzia di test end-to-end nel browser con utenti reali. Non contiene credenziali o chiavi private.

## 1. Sito e uffici RP
- Il sito pubblico su GitHub Pages mantiene il regolamento, gli approfondimenti, il codice penale, la lore, il giornale **La Voce della Frontiera**, il registro delle attività commerciali e il calendario degli eventi.
- Gli uffici operativi esistenti restano separati: **Sceriffi** (`sceriffi.html`), **Medico** (`medico.html`), **Redazione** (`redazione.html`) e **Ufficio Civico** (`ufficio-civico.html`).
- La gestione degli account Sceriffi rimane in `admin-sceriffi.html`, con verifica dell'autorizzazione anche tramite funzione server-side dedicata.

## 2. Hosting immagini indipendente
- **Pagina:** https://lostcountryrp.github.io/Lost-Country/hosting-immagini.html
- **File:** `hosting-immagini.html`, `hosting-immagini.js`, `hosting-immagini.css`.
- **Bucket Supabase:** `lc-image-hosting`; pubblico per accesso alle **singole immagini via URL diretto**; caricamento, elenco e cancellazione protetti da policy RLS e verifica `is_sheriff_admin()`.
- Accetta JPEG, PNG, WebP e GIF; dimensione massima 10 MB per file.
- Caricamento multiplo, anteprima, stato/progresso, riepilogo successi/errori, galleria amministrativa, copia URL e HTML, eliminazione con conferma.
- È stato **separato dall'Ufficio Sceriffi**: voce indipendente **Hosting immagini** nella navigazione principale.
- **Privacy reale:** un utente con il link pubblico può aprire la foto. Le immagini non sono elencate ai visitatori, ma **non sono segrete**. Non inserirvi materiale riservato.
- Durante la verifica del 24/10 risultavano già presenti **3 immagini** nel bucket. Questo conteggio può cambiare.

## 3. Nuova Console Amministratori
- **Pagina:** https://lostcountryrp.github.io/Lost-Country/amministrazione.html
- **File:** `amministrazione.html`, `amministrazione.js`, `amministrazione.css`.
- È una sezione **indipendente**, raggiungibile dal pulsante **Amministrazione** nella navigazione generale; il link può essere visibile pubblicamente, ma **le funzioni amministrative richiedono il login e il controllo server-side dei permessi**.
- L'autorizzazione applicativa usa la RPC `is_sheriff_admin()`, che al momento riconosce gli amministratori abilitati, tra cui **Mineko** e **Diego**. Non si usa `user_metadata` come fonte dei permessi.
- **Panoramica:** conteggi di articoli, attività ed eventi e vista sintetica dell'archivio immagini (fino a 100 elementi, poi indicazione 100+).
- **Hub uffici:** link diretti a Sceriffi, Gestione account, Registro Medico, Redazione, Ufficio Civico e Image Hosting.
- **Moderazione editoriale:** gestione degli articoli (pubblica/nascondi e modifica), delle attività commerciali (attiva/sospesa/chiusa e modifica), degli eventi (annulla/ripristina e modifica). Operazioni non distruttive: nessuna eliminazione massiva o fisica dei record.
- **Personale Medico e Redazione:** visualizzazione delle abilitazioni, sospensione/riattivazione di account già assegnati, assegnazione ruolo tramite UID di un utente Supabase già esistente. Queste funzioni non creano nuovi account Auth.
- Non viene ampliata automaticamente la lettura delle **cartelle mediche**: continuano a richiedere le abilitazioni dell'Ufficio Medico.
- Le operazioni sul browser vanno ancora **collaudate end-to-end con account amministratore e account senza privilegi**, non solo per sintassi.

## 4. Database e policy applicate
Policy RLS aggiunte nel database, limitate ai membri che passano `public.is_sheriff_admin()`:
- `lc_admin_all_news_read`, `lc_admin_edit_news` su `frontier_news`;
- `lc_admin_edit_business` su `commercial_registry`;
- `lc_admin_edit_events` su `frontier_events`;
- `lc_admin_medical_staff_read/insert/update` su `medical_staff`;
- `lc_admin_journalist_staff_read/insert/update` su `journalist_staff`.

Il ruolo PostgreSQL `authenticated` ha ricevuto il grant `UPDATE` sulle tre tabelle pubblicazioni; **RLS** resta l'autorizzazione effettiva per le modifiche. Le policy sono state ricontrollate e risultavano presenti il 24/10.

## 5. Backup e protezione
- Backup manuale del codice: branch `backup/protezione-2026-10-24`.
- Workflow snapshot codice: `.github/workflows/backup-code.yml`, programmato settimanalmente.
- Workflow backup database cifrato: `.github/workflows/backup-database.yml`, programmato settimanalmente; usa secret `SUPABASE_DB_URL`, variabile `BACKUP_AGE_RECIPIENT` e cifratura `age`.
- Il backup cifrato `lost-country-db-encrypted-4` risultava presente tra gli artifact GitHub il 24/10 (durata dichiarata di conservazione: 30 giorni); **decifratura e ripristino non ancora verificati**.
- La chiave **privata** `age` deve restare custodita fuori da GitHub e ChatGPT.
- I dump SQL del database **non salvano il contenuto binario dei bucket Supabase Storage**: organizzare un backup separato delle immagini, incluse quelle RP importanti.
- Le protezioni del branch `main` e l'isolamento delle connessioni amministrative dagli utenti che condividono ChatGPT sono raccomandati e non attestati come completati.

## 6. Stato verifiche e attività ancora aperte
- I file principali della nuova console, l'Image Hosting e le voci di navigazione sono stati verificati nel repository GitHub.
- Controllata la sintassi JavaScript dei principali script e la presenza degli ID HTML usati dalla console; nessun errore sintattico rilevato nel controllo eseguito.
- Controllate le policy RLS nuove; **non è stata eseguita una simulazione autenticata reale nei browser** (necessaria per convalidare interamente le operazioni).
- Gli avvisi Supabase già noti restano da valutare: 2 tabelle interne con RLS senza policy (informativo), 6 funzioni `SECURITY DEFINER` eseguibili da utenti autenticati (da verificare singolarmente) e protezione password compromesse non abilitata.
- Verificare sul sito da sessione nuova la voce **Amministrazione** e il pulsante indipendente **Hosting immagini** (eventualmente ricaricare senza cache).
- Provare: accesso Mineko, accesso senza ruolo, modifica di un articolo, sospensione/ripristino attività, annullamento/ripristino evento, gestione ruolo medico/giornalista e link immagine.
- Completare la strategia di backup esterno degli oggetti Supabase Storage e un test di ripristino in ambiente non produttivo.

## 7. Principio di gestione
La **Console Amministratori** funge da regia centrale del sito, ma **non deve bypassare le autorizzazioni dei singoli uffici** né gestire dati clinici solo perché l'utente è amministratore. L'accesso GitHub/Supabase di sistema deve rimanere separato dall'account ChatGPT condiviso.

---
**Ripresa del lavoro:** consultare questo archivio, verificare il comportamento della console con un account amministratore reale e implementare le correzioni riscontrate.
