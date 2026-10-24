# Piano backup — Lost Country RP
Ultimo aggiornamento: 24 ottobre 2026.

## Cosa è già predisposto
- Branch di recupero manuale: `backup/protezione-2026-10-24`.
- Workflow `.github/workflows/backup-code.yml`: crea ogni lunedì alle 03:15 UTC un tag `backup-code-AAAA-MM-GG` del branch predefinito. Richiede che GitHub Actions possa creare tag con `GITHUB_TOKEN`.
- Workflow `.github/workflows/backup-database.yml`: ogni lunedì alle 03:40 UTC (o manualmente) genera tre dump del database Supabase (ruoli, struttura e dati), cifra tutto con age e conserva **solo il file cifrato** come artifact GitHub per 30 giorni.

## Attivazione obbligatoria backup database
**Non è attivo finché non configuri:**
1. GitHub: repository > Settings > Secrets and variables > Actions.
2. Secret `SUPABASE_DB_URL`: stringa di connessione Postgres del progetto Supabase LostCountryRP (Dashboard > Connect), comprensiva della password. Non inserirla nei file GitHub né in chat.
3. Variable `BACKUP_AGE_RECIPIENT`: chiave pubblica age (stringa che inizia con `age1`).
4. Genera la coppia age **sul tuo computer privato** con `age-keygen -o lostcountry-backup-key.txt`. Conserva il file contenente la chiave privata offline, in almeno due luoghi sicuri; non caricarlo su GitHub né comunicarlo in chat. La chiave pubblica compare nel file generato e può essere copiata nella variabile GitHub.
5. In GitHub Actions avvia manualmente `Lost Country - Backup database cifrato` e verifica che ci sia l'artifact `.tar.age`, non soltanto un job verde che segnala segreti mancanti.
6. Scarica e conserva il backup cifrato in una posizione **esterna a GitHub**, poi prova una decifratura locale e un ripristino in un database di test. Non ripristinare direttamente in produzione.

## Decifrazione
Su una macchina privata con age installato:
```bash
age -d -i lostcountry-backup-key.txt -o lostcountry-backup.tar lost-country-AAAA-MM-GG.tar.age
tar -tf lostcountry-backup.tar
```
Il tar contiene `roles.sql`, `schema.sql` e `data.sql`. NON caricare mai le copie in chiaro su repository pubblici.

## Limiti e precauzioni
- I tag GitHub non sono copie indipendenti del repository: un amministratore GitHub può eliminarli. Tieni anche un archivio offline del codice.
- Gli artifact GitHub scadono dopo 30 giorni e non sono un archivio permanente.
- Gli oggetti reali in Supabase Storage non sono inclusi nei dump SQL (si salvano solo i metadati). Salvare separatamente eventuali foto/documenti RP conservati in Storage.
- Le configurazioni esterne (provider Auth, email, segreti, impostazioni progetto) non sono garantite dai dump SQL e richiedono un inventario.
- I backup GitHub Actions e le chiavi amministrative devono stare in un account GitHub personale, non condiviso.
- Se mancano i due parametri richiesti, il job non esegue alcuna esportazione.
