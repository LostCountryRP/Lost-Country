(()=>{
  "use strict";
  const $ = s => document.querySelector(s);
  let db = null;
  let session = null;
  function configured(){
    return window.LC_SUPABASE_URL && window.LC_SUPABASE_KEY &&
      !window.LC_SUPABASE_URL.includes("INSERISCI") &&
      !window.LC_SUPABASE_KEY.includes("INSERISCI");
  }
  function status(message, type=""){
    const el = $("#adminStatus");
    if(!message){ el.innerHTML = ""; return; }
    el.innerHTML = `<div class="${type === "error" ? "admin-error" : "admin-success"}">${escapeHtml(message)}</div>`;
  }
  function escapeHtml(value){
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }
  function fmtDate(v){
    return v ? new Date(v).toLocaleString("it-IT") : "—";
  }
  async function invoke(body){
    const { data, error } = await db.functions.invoke("manage-sheriffs", { body });
    if(error) throw error;
    if(data?.error) throw new Error(data.error);
    return data;
  }
  function generatePassword(){
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    const arr = new Uint32Array(14);
    crypto.getRandomValues(arr);
    const p = Array.from(arr, n => chars[n % chars.length]).join("");
    $("#newPassword").value = p;
    $("#newPasswordConfirm").value = p;
    status("Password generata e inserita nei campi. Conservala in modo sicuro.");
  }
  async function createSheriff(e){
    e.preventDefault();
    status("");
    const displayName = $("#newDisplayName").value.trim();
    const email = $("#newEmail").value.trim();
    const password = $("#newPassword").value;
    const confirm = $("#newPasswordConfirm").value;
    if(password.length < 8) return status("La password deve contenere almeno 8 caratteri.", "error");
    if(password !== confirm) return status("Le due password non coincidono.", "error");
    try{
      const result = await invoke({ action:"create", displayName, email, password });
      status(`Account creato: ${result.user.display_name} (${result.user.email}).`);
      $("#createSheriffForm").reset();
      await loadUsers();
    }catch(err){
      status(err.message || String(err), "error");
    }
  }
  async function updateName(userId){
    const input = document.querySelector(`[data-name-input="${userId}"]`);
    const displayName = input?.value.trim();
    if(!displayName) return status("Inserisci un nome RP valido.", "error");
    try{
      await invoke({ action:"update_name", userId, displayName });
      status("Nome RP aggiornato correttamente.");
      await loadUsers();
    }catch(err){
      status(err.message || String(err), "error");
    }
  }
  async function setPassword(userId){
    const password = prompt("Inserisci la nuova password temporanea (minimo 8 caratteri):");
    if(password === null) return;
    if(password.length < 8) return status("La password deve contenere almeno 8 caratteri.", "error");
    try{
      await invoke({ action:"set_password", userId, password });
      status("Password aggiornata correttamente.");
    }catch(err){
      status(err.message || String(err), "error");
    }
  }
  async function loadUsers(){
    status("");
    const tbody = $("#usersBody");
    tbody.innerHTML = '<tr><td colspan="6">Caricamento...</td></tr>';
    try{
      const result = await invoke({ action:"list" });
      const users = result.users || [];
      if(!users.length){
        tbody.innerHTML = '<tr><td colspan="6">Nessun account trovato.</td></tr>';
        return;
      }
      tbody.innerHTML = users.map(u => `
        <tr>
          <td><input data-name-input="${u.id}" value="${escapeHtml(u.display_name || "")}" placeholder="Nome RP"></td>
          <td>${escapeHtml(u.email || "—")}</td>
          <td>${escapeHtml(u.role || "—")}</td>
          <td>${escapeHtml(fmtDate(u.created_at))}</td>
          <td>${escapeHtml(fmtDate(u.last_sign_in_at))}</td>
          <td>
            <div class="admin-actions">
              <button class="btn-secondary btn-small" data-update-name="${u.id}" type="button">Salva nome</button>
              <button class="btn-secondary btn-small" data-set-password="${u.id}" type="button">Nuova password</button>
            </div>
          </td>
        </tr>
      `).join("");
      tbody.querySelectorAll("[data-update-name]").forEach(btn => {
        btn.addEventListener("click", () => updateName(btn.dataset.updateName));
      });
      tbody.querySelectorAll("[data-set-password]").forEach(btn => {
        btn.addEventListener("click", () => setPassword(btn.dataset.setPassword));
      });
    }catch(err){
      tbody.innerHTML = '<tr><td colspan="6">Errore caricamento.</td></tr>';
      status(err.message || String(err), "error");
    }
  }
  async function init(){
    if(!configured()){
      status("Supabase non configurato in supabase-config.js.", "error");
      return;
    }
    db = window.supabase.createClient(window.LC_SUPABASE_URL, window.LC_SUPABASE_KEY, {
      auth:{ persistSession:true, autoRefreshToken:true }
    });
    const { data } = await db.auth.getSession();
    session = data.session;
    if(!session){
      $("#notLoggedPanel").classList.remove("hidden");
      return;
    }
    const user = session.user;
    $("#adminName").textContent = user.user_metadata?.display_name || user.email || "Admin";
    $("#createSheriffForm").addEventListener("submit", createSheriff);
    $("#generatePasswordBtn").addEventListener("click", generatePassword);
    $("#refreshUsersBtn").addEventListener("click", loadUsers);
    // Controllo preliminare dell'amministratore Mineko tramite RPC protetta.
    // Le operazioni di gestione account devono essere autorizzate ANCHE
    // dalla Edge Function manage-sheriffs (controllo server-side).
    try{
      const { data: isAdmin, error: roleError } = await db.rpc("is_sheriff_admin");
      if(roleError) throw roleError;
      if(isAdmin !== true){
        $("#notAdminPanel").classList.remove("hidden");
        status("Accesso riservato all'amministratore Mineko.", "error");
        return;
      }
      await invoke({ action:"list" });
      $("#adminPanel").classList.remove("hidden");
      await loadUsers();
    }catch(err){
      // Se RPC funziona ma Edge Function rifiuta, verificare autorizzazione
      // dell'amministratore nella funzione manage-sheriffs.
      $("#notAdminPanel").classList.remove("hidden");
      status("Gestione account non disponibile: " + (err.message || String(err)), "error");
    }
  }
  document.addEventListener("DOMContentLoaded", init);
})();
