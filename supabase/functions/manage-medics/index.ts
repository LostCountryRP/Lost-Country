import { withSupabase } from "npm:@supabase/server@^1";

type RequestBody = {
 action?: "list" | "create" | "update_name" | "set_password" | "set_rank" | "toggle_active" | "rank_history";
 userId?: string;
 email?: string;
 displayName?: string;
 password?: string;
 rank?: string;
 reason?: string;
 active?: boolean;
};
const ranks = new Set(["trainee","nurse","doctor","chief_physician","medical_director"]);
const clean = (value: unknown) => String(value ?? "").trim();
function errorResponse(message: string, status = 400){
 return Response.json({error:message},{status});
}

export default {
 fetch: withSupabase({auth:"user"}, async (req,ctx) => {
  try {
   const {data:identity,error:identityError}=await ctx.supabase.auth.getUser();
   const caller=identity?.user;
   if(identityError||!caller)return errorResponse("Sessione scaduta. Accedi alla console amministrativa.",401);
   const [portal,legacy]=await Promise.all([
    ctx.supabase.rpc("lc_portal_is_admin"),
    ctx.supabase.rpc("is_sheriff_admin")
   ]);
   if((portal.error||portal.data!==true)&&(legacy.error||legacy.data!==true)){
    return errorResponse("Gestione medici riservata agli amministratori.",403);
   }

   const body=(await req.json().catch(()=>({}))) as RequestBody;
   const admin=ctx.supabaseAdmin;
   const {data:assignments,error:assignError}=await admin.from("lc_admin_assignments").select("user_id");
   if(assignError)throw assignError;
   const protectedIds=new Set((assignments||[]).map(x=>x.user_id));
   const manageable=(user:any)=>!!user&&user.id!==caller.id&&
    user.app_metadata?.role==="medic"&&!protectedIds.has(user.id);

   if(body.action==="list"){
    const [members,accounts]=await Promise.all([
     admin.from("medical_staff").select("user_id,display_name,active,rank").order("display_name"),
     admin.auth.admin.listUsers({page:1,perPage:200})
    ]);
    if(members.error)throw members.error;
    if(accounts.error)throw accounts.error;
    const byId=new Map((accounts.data.users||[]).map(u=>[u.id,u]));
    return Response.json({users:(members.data||[]).map(m=>{
     const u=byId.get(m.user_id);
     return {id:m.user_id,display_name:m.display_name,email:u?.email||"",
       role:u?.app_metadata?.role||"account_esistente",
       rank:m.rank,active:m.active,created_at:u?.created_at||null,
       last_sign_in_at:u?.last_sign_in_at||null,
       manageable:manageable(u)};
    })});
   }

   if(body.action==="rank_history"){
    const {data,error}=await admin.from("medical_rank_history")
     .select("user_id,old_rank,new_rank,changed_by,reason,changed_at")
     .order("changed_at",{ascending:false}).limit(50);
    if(error)throw error;
    return Response.json({history:data||[]});
   }

   if(body.action==="create"){
    const displayName=clean(body.displayName);
    const email=clean(body.email).toLowerCase();
    const password=String(body.password??"");
    const rank=clean(body.rank)||"trainee";
    if(displayName.length<2)return errorResponse("Nome RP minimo: 2 caratteri.");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return errorResponse("Indirizzo email non valido.");
    if(password.length<8)return errorResponse("Password minima: 8 caratteri.");
    if(!ranks.has(rank))return errorResponse("Grado non valido.");
    const {data,error}=await admin.auth.admin.createUser({
     email,password,email_confirm:true,
     user_metadata:{display_name:displayName},
     app_metadata:{role:"medic"}
    });
    if(error)throw error;
    const {error:staffError}=await admin.from("medical_staff").insert({
     user_id:data.user.id,display_name:displayName,active:true,rank
    });
    if(staffError){
     const {error:rollbackError}=await admin.auth.admin.deleteUser(data.user.id);
     return errorResponse(rollbackError?
      "Account creato ma abilitazione non riuscita; serve intervento amministrativo.":
      "Creazione annullata: impossibile attivare il medico.",500);
    }
    return Response.json({ok:true,user:{id:data.user.id,display_name:displayName,email,rank}});
   }

   const userId=clean(body.userId);
   if(!userId)return errorResponse("ID account obbligatorio.");
   const {data:target,error:targetError}=await admin.auth.admin.getUserById(userId);
   if(targetError||!manageable(target?.user))return errorResponse("Account non gestibile: amministratore o utente protetto.",403);

   if(body.action==="set_rank"){
    const rank=clean(body.rank),reason=clean(body.reason);
    if(!ranks.has(rank))return errorResponse("Grado non valido.");
    if(reason.length<5)return errorResponse("Inserisci una motivazione di almeno 5 caratteri.");
    // Il cambio grado e il registro audit sono atomici e verificano l'admin sul DB.
    const {error}=await ctx.supabase.rpc("lc_set_medical_rank",{
      p_user_id:userId,p_new_rank:rank,p_reason:reason
    });
    if(error)throw error;
    return Response.json({ok:true,rank});
   }

   if(body.action==="update_name"){
    const name=clean(body.displayName);
    if(name.length<2)return errorResponse("Nome RP minimo: 2 caratteri.");
    const {error:staffError}=await admin.from("medical_staff")
     .update({display_name:name}).eq("user_id",userId);
    if(staffError)throw staffError;
    const prev=target.user.user_metadata||{};
    const {error}=await admin.auth.admin.updateUserById(userId,{
     user_metadata:{...prev,display_name:name}
    });
    if(error)return errorResponse("Nome nel registro aggiornato, ma aggiornamento credenziali non riuscito.",500);
    return Response.json({ok:true});
   }

   if(body.action==="set_password"){
    const password=String(body.password??"");
    if(password.length<8)return errorResponse("Password minima: 8 caratteri.");
    const {error}=await admin.auth.admin.updateUserById(userId,{password});
    if(error)throw error;
    return Response.json({ok:true});
   }

   if(body.action==="toggle_active"){
    if(typeof body.active!=="boolean")return errorResponse("Stato attivo non valido.");
    const {error}=await admin.from("medical_staff")
     .update({active:body.active}).eq("user_id",userId);
    if(error)throw error;
    return Response.json({ok:true,active:body.active});
   }

   return errorResponse("Azione non riconosciuta.");
  }catch(err){
   const message=err instanceof Error?err.message:String(err);
   return errorResponse(message,500);
  }
 })
};