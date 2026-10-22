/* Lost Country: estensione indipendente per eliminare account dal pannello Admin. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  let busy = false;
  function show(message, error = false) {
    const el = $("#adminStatus");
    if (!el) return;
    el.textContent = message;
    el.style.color = error ? "#831616" : "#28522d";
  }
  function enhanceRows() {
    const tbody = $("#usersBody");
    if (!tbody) return;
    for (const row of tbody.querySelectorAll("tr")) {
      const nameButton = row.querySelector("[data-update-name]");
      const userId = nameButton?.getAttribute("data-update-name");
      const actions = row.querySelector(".admin-actions");
      if (!userId || !actions || actions.querySelector("[data-delete-sheriff]")) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn-danger btn-small";
      button.textContent = "Elimina account";
      button.setAttribute("data-delete-sheriff", userId);
      actions.appendChild(button);
    }
  }
  async function deleteSheriff(button) {
    if (busy) return;
    const userId = button.getAttribute("data-delete-sheriff");
    const row = button.closest("tr");
    const email = row?.cells?.[1]?.textContent?.trim();
    if (!userId || !email || email === "—") return show("Email account non disponibile.", true);
    const entered = window.prompt(`Rimozione dell’accesso di ${email}.\n\nPer confermare, scrivi esattamente l'email dell'account:`);
    if (entered === null) return;
    if (entered.trim().toLowerCase() !== email.toLowerCase()) return show("Conferma non corrispondente: nessun account eliminato.", true);
    if (!window.confirm(`Confermi la rimozione dell’account ${email}? Se esistono dati storici, l’utente verrà bloccato senza cancellare i verbali.`)) return;
    busy = true;
    button.disabled = true;
    show("Verifica storico e rimozione accesso in corso...");
    try {
      const db = window.supabase.createClient(window.LC_SUPABASE_URL, window.LC_SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
      const { data: sessionData, error: sessionError } = await db.auth.getSession();
      if (sessionError || !sessionData.session) throw new Error("Accedi come amministratore prima di eliminare l'account.");
      const { data, error } = await db.functions.invoke("delete-sheriff-account", {
        body: { userId, confirmEmail: email },
      });
      if (error) {
        const details = error.context && typeof error.context.json === "function"
          ? await error.context.json().catch(() => null) : null;
        throw new Error(details?.error || error.message);
      }
      if (!data?.ok) throw new Error(data?.error || "Eliminazione non confermata dal server.");
      row?.remove();
      show(data.action === "deleted"
        ? `Account ${email} eliminato definitivamente.`
        : `Account ${email} bloccato e autorizzazione revocata. Verbali conservati.`);
    } catch (err) {
      show("Errore: " + (err?.message || String(err)), true);
      button.disabled = false;
    } finally { busy = false; }
  }
  document.addEventListener("DOMContentLoaded", () => {
    const tbody = $("#usersBody");
    if (!tbody) return;
    new MutationObserver(enhanceRows).observe(tbody, { childList: true, subtree: true });
    enhanceRows();
    tbody.addEventListener("click", (event) => {
      const button = event.target.closest?.("button[data-delete-sheriff]");
      if (button) deleteSheriff(button);
    });
  });
})();
