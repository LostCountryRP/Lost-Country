(()=>{
  "use strict";
  const $ = s => document.querySelector(s);
  let db = null;
  let session = null;
  let sheriffNames = new Map();
  const GRADES = {recruit:"Recluta",deputy:"Deputy",senior_deputy:"Deputy Senior",vice_sheriff:"Vice Sceriffo",sheriff:"Sceriffo"};
  const gradeLabel = rank => GRADES[rank] || "Non assegnato";
  const gradeOptions = selected => Object.entries(GRADES).map(([code,label]) => `<option value="${code}"${selected===code?" selected":""}>${label}</option>`).join("");
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
    if(error){
      let message = error.message || "Impossibile contattare il servizio account.";
      // Le FunctionsHttpError includono spesso il motivo effettivo nel body.
      if(error.context && typeof error.context.json === "function"){
        try{
          const details = await error.context.json();
          if(details?.error) message = details.error;
        }catch(_ignored){}
      }
      throw new Error(message);
    }
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
      const result = await invoke({ action:"create", displayName, email, password, rank:$("#newRank").value });
      status(`Account creato: ${result.user.display_name} (${result.user.email}).`);
      $("#createSheriffForm").reset();
      await loadUsers();
      status(`Account creato: ${result.user.display_name} (${result.user.email}).`);
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
  async function setRank(userId){
    const selected=document.querySelector(`[data-rank-select="${userId}"]`);
    const rank=selected?.value;
    const name=sheriffNames.get(userId)||"questo agente";
    if(!rank || !GRADES[rank]) return status("Seleziona un grado valido.","error");
    const reason=prompt("Motivazione della variazione di grado per "+name+" (minimo 5 caratteri):");
    if(reason===null)return;
    if(reason.trim().length<5)return status("Inserisci una motivazione di almeno 5 caratteri.","error");
    if(!confirm("Confermi l'assegnazione del grado "+gradeLabel(rank)+" a "+name+"?"))return;
    try{
      const result=await invoke({action:"set_rank",userId,rank,reason:reason.trim()});
      await loadUsers();
      await loadRankHistory();
      status("Grado aggiornato: "+gradeLabel(result.change?.assigned_rank||rank)+". Variazione registrata.");
    }catch(err){
      status(err.message||String(err),"error");
      await loadUsers();
    }
  }
  async function loadRankHistory(){
    const target=$("#rankHistory");
    if(!target)return;
    try{
      const result=await invoke({action:"rank_history"});
      const history=result.history||[];
      if(!history.length){target.textContent="Nessuna variazione registrata.";return;}
      target.innerHTML='<table class="admin-table"><thead><tr><th>Quando</th><th>Agente</th><th>Da</th><th>A</th><th>Motivo</th></tr></thead><tbody>'+
        history.map(h=>`<tr><td>${escapeHtml(fmtDate(h.changed_at))}</td><td>${escapeHtml(sheriffNames.get(h.user_id)||h.user_id)}</td><td>${escapeHtml(gradeLabel(h.previous_rank))}</td><td><strong>${escapeHtml(gradeLabel(h.new_rank))}</strong></td><td>${escapeHtml(h.reason)}</td></tr>`).join("")+'</tbody></table>';
    }catch(err){target.textContent="Storico non disponibile: "+(err.message||String(err));}
  }
  async function loadUsers(){
    status("");
    const tbody = $("#usersBody");
    tbody.innerHTML = '<tr><td colspan="7">Caricamento...</td></tr>';
    try{
      const result = await invoke({ action:"list" });
      const users = result.users || [];
      sheriffNames = new Map(users.map(u => [u.id,u.display_name||u.email||u.id]));
      if(!users.length){
        tbody.innerHTML = '<tr><td colspan="6">Nessun account trovato.</td></tr>';
        return;
      }
      tbody.innerHTML = users.map(u => `
        <tr>
          <td><input data-name-input="${u.id}" value="${escapeHtml(u.display_name || "")}" placeholder="Nome RP"></td>
          <td>${escapeHtml(u.email || "—")}</td>
          <td>${escapeHtml(u.role || "—")}</td>
          <td><select aria-label="Grado di ${escapeHtml(u.display_name||u.email)}" data-rank-select="${u.id}">${gradeOptions(u.rank)}</select></td>
          <td>${escapeHtml(fmtDate(u.created_at))}</td>
          <td>${escapeHtml(fmtDate(u.last_sign_in_at))}</td>
          <td>
            <div class="admin-actions">
              <button class="btn-secondary btn-small" data-update-name="${u.id}" type="button">Salva nome</button>
              <button class="btn-primary btn-small" data-set-rank="${u.id}" type="button">Salva grado</button>
              <button class="btn-secondary btn-small" data-set-password="${u.id}" type="button">Nuova password</button>
            </div>
          </td>
        </tr>
      `).join("");
      tbody.querySelectorAll("[data-update-name]").forEach(btn => {
        btn.addEventListener("click", () => updateName(btn.dataset.updateName));
      });
      tbody.querySelectorAll("[data-set-rank]").forEach(btn => {
        btn.addEventListener("click", () => setRank(btn.dataset.setRank));
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
    const { data, error: sessionError } = await db.auth.getSession();
    session = data?.session || null;
    if(sessionError || !session){
      $("#notLoggedPanel").classList.remove("hidden");
      return;
    }
    // Non basarsi soltanto su una sessione rimasta nel localStorage.
    const { data: identity, error: identityError } = await db.auth.getUser();
    if(identityError || !identity?.user){
      $("#notLoggedPanel").classList.remove("hidden");
      status("Sessione scaduta. Accedi nuovamente dalla console amministratori.", "error");
      return;
    }
    const user = identity.user;
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
      $("#adminPanel").classList.remove("hidden");
      await loadUsers();
      await loadRankHistory();
    }catch(err){
      status("Impossibile verificare il ruolo amministratore: " + (err.message || String(err)), "error");
    }
  }
  document.addEventListener("DOMContentLoaded", init);
})();
