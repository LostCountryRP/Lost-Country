import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// Client injection permits authorization tests without touching real accounts.
export function createHandler(clientFactory: any, env: any) {
 const cors = {"Access-Control-Allow-Origin":"https://lostcountryrp.github.io", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS", "Vary":"Origin"};
 const reply = (body: any, status=200) => Response.json(body,{status,headers:cors});
 return async (req: Request) => {
  if(req.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST') return reply({error:'Metodo non consentito.'},405);
  try {
   const authorization=req.headers.get('Authorization');
   if(!authorization?.startsWith('Bearer ')) return reply({error:'Accesso richiesto.'},401);
   const db=clientFactory(env.url,env.anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
   const {data:identity,error:identityError}=await db.auth.getUser();
   if(identityError||!identity?.user) return reply({error:'Sessione non valida.'},401);
   const [portal,legacy]=await Promise.all([db.rpc('lc_portal_is_admin'),db.rpc('is_sheriff_admin')]);
   if((portal.error||portal.data!==true)&&(legacy.error||legacy.data!==true)) return reply({error:'Gestione account riservata agli amministratori.'},403);
   const body=await req.json().catch(()=>null);
   if(!body||!['list','create','set_password','toggle_active'].includes(body.action)) return reply({error:'Azione non valida.'},400);
   const admin=clientFactory(env.url,env.service,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data:assignments,error:assignmentError}=await admin.from('lc_admin_assignments').select('user_id');
   if(assignmentError) throw assignmentError;
   const protectedIds=new Set((assignments||[]).map((a:any)=>a.user_id));
   const manageable=(u:any)=>u&&u.id!==identity.user.id&&u.app_metadata?.role==='civic_staff'&&!protectedIds.has(u.id);
   if(body.action==='create') {
    const name=String(body.displayName??'').trim();
    const email=String(body.email??'').trim().toLowerCase();
    const password=String(body.password??'');
    if(name.length<2||name.length>120) return reply({error:'Nome RP: da 2 a 120 caratteri.'},400);
    if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({error:'Email non valida.'},400);
    if(password.length<12||password.length>128) return reply({error:'Password: da 12 a 128 caratteri.'},400);
    const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:name},app_metadata:{role:'civic_staff'}});
    if(error) return reply({error:'Creazione non riuscita. Verifica email già registrata e requisiti della password.'},400);
    const {error:memberError}=await admin.from('civic_staff').insert({user_id:data.user.id,display_name:name,active:true});
    if(memberError) {
     const rollback=await admin.auth.admin.deleteUser(data.user.id);
     return reply({error:rollback.error?'Account creato ma abilitazione fallita: intervento amministrativo necessario.':'Creazione annullata: abilitazione civica non riuscita.'},500);
    }
    return reply({ok:true,user:{id:data.user.id,display_name:name,email}});
   }
   if(body.action==='list') {
    const {data:members,error}=await admin.from('civic_staff').select('user_id,display_name,active,created_at').order('created_at',{ascending:false}).limit(200);
    if(error) throw error;
    const users=[];
    for(const m of members||[]) {
     const {data:account,error:accountError}=await admin.auth.admin.getUserById(m.user_id);
     if(accountError) throw accountError;
     users.push({...m,id:m.user_id,email:account.user.email,manageable:!!manageable(account.user)});
    }
    return reply({users});
   }
   if(typeof body.userId!=='string'||!body.userId) return reply({error:'Account obbligatorio.'},400);
   const {data:account,error:accountError}=await admin.auth.admin.getUserById(body.userId);
   if(accountError||!manageable(account?.user)) return reply({error:'Account protetto o non civico.'},403);
   const member=await admin.from('civic_staff').select('user_id').eq('user_id',body.userId).maybeSingle();
   if(member.error||!member.data) return reply({error:'Abilitazione civica assente.'},403);
   if(body.action==='toggle_active') {
    if(typeof body.active!=='boolean') return reply({error:'Stato non valido.'},400);
    const {error}=await admin.from('civic_staff').update({active:body.active}).eq('user_id',body.userId);
    if(error) throw error;
   } else {
    const password=String(body.password??'');
    if(password.length<12||password.length>128) return reply({error:'Password: da 12 a 128 caratteri.'},400);
    const {error}=await admin.auth.admin.updateUserById(body.userId,{password});
    if(error) throw error;
   }
   return reply({ok:true});
  } catch { return reply({error:'Operazione non riuscita. Riprova o contatta l’amministratore.'},500); }
 };
}
if(typeof Deno!=='undefined') Deno.serve(createHandler(createClient,{
 url:Deno.env.get('SUPABASE_URL'),anon:Deno.env.get('SUPABASE_ANON_KEY'),service:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
}));
