(() => {
  "use strict";
  const BUCKET = "lc-image-hosting";
  const PREFIX = "uploads";
  const PAGE_SIZE = 24;
  const MAX_BYTES = 10 * 1024 * 1024;
  const TYPES = {"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"};
  const db = window.supabase.createClient(window.LC_SUPABASE_URL, window.LC_SUPABASE_KEY, {
    auth: {persistSession:true,autoRefreshToken:true}
  });
  const $ = id => document.getElementById(id);
  let authorized = false;
  let busy = false;
  let selected = [];
  let page = 0;
  let current = [];

  function status(message, error) {
    const el = $("hostingStatus");
    el.textContent = message || "";
    el.classList.toggle("error", Boolean(error));
  }
  function uploadFeedback(kind, title, detail, completed, total) {
    const panel = $("hostingUploadFeedback");
    panel.hidden = false;
    panel.dataset.state = kind;
    $("hostingUploadFeedbackTitle").textContent = title;
    $("hostingUploadFeedbackText").textContent = detail || "";
    const bar = $("hostingUploadProgress");
    bar.hidden = kind !== "loading";
    if (kind === "loading") {
      bar.value = total > 0 ? Math.round(100 * completed / total) : 0;
    }
  }
  function clearUploadFeedback() {
    const el = $("hostingUploadFeedback");
    el.hidden = true;
    el.removeAttribute("data-state");
  }
  function showPanel(allowed) {
    authorized = allowed;
    $("hostingLogin").hidden = allowed;
    $("hostingPanel").hidden = !allowed;
  }
  function niceError(err) {
    const msg = (err && err.message) || String(err);
    if (/bucket.*not found|not found.*bucket|404/i.test(msg)) {
      return "Archivio non ancora attivato: crea il bucket pubblico 'lc-image-hosting' in Supabase Storage.";
    }
    if (/row.level.security|permission denied|unauthorized|403/i.test(msg)) {
      return "Operazione negata da Supabase. Verifica i permessi del caricamento pubblico o dell’archivio amministratori."; 
    }
    return msg;
  }
  async function checkAccess() {
    try {
      const result = await db.auth.getUser();
      if (result.error || !result.data.user) {
        showPanel(false);
        return;
      }
      const permission = await db.rpc("is_sheriff_admin");
      if (permission.error) throw permission.error;
      if (permission.data !== true) {
        showPanel(false);
        status("Caricamento pubblico disponibile. Solo gli amministratori possono consultare l’archivio.");
        return;
      }
      showPanel(true);
      $("hostingUser").textContent = result.data.user.email || "Amministratore";
      status("");
      await loadGallery();
    } catch (error) {
      showPanel(false);
      status(niceError(error), true);
    }
  }
  function fileSlug(name) {
    const stem = name.replace(/\.[^.]+$/, "");
    return (stem.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .toLowerCase().replace(/[^a-z0-9]+/g,"-")
      .replace(/^-+|-+$/g,"").slice(0,48).replace(/-+$/,"")) || "immagine";
  }
  function makePath(file) {
    return PREFIX + "/" + crypto.randomUUID() + "-" + fileSlug(file.name) + "." + TYPES[file.type];
  }
  function publicUrl(path) {
    return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }
  function formatSize(bytes) {
    if (!Number.isFinite(bytes)) return "";
    return bytes >= 1048576 ? (bytes/1048576).toFixed(1) + " MB" : Math.round(bytes/1024) + " KB";
  }
  async function copyLink(link, button) {
    try {
      await navigator.clipboard.writeText(link);
      const old = button.textContent;
      button.textContent = "Copiato!";
      setTimeout(() => {button.textContent = old;}, 1600);
    } catch (_) {
      window.prompt("Copia il collegamento:", link);
    }
  }
  function actionButton(text, handler, extraClass) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = text;
    if (extraClass) btn.className = extraClass;
    btn.addEventListener("click", handler);
    return btn;
  }
function resultItem(fileName, link, error) {
    const box = document.createElement("div");
    box.className = "hosting-result" + (error ? " error" : " success");
    const header = document.createElement("strong");
    header.className = "hosting-result-title";
    header.textContent = (error ? "❌ Caricamento non riuscito — " : "✅ Immagine caricata — ") + fileName;
    box.appendChild(header);
    if (error) {
      const description = document.createElement("p");
      description.textContent = error;
      box.appendChild(description);
    }
    if (link) {
      const preview = document.createElement("img");
      preview.className = "hosting-result-preview";
      preview.src = link;
      preview.alt = "Anteprima: " + fileName;
      preview.loading = "lazy";
      box.appendChild(preview);
      const field = document.createElement("input");
      field.type = "text";
      field.readOnly = true;
      field.className = "hosting-result-link";
      field.setAttribute("aria-label", "Link diretto di " + fileName);
      field.value = link;
      field.addEventListener("click", () => field.select());
      box.appendChild(field);
      const actions = document.createElement("div");
      actions.className = "hosting-result-actions";
      actions.appendChild(actionButton("🔗 Usa immagine · Copia link", e => copyLink(link, e.currentTarget), "hosting-copy"));
      actions.appendChild(actionButton("Copia HTML", e => copyLink(htmlForImage(link, fileName), e.currentTarget), "hosting-copy"));
      const open = document.createElement("a");
      open.href = link;
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      open.textContent = "Apri immagine ↗";
      actions.appendChild(open);
      box.appendChild(actions);
    }
    $("hostingResults").prepend(box);
  }
  function htmlForImage(link, description) {
    const safe = value => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return '<img src="' + safe(link) + '" alt="' + safe(description) + '">';
  }
  
  function chooseFiles(files) {
    if (busy) return;
    selected = Array.from(files || []).slice(0,30);
    const count = selected.length;
    $("hostingUploadBtn").disabled = count === 0;
    $("hostingSelection").textContent = count ? count + " file selezionat" + (count === 1 ? "o" : "i") : "Nessun file selezionato";
    if (count) {
      clearUploadFeedback();
      status("Hai selezionato " + count + " immagini. Premi «Carica e genera link» per iniziare.");
    }
  }
async function upload() {
    if (busy || selected.length === 0) return;
    busy = true;
    const btn = $("hostingUploadBtn");
    btn.disabled = true;
    btn.textContent = "Caricamento in corso…";
    $("hostingRefresh").disabled = true;
    $("hostingResults").replaceChildren();
    let success = 0;
    let failed = 0;
    const files = selected.slice();
    uploadFeedback("loading", "Caricamento avviato", "0 di " + files.length + " immagini elaborate", 0, files.length);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        status("Caricamento " + (i + 1) + "/" + files.length + ": " + file.name);
        try {
          if (!Object.prototype.hasOwnProperty.call(TYPES, file.type)) {
            failed++;
            resultItem(file.name, null, "Formato non consentito. Usa JPG, PNG, WEBP o GIF.");
          } else if (!file.size || file.size > MAX_BYTES) {
            failed++;
            resultItem(file.name, null, "Il file è vuoto oppure supera 10 MB.");
          } else {
            const path = makePath(file);
            const result = await db.storage.from(BUCKET).upload(path, file, {
              cacheControl: "3600", contentType: file.type, upsert: false
            });
            if (result.error) {
              failed++;
              resultItem(file.name, null, niceError(result.error));
            } else {
              success++;
              resultItem(file.name, publicUrl(path), null);
            }
          }
        } catch (error) {
          failed++;
          resultItem(file.name, null, niceError(error));
        }
        uploadFeedback("loading", "Caricamento in corso…", (i + 1) + " di " + files.length + " immagini elaborate · " + success + " riuscite", i + 1, files.length);
      }
      selected = [];
      $("hostingFile").value = "";
      $("hostingSelection").textContent = "Nessun file selezionato";
      const title = failed === 0 ? "✅ Caricamento completato!" : success ? "⚠️ Caricamento parziale" : "❌ Nessuna immagine caricata";
      const description = success + " immagin" + (success === 1 ? "e caricata" : "i caricate") + " · " + failed + " non caricate. " + (success ? "Usa «Copia link» per inserire le immagini dove vuoi." : "Controlla i messaggi qui sotto.");
      uploadFeedback(failed === 0 ? "success" : success ? "warning" : "error", title, description, files.length, files.length);
      status(description, failed > 0);
      if (success && authorized) {
        page = 0;
        try {
          await loadGallery();
        } catch (err) {
          status("Upload riuscito, ma non è stato possibile aggiornare la galleria: " + niceError(err), true);
        }
      }
    } catch (error) {
      uploadFeedback("error", "❌ Errore di caricamento", niceError(error), 0, 0);
      status(niceError(error), true);
    } finally {
      busy = false;
      btn.textContent = "Carica e genera link";
      btn.disabled = selected.length === 0;
      $("hostingRefresh").disabled = false;
    }
  }
  
  function imageLabel(name) {
    return name.replace(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}-/,"").replace(/\.[a-z0-9]+$/,"").replace(/-/g," ");
  }
  async function removeImage(path) {
    if (!authorized || busy) return;
    const message = "Eliminare definitivamente questa immagine?\n\nATTENZIONE: tutti i link che la utilizzano smetteranno di funzionare.\n\n" + path;
    if (!window.confirm(message)) return;
    busy = true;
    try {
      const result = await db.storage.from(BUCKET).remove([path]);
      if (result.error) throw result.error;
      status("Immagine eliminata. Il vecchio link non funzionerà più.");
      await loadGallery();
    } catch (error) {
      status(niceError(error), true);
    } finally {
      busy = false;
    }
  }
  function makeCard(item) {
    const path = PREFIX + "/" + item.name;
    const link = publicUrl(path);
    const card = document.createElement("article");
    card.className = "hosting-card";
    const visual = document.createElement("a");
    visual.className = "hosting-thumb";
    visual.href = link;
    visual.target = "_blank";
    visual.rel = "noopener noreferrer";
    const img = document.createElement("img");
    img.src = link;
    img.alt = "Anteprima di " + imageLabel(item.name);
    img.loading = "lazy";
    visual.appendChild(img);
    card.appendChild(visual);
    const body = document.createElement("div");
    body.className = "hosting-card-body";
    const title = document.createElement("div");
    title.className = "hosting-card-title";
    title.textContent = imageLabel(item.name);
    title.title = item.name;
    body.appendChild(title);
    const meta = document.createElement("div");
    meta.className = "hosting-card-meta";
    const date = item.created_at ? new Date(item.created_at).toLocaleDateString("it-IT") : "";
    meta.textContent = [date, formatSize(item.metadata && item.metadata.size)].filter(Boolean).join(" · ");
    body.appendChild(meta);
    const actions = document.createElement("div");
    actions.className = "hosting-card-actions";
    actions.appendChild(actionButton("🔗 Usa immagine · Copia link", e => copyLink(link, e.currentTarget)));
    actions.appendChild(actionButton("Copia HTML", e => copyLink(htmlForImage(link, imageLabel(item.name)), e.currentTarget)));
    actions.appendChild(actionButton("Elimina", () => removeImage(path), "hosting-danger"));
    body.appendChild(actions);
    card.appendChild(body);
    return card;
  }
  function renderGallery() {
    const term = $("hostingSearch").value.trim().toLowerCase();
    const files = current.filter(item => item.name.toLowerCase().includes(term));
    const grid = $("hostingGrid");
    grid.replaceChildren();
    if (!files.length) {
      const empty = document.createElement("p");
      empty.className = "hosting-empty";
      empty.textContent = term ? "Nessuna corrispondenza in questa pagina." : "Non ci sono ancora immagini in questa pagina.";
      grid.appendChild(empty);
    } else {
      files.forEach(item => grid.appendChild(makeCard(item)));
    }
    $("hostingPageLabel").textContent = "Pagina " + (page + 1);
    $("hostingPrev").disabled = page === 0;
    $("hostingNext").disabled = current.length < PAGE_SIZE;
  }
  async function loadGallery() {
    if (!authorized) return;
    const grid = $("hostingGrid");
    grid.textContent = "Caricamento immagini…";
    const result = await db.storage.from(BUCKET).list(PREFIX, {
      limit: PAGE_SIZE, offset: page * PAGE_SIZE,
      sortBy: {column:"created_at", order:"desc"}
    });
    if (result.error) {
      current = [];
      grid.replaceChildren();
      status(niceError(result.error), true);
      return;
    }
    current = (result.data || []).filter(item => item.name && /\.(jpg|png|webp|gif)$/i.test(item.name));
    renderGallery();
  }
  async function login(event) {
    event.preventDefault();
    const btn = $("hostingLoginBtn");
    btn.disabled = true;
    status("Controllo credenziali…");
    try {
      const result = await db.auth.signInWithPassword({
        email: $("hostingEmail").value.trim(),
        password: $("hostingPassword").value
      });
      if (result.error) throw result.error;
      $("hostingPassword").value = "";
      await checkAccess();
    } catch (error) {
      status(niceError(error), true);
    } finally {
      btn.disabled = false;
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    $("hostingLoginForm").addEventListener("submit", login);
    $("hostingLogout").addEventListener("click", async () => {
      await db.auth.signOut();
      showPanel(false);
      status("Disconnesso.");
    });
    $("hostingFile").addEventListener("change", event => chooseFiles(event.target.files));
    $("hostingDrop").addEventListener("click", () => {if (!busy) $("hostingFile").click();});
    $("hostingDrop").addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!busy) $("hostingFile").click();
      }
    });
    ["dragenter","dragover"].forEach(name => $("hostingDrop").addEventListener(name, event => {
      event.preventDefault();
      $("hostingDrop").classList.add("is-dragover");
    }));
    ["dragleave","drop"].forEach(name => $("hostingDrop").addEventListener(name, event => {
      event.preventDefault();
      $("hostingDrop").classList.remove("is-dragover");
    }));
    $("hostingDrop").addEventListener("drop", event => chooseFiles(event.dataTransfer.files));
    $("hostingUploadBtn").addEventListener("click", upload);
    $("hostingRefresh").addEventListener("click", loadGallery);
    $("hostingSearch").addEventListener("input", renderGallery);
    $("hostingPrev").addEventListener("click", async () => {
      if (page > 0) {page--;await loadGallery();}
    });
    $("hostingNext").addEventListener("click", async () => {
      if (current.length === PAGE_SIZE) {page++;await loadGallery();}
    });
    checkAccess();
  });
})();
