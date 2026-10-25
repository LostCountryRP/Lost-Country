# Risorse approvate — caricamento sul ramo grafico
Data: 25 ottobre 2026

## Stato
Le risorse PNG originali sono state consegnate dall'utente in chat e copiate **senza cambiare i byte** nei due file seguenti.
Gli originali NON sono ancora presenti sul repository: il collegamento GitHub da questa chat non supporta il trasferimento diretto di allegati PNG binari. Non sostituire questi file con immagini generate, stock o diverse.

| Nome da usare nella radice del repository | Immagine originale | Dimensione | SHA256 |
| --- | --- | --- | --- |
| `lc-hero-approved.png` | `definitivo.png` | 3.846.481 byte | `1fdc5cec425246020c82e1fea8d3e1cc9258e8e2b0be0c09507e634cd01df01f` |
| `lc-logo-official.png` | `logo(3).png` | 2.792.945 byte | `d3ba03fd21d5f50c0b50eb7db1a7fef84b0bb16798367eb7c3fd45e2f15456f5` |

## Procedura di caricamento, soltanto sul ramo di lavoro
1. Aprire `https://github.com/LostCountryRP/Lost-Country/tree/struttura-sito-2026-10-25`.
2. Assicurarsi che il selettore del branch mostri `struttura-sito-2026-10-25`, **non `main`**.
3. Scegliere **Add file → Upload files**.
4. Caricare i due PNG dalla cartella ZIP di risorse originali, mantenendo i nomi esatti indicati nella tabella.
5. Concludere con **Commit changes** sullo stesso ramo.

## Cosa accade dopo il caricamento
- Il CSS `lc-heritage-theme.css` usa già automaticamente `lc-hero-approved.png` sulla homepage e come immagine di sfondo generale; in assenza del file, il tema usa i vecchi sfondi del repository per evitare aree vuote.
- Dopo il caricamento di `lc-logo-official.png` bisogna aggiornare la homepage per puntare al PNG originale (oggi mostra `lc-logo-original.webp`, che raffigura il medesimo emblema) e valutare le altre pagine.
- Poi verificare visivamente leggibilità, responsive, componenti UI e funzioni riservate prima di integrare in `main`.

## Vincoli
Nessuna creazione di pagine `server.html` o `fazioni.html`; nessun cambiamento al database Supabase, ruoli o accessi. Non eliminare le pagine reali.
