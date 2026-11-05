/* Lost Country RP — recupero password tramite Supabase Auth */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  let client;
  let recoveryAuthorized = false;

  function message(text, isError = false) {
    const status = $("recoveryStatus");
    status.textContent = text;
    status.dataset.error = String(isError);
  }

  async function sendRecovery(event) {
    event.preventDefault();
    const button = $("requestResetBtn");
    button.disabled = true;
    message("");
    try {
      const email = $("recoveryEmail").value.trim();
      const redirectTo = new URL("recupero-password.html", window.location.href).href;
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      message("Se l'indirizzo è associato a un account, riceverai una email per reimpostare la password. Controlla anche lo spam.");
    } catch (error) {
      message("Invio non riuscito: " + (error.message || "riprova più tardi."), true);
    } finally {
      button.disabled = false;
    }
  }

  function showRecovery(session) {
    if (!session?.user) return;
    recoveryAuthorized = true;
    $("recoveryRequestPanel").hidden = true;
    $("recoveryUpdatePanel").hidden = false;
    message("Link verificato. Puoi scegliere la nuova password.");
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  async function changePassword(event) {
    event.preventDefault();
    if (!recoveryAuthorized) {
      message("Link non verificato. Richiedi una nuova email di recupero.", true);
      return;
    }
    const password = $("recoveryNewPassword").value;
    const confirm = $("recoveryConfirmPassword").value;
    if (password.length < 12 || password !== confirm) {
      message("Inserisci almeno 12 caratteri e conferma la stessa password.", true);
      return;
    }
    const button = $("updatePasswordBtn");
    button.disabled = true;
    message("");
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      recoveryAuthorized = false;
      $("updatePasswordForm").reset();
      $("recoveryUpdatePanel").hidden = true;
      $("recoverySuccessPanel").hidden = false;
      message("Password aggiornata. Accedi al portale utilizzando la nuova password.");
      await client.auth.signOut({ scope: "local" });
    } catch (error) {
      message("Aggiornamento non riuscito: " + (error.message || "riprova."), true);
    } finally {
      button.disabled = false;
    }
  }

  async function init() {
    $("requestResetForm").addEventListener("submit", sendRecovery);
    $("updatePasswordForm").addEventListener("submit", changePassword);
    if (!window.supabase?.createClient || !window.LC_SUPABASE_URL || !window.LC_SUPABASE_KEY) {
      $("requestResetBtn").disabled = true;
      message("Autenticazione non disponibile. Riprova più tardi.", true);
      return;
    }
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const params = new URLSearchParams(window.location.search);
    const hasError = hash.has("error") || params.has("error");
    client = window.supabase.createClient(window.LC_SUPABASE_URL, window.LC_SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") showRecovery(session);
    });
    if (params.get("type") === "recovery" && params.get("token_hash")) {
      const { data, error } = await client.auth.verifyOtp({
        token_hash: params.get("token_hash"), type: "recovery"
      });
      if (error) message("Il link è scaduto o non è valido. Richiedine uno nuovo.", true);
      else if (data.session) showRecovery(data.session);
    } else if (hasError) {
      message("Il link è scaduto o non è valido. Richiedine uno nuovo.", true);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch(() => message("Errore di autenticazione. Ricarica la pagina.", true));
  });
})();
