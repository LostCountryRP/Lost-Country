# Lost Country RP — Image Hosting

**Pannello:** https://lostcountryrp.github.io/Lost-Country/hosting-immagini.html  
**Pagina:** `hosting-immagini.html` — **Script:** `hosting-immagini.js` — **Stile:** `hosting-immagini.css`.

## Configurazione Supabase (necessaria una sola volta)
1. Aprire Supabase > progetto LostCountryRP > **Storage** > **New bucket**.
2. ID/nome bucket: **`lc-image-hosting`** (esatto, tutto minuscolo).
3. Attivare **Public bucket**. I link diretti delle singole immagini devono poter essere visualizzati senza autenticazione.
4. Impostare **Restrict file size** a **10 MB** (10485760 byte).
5. Impostare **Restrict MIME types** a `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
6. Salvare. Non riutilizzare il bucket privato `wanted-photos`.

Le tre policy RLS **sono già state configurate** su `storage.objects` nel progetto Supabase:
- `lc_image_host_admin_list`: solo amministratori autenticati, SELECT/lista.
- `lc_image_host_admin_upload`: solo amministratori autenticati, INSERT sotto `uploads/` con path UUID.
- `lc_image_host_admin_delete`: solo amministratori autenticati, DELETE.
- Nessuna policy UPDATE: niente sovrascrittura. Per cambiare un'immagine, caricare un nuovo file e sostituire il link nel contenuto pubblicato.

L'autorizzazione usa la funzione server-side `public.is_sheriff_admin()`, già presente nel progetto. Attualmente riconosce gli amministratori Sceriffi Mineko e Diego. Il solo controllo nell'interfaccia **non** sostituisce RLS.

## Funzioni del pannello
- Login con Supabase Auth.
- Caricamento multi-immagine JPG, PNG, WEBP, GIF fino a 10 MB/file.
- Nome file normalizzato e prefisso UUID non facilmente indovinabile.
- Link pubblici permanenti tramite `supabase.storage.getPublicUrl`.
- Galleria amministrativa paginata, ricerca locale, anteprime, copia URL, cancellazione con conferma.
- Nessun link nel menu pubblico, istruzione `noindex` nella pagina del pannello.

## Privacy e limitazioni
**Non è un archivio privato.** Le immagini non vengono elencate nel sito e la lista Storage è limitata agli amministratori, ma chiunque conosca un link diretto può accedere all'immagine. Evitare documenti riservati e fotografie con dati sensibili. La mancata indicizzazione non garantisce segretezza. I link rimangono validi finché l'oggetto rimane nel bucket e il progetto/storage è attivo; eliminarlo interrompe il link.

## URL di esempio
`https://rzwgfjejnuwqsypbhnmk.supabase.co/storage/v1/object/public/lc-image-hosting/uploads/<uuid>-locandina.jpg`

## Test dopo la creazione del bucket
1. Accedere al pannello con Mineko (o Diego); aprire la galleria inizialmente vuota.
2. Caricare un piccolo JPG di prova e copiare l'URL.
3. Aprire il link in una finestra anonima: l'immagine deve apparire.
4. In finestra anonima, aprire il pannello: **non** deve apparire la galleria.
5. Con un account autenticato non amministratore, i tentativi di lista/caricamento devono essere rifiutati.
6. Cancellare la foto di prova solo se non viene già utilizzata sul sito.
7. Controllare periodicamente lo spazio occupato da Supabase Storage.

## Backup delle immagini
I dump SQL di Supabase **non contengono i file di Storage**. Per proteggere le immagini bisogna anche scaricare/esportare gli oggetti del bucket `lc-image-hosting` separatamente. Il backup database GitHub Actions attuale non copre questi file. Conservare copie esterne del materiale importante.

## Manutenzione
Per ripristinare le policy, vedere `sql/image-hosting.sql`. Non applicare due volte le stesse policy con lo stesso nome. Non esporre mai service_role o altre chiavi segrete nel frontend.
