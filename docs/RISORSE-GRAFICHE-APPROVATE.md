# Risorse approvate — caricamento sul ramo grafico
Data: 25 ottobre 2026

## Stato
**Caricamento completato dall'utente e verificato su GitHub il 25 ottobre 2026.**
I due originali PNG sono presenti sul ramo `struttura-sito-2026-10-25` senza alterazioni.
Confrontati i Git blob SHA del repository con gli stessi byte dei PNG locali: corrispondenza esatta.
Lo sfondo della homepage e il logo ufficiale sono collegati dai file HTML/CSS sul ramo di lavoro.
Nessun deploy pubblico finché non si eseguono verifiche finali del sito.

| Nome da usare nella radice del repository | Immagine originale | Dimensione | SHA256 |
| --- | --- | --- | --- |
| `lc-hero-approved.png` | `definitivo.png` | 3.846.481 byte | `1fdc5cec425246020c82e1fea8d3e1cc9258e8e2b0be0c09507e634cd01df01f` |
| `lc-logo-official.png` | `logo(3).png` | 2.792.945 byte | `d3ba03fd21d5f50c0b50eb7db1a7fef84b0bb16798367eb7c3fd45e2f15456f5` |

## Procedura di caricamento
**Già completata e verificata.** Non è richiesto un nuovo upload.

## Integrazione effettuata
- `lc-heritage-theme.css` utilizza `lc-hero-approved.png` per homepage e sfondo generale, senza fallback ad altre immagini.
- Le pagine HTML esistenti e il logo del masthead creato da `western-premium.js` richiamano ora `lc-logo-official.png`.
- Proseguire con verifica visiva reale a desktop e mobile e verifica funzionale prima di integrare nel ramo `main`.

## Vincoli
Nessuna creazione di pagine `server.html` o `fazioni.html`; nessun cambiamento al database Supabase, ruoli o accessi. Non eliminare le pagine reali.
