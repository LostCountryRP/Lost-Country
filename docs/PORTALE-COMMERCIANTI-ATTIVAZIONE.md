# Lost Country RP — Attivazione Portale Commercianti

Versione: 27 ottobre 2026 — portale self-service con approvazione amministrativa.

## File e punti d'accesso

- Registro commerciale pubblico: `attivita-commerciali.html`
- Account titolari: `portale-commercianti.html`
- Approvazione delle richieste e moderazione: `admin-commercianti.html`
- Base dati e permessi: `sql/business-owner-portal.sql` e successive correzioni nella cartella `sql`.

## 1. Verificare GitHub Pages

Nel repository `LostCountryRP/Lost-Country`, aprire **Settings → Pages**.
Se il sito non è già pubblicato, scegliere **Deploy from a branch**, branch `main`, cartella **/(root)**, quindi **Save**.
Se il sito usa già una fonte di pubblicazione funzionante, non sostituirla senza verificare.

Da **Settings → Pages → Visit site**, copiare l'indirizzo reale pubblicato. Aprire le pagine:
- `<URL-SITO>/portale-commercianti.html`
- `<URL-SITO>/admin-commercianti.html`
- `<URL-SITO>/attivita-commerciali.html`

L'indirizzo GitHub Pages convenzionale, se non esiste un dominio personalizzato, è
`https://lostcountryrp.github.io/Lost-Country/`.
**Controllare** che sia davvero l'indirizzo mostrato in GitHub Pages prima di condividerlo.

## 2. Consentire il collegamento delle email di conferma

Su Supabase, progetto `rzwgfjejnuwqsypbhnmk`, aprire:
**Authentication → URL Configuration**.

- Impostare **Site URL** sull'URL pubblico effettivo del sito.
- Aggiungere alla lista **Redirect URLs** l'URL *esatto* di `portale-commercianti.html` sul dominio effettivamente pubblicato.
- Per produzione, usare URL esatti e non wildcard generiche.

Controllare **Authentication → Email Templates → Confirm signup**:
se il template è personalizzato deve utilizzare il link di conferma Supabase coerente con
`{{ .RedirectTo }}` oppure `{{ .ConfirmationURL }}`, così la conferma non manda
l'utente a localhost o a un vecchio dominio. Non modificare un template funzionante
senza averne prima controllato il contenuto.

Nel pannello **Authentication → Providers** verificare che Email/password e la registrazione degli utenti siano abilitati.
Controllare anche i limiti di invio email / SMTP per l'uso con più giocatori.

## 3. Prova con un account di gioco reale

1. Aprire il portale e registrarsi con un indirizzo email raggiungibile.
2. Se richiesto, confermare la registrazione via email e accedere.
3. Inviare la richiesta per una nuova impresa o selezionare un'impresa esistente.
4. In **Amministrazione → Gestione titolari commerciali**, verificare la richiesta e approvarla solo dopo controllo RP.
5. Tornare nel portale del titolare, cliccare Aggiorna e pubblicare un annuncio.
6. Provare il caricamento di una foto JPG/PNG/WebP di dimensione inferiore a 5 MB.
7. Aprire il Registro Commerciale in una finestra in incognito: verificare che il post sia visibile.
8. Nascondere il post in Amministrazione: verificare che scompaia dall'elenco pubblico.
9. Revocare la proprietà in Amministrazione: verificare che il proprietario non possa più pubblicare.

## Regole operative

- La registrazione all'account non autorizza di per sé a pubblicare.
- Ogni impresa è legata a una richiesta di proprietà approvata.
- Gli annunci sono visibili nella scheda del Registro Commerciale.
- Una richiesta non può essere approvata dallo stesso titolare tramite l'interfaccia o le API pubbliche.
- L'amministrazione può nascondere o ripristinare annunci e revocare la gestione; le decisioni sono registrate.
- Eventi pubblicati dal proprietario nella propria bacheca **non** vengono automaticamente duplicati in `eventi.html`.

## Verifiche tecniche già eseguite

- Sintassi JavaScript e presenza degli ID dei moduli controllate.
- RLS di lettura pubblica, approvazione amministrativa e revoca testate in transazioni annullate.
- I test non hanno lasciato attività, richieste o post fittizi.
- **Non è stato completato** un test reale di conferma email / login / upload con un account di giocatore, né la verifica esterna del deploy di GitHub Pages: completare i passaggi 1–3.

Documentazione di riferimento:
- https://supabase.com/docs/guides/auth/redirect-urls
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
