import { withSupabase } from "npm:@supabase/server@^1";

type Body = {
  action?: "list" | "create" | "update_name" | "set_password";
  userId?: string;
  displayName?: string;
  email?: string;
  password?: string;
};

const clean = (v: unknown) => String(v ?? "").trim();

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    try {
      // Verifica l'utente reale sul server. Non usare user_metadata per autorizzare.
      const { data: authData, error: authError } = await ctx.supabase.auth.getUser();
      const caller = authData?.user;

      if (authError || !caller) {
        return Response.json({ error: "Sessione non valida." }, { status: 401 });
      }

      if (caller.app_metadata?.role !== "admin") {
        return Response.json({ error: "Operazione riservata agli amministratori." }, { status: 403 });
      }

      const { data: sheriffAdmin, error: sheriffError } = await ctx.supabase.rpc("is_sheriff_admin");
      if (sheriffError || sheriffAdmin !== true) {
        return Response.json({ error: "Accesso non autorizzato." }, { status: 403 });
      }

      const body = (await req.json().catch(() => ({}))) as Body;
      const action = body.action;
      const admin = ctx.supabaseAdmin;

      // Qualunque assegnazione amministrativa protegge l'account, anche sospesa.
      const { data: assignments, error: assignmentError } = await admin
        .from("lc_admin_assignments").select("user_id");
      if (assignmentError) throw assignmentError;
      const protectedIds = new Set((assignments || []).map((a) => a.user_id));
      const manageable = (u) => u && u.id !== caller.id &&
        u.app_metadata?.role === "sheriff" && !protectedIds.has(u.id);

      if (action === "update_name" || action === "set_password") {
        const userId = clean(body.userId);
        if (!userId) return Response.json({ error: "ID utente obbligatorio." }, { status: 400 });
        const { data: target, error: targetError } = await admin.auth.admin.getUserById(userId);
        if (targetError || !manageable(target?.user)) {
          return Response.json({ error: "Account protetto o non gestibile dalla sezione Sceriffi." }, { status: 403 });
        }
      }

      if (action === "list") {
        const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (error) throw error;

        const users = (data.users || []).filter(manageable).map((u) => ({
          id: u.id,
          email: u.email,
          display_name: u.user_metadata?.display_name || "",
          role: u.app_metadata?.role || "",
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
        }));

        return Response.json({ users });
      }

      if (action === "create") {
        const displayName = clean(body.displayName);
        const email = clean(body.email).toLowerCase();
        const password = String(body.password ?? "");

        if (!displayName) return Response.json({ error: "Nome RP obbligatorio." }, { status: 400 });
        if (!email || !email.includes("@")) return Response.json({ error: "Email non valida." }, { status: 400 });
        if (password.length < 8) return Response.json({ error: "Password minima: 8 caratteri." }, { status: 400 });

        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { display_name: displayName },
          app_metadata: { role: "sheriff" },
        });
        if (error) throw error;

        // Il ruolo app_metadata non abilita da solo l'accesso al gestionale.
        // Le RPC e le policy sheriff verificano la presenza in sheriff_members.
        const { error: membershipError } = await admin.from("sheriff_members").insert({
          user_id: data.user.id,
          officer_name: displayName,
        });
        if (membershipError) {
          // Evita di lasciare nuovi account di autenticazione senza abilitazione.
          const { error: rollbackError } = await admin.auth.admin.deleteUser(data.user.id);
          if (rollbackError) {
            return Response.json({
              error: "Account creato, ma abilitazione Sceriffi non riuscita. Intervento amministratore richiesto.",
            }, { status: 500 });
          }
          return Response.json({
            error: "Creazione annullata: impossibile registrare l'abilitazione Sceriffi.",
          }, { status: 500 });
        }

        return Response.json({
          ok: true,
          user: {
            id: data.user.id,
            email: data.user.email,
            display_name: data.user.user_metadata?.display_name || displayName,
            role: data.user.app_metadata?.role || "sheriff",
          },
        });
      }

      if (action === "update_name") {
        const userId = clean(body.userId);
        const displayName = clean(body.displayName);
        if (!userId || !displayName) return Response.json({ error: "ID utente e nome RP obbligatori." }, { status: 400 });

        const { data: current, error: currentError } = await admin.auth.admin.getUserById(userId);
        if (currentError) throw currentError;

        const existing = current.user?.user_metadata || {};
        const { data, error } = await admin.auth.admin.updateUserById(userId, {
          user_metadata: { ...existing, display_name: displayName },
        });
        if (error) throw error;

        // Allinea anche l'anagrafica interna, senza creare nuove abilitazioni.
        const { error: memberError } = await admin.from("sheriff_members")
          .update({ officer_name: displayName })
          .eq("user_id", userId);
        if (memberError) {
          return Response.json({
            error: "Nome account modificato, ma sincronizzazione dell'anagrafica Sceriffi non riuscita.",
          }, { status: 500 });
        }

        return Response.json({ ok: true, userId: data.user.id, display_name: displayName });
      }

      if (action === "set_password") {
        const userId = clean(body.userId);
        const password = String(body.password ?? "");
        if (!userId) return Response.json({ error: "ID utente obbligatorio." }, { status: 400 });
        if (password.length < 8) return Response.json({ error: "Password minima: 8 caratteri." }, { status: 400 });

        const { error } = await admin.auth.admin.updateUserById(userId, { password });
        if (error) throw error;

        return Response.json({ ok: true });
      }

      return Response.json({ error: "Azione non riconosciuta." }, { status: 400 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Response.json({ error: message }, { status: 500 });
    }
  }),
};

