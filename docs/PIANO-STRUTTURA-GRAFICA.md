# Lost Country RP — struttura reale del sito e criteri grafici
**Data:** 25 ottobre 2026  
**Ramo di lavoro:** `struttura-sito-2026-10-25`  
**Ambito:** sito GitHub Pages già esistente; nessuna nuova pagina, nessuna migrazione.

## Decisione vincolante
La schermata di riferimento mostrava delle **idee di presentazione**, non una nuova sitemap.
**Non creare** pagine `server.html`, `fazioni.html` o altre sezioni non esistenti.
Le voci **Il Server** e **Fazioni** restano, se desiderate, sezioni della homepage (`index.html#il-server`, `index.html#fazioni`), non destinazioni autonome.
L'intervento grafico deve adattarsi alle funzioni attuali, **non viceversa**.

## Risorse grafiche approvate
- **Sfondo:** l'immagine originale `definitivo.png` fornita dall'utente; non rigenerarla, non alterarla e non sostituirla con immagini simili.
- **Logo:** usare il file ufficiale consegnato dall'utente, senza reinterpretarlo o generarne un altro.
- **Cornice:** oro antico, sottile, sobria, come il riferimento.
- **Pannelli:** neri/scuri e più trasparenti; mantenere contrasto sufficiente per testo e controlli.
- **Pergamena:** eliminare l'effetto pergamena dai contenitori generici; preservare però gli elementi funzionali, tra cui il visualizzatore del libro Lore.
- **Immagini:** non aggiungere immagini generate, stock o esterne; eventuali nuove grafiche soltanto da allegati dell'utente.
- **Stile:** nero carbone, bronzo/oro antico, avorio, elementi accessibili su desktop e mobile.

## Mappa delle pagine esistenti
| Area | Nome visualizzato | File attuale | Accesso |
| --- | --- | --- | --- |
| Pubblico | Home + Il Server / Fazioni (sezioni) | `index.html` (`#il-server`, `#fazioni`) | Pubblico |
| Pubblico | Regolamento | `index.html#regole-oro` (e altri capitoli della home) | Pubblico |
| Pubblico | Guide / Approfondimenti | `approfondimenti.html` | Pubblico |
| Pubblico | Codice penale | `codice-penale.html` | Pubblico |
| Pubblico | Lore / libro | `lore.html` | Pubblico |
| Pubblico | Giornale / Archivio della Frontiera | `voce-della-frontiera.html` | Pubblico |
| Pubblico | Registro attività commerciali | `attivita-commerciali.html` | Pubblico |
| Pubblico | Eventi | `eventi.html` | Pubblico |
| Uffici RP | Sceriffi | `sceriffi.html` | Login/permessi per funzioni operative |
| Uffici RP | Medico | `medico.html` | Login/permessi per funzioni operative |
| Uffici RP | Ufficio civico | `ufficio-civico.html` | Permessi per pubblicazione |
| Staff | Redazione | `redazione.html` | Login/permessi |
| Staff | Console amministratori | `amministrazione.html` | Login/permessi amministrativi |
| Staff | Gestione account sceriffi | `admin-sceriffi.html` | Autorizzazione specifica |
| Staff | Hosting immagini | `hosting-immagini.html` | Login/permessi amministrativi |

**Nota:** Il repository contiene **14 file HTML**, perché Regolamento, Il Server e Fazioni sono sezioni/ancore dentro `index.html`, non file HTML distinti.

## Navigazione
1. Conservare tutti i collegamenti pubblici attuali: nessun link verso pagine immaginarie.
2. Preservare gli indici locali (ancore `#id`) dei capitoli del Regolamento, Approfondimenti e Codice Penale.
3. Per la homepage, le voci di presentazione `Il Server`, `Fazioni`, `Contatti` restano collegamenti a sezioni già esistenti; la barra può anche includere accessi diretti a pagine vere (Lore, Guide, Giornale, ecc.).
4. I servizi staff/amministrazione restano raggiungibili dai collegamenti esistenti; nascondere un link **non** sostituisce l'autorizzazione Supabase.
5. Nessun restyling deve interferire con `lc-cms-*`, `frontier-portal.js`, `sheriff.js`, `medico.js`, `lore.js`, `news-archive.js` o i moduli amministrativi.

## Ordine di integrazione, senza modifiche al sito pubblico
1. Validare mappa e contenuti attuali (fatto: 14 file HTML; controllati i riferimenti HTML locali diretti).
2. Uniformare la struttura visiva della homepage **senza** spostare/cancellare i capitoli del regolamento e gli ID CMS.
3. Applicare cornice, tipografia, contrasto e pannelli scuri alle pagine informative esistenti.
4. Adattare con cautela i contenitori di Sceriffi, Medico, Giornale e uffici, senza toccare i form e le funzionalità.
5. Verificare schermi piccoli, keyboard navigation, overflow, leggibilità, moduli e login.
6. Solo dopo approvazione/test, integrare `main` ed effettuare il deploy del sito pubblico.

## Vincoli di sicurezza e qualità
- Non modificare SQL, RLS, credenziali, connessione Supabase, backup o ruoli per motivi grafici.
- Non sostituire strutture HTML usate da JavaScript, query selectors o dalle ancore CMS.
- Nessun cambiamento automatico al ramo `main`.
- Usare un unico foglio di stile di adeguamento mirato anziché sovrapporre altri restyling generici senza controlli.
