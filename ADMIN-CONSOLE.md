# Console Amministratori — Lost Country RP

**URL:** https://lostcountryrp.github.io/Lost-Country/amministrazione.html

## Accesso
- Il pannello si apre con Supabase Auth e accetta solo utenti per cui `public.is_sheriff_admin()` restituisce `true`.
- Al 24 ottobre 2026 gli account riconosciuti come amministratori Sceriffi sono Mineko e Diego.
- Chi non è amministratore può vedere la pagina di accesso, ma non i contenuti gestionali. La sicurezza effettiva delle operazioni è data dalle policy RLS su Supabase, non dai pulsanti nascosti.

## Funzionalità
- Panoramica conteggi: `frontier_news`, `commercial_registry`, `frontier_events`, immagini `lc-image-hosting` (prime 100: il valore `100+` è indicativo).
- Link indipendenti a: Sceriffi, gestione account, Medici, Redazione, Ufficio Civico, Hosting immagini, GitHub e Supabase.
- Moderazione degli ultimi 100 contenuti per sezione:
  - Giornale: titolo, categoria, testo; pubblicazione/non pubblicazione.
  - Commercio: dati dell'attività, stato ATTIVA/SOSPESA/CHIUSA.
  - Eventi: dati evento, orari, annullamento/ripristino.
- Gestione ruoli: elenco medici e giornalisti, sospensione/riattivazione, assegnazione ruolo a un utente Supabase **già esistente** identificato dal suo User UID.
- Non sono stati aggiunti pulsanti per eliminare definitivamente articoli, attività, eventi o utenti.

## Separazione degli accessi
- Un amministratore può gestire gli account di personale medico e giornalistico. Per leggere cartelle cliniche deve essere anche abilitato come medico: la console non mostra direttamente i referti.
- L'amministrazione degli account Sceriffo utilizza ancora `admin-sceriffi.html` e la Edge Function `manage-sheriffs`, che possono applicare ulteriori restrizioni lato server.
- Il caricamento delle immagini utilizza il pannello indipendente `hosting-immagini.html`; le foto sono pubbliche per chi ne conosce il link, ma la galleria è accessibile solo agli amministratori.
- Il pannello tecnico NON fornisce credenziali amministrative Supabase né token di GitHub. Sono richiesti accessi separati alle console ufficiali.

## Sicurezza e deploy
- Gli accessi diretti alle tabelle sono filtrati da policy RLS. I nomi delle policy sono versionati in `sql/admin-console.sql` (già applicate, non rieseguire senza controllare).
- Le modifiche nei registri sono aggiornamenti, non cancellazioni; il repository conserva il codice in GitHub.
- I nuovi endpoint e le policy sono stati verificati staticamente. Serve comunque un test da browser con sessione Mineko/Diego e uno con account non autorizzato.
- Le pagine GitHub Pages sono statiche: la console è raggiungibile anche da chi conosce l'URL, ma le operazioni e i dati amministrativi richiedono autorizzazione Supabase.
