(()=>{"use strict";
const $=s=>document.querySelector(s);
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const GRADES={trainee:"Tirocinante",nurse:"Infermiere",doctor:"Medico",chief_physician:"Primario",medical_director:"Direttore Sanitario"};
const label=rank=>GRADES[rank]||"Non assegnato";
const choices=selected=>Object.entries(GRADES).map(([id,name])=>'<option value="'+id+'"'+(selected===id?" selected":"")+'>'+name+'</option>').join("");
let db=null,busy=false,users=new Map();
const status=(message,bad=false)=>{
 const box=$("#medAdminStatus");
 box.textContent=message||"";
 box.dataset.error=bad?"true":"false";
};
const date=d=>d?new Date(d).toLocaleString("it-IT"):"—";
async function invoke(action,fields={}){
 const {data,error}=await db.functions.invoke("manage-medics",{body:{action,...fields}});
 if(error){
  let msg=error.message||"Errore servizio account medici.";
  if(error.context?.json)try{const json=await error.context.json();msg=json?.error||msg;}catch(_){}
  throw Error(msg);
 }
 if(data?.error)throw Error(data.error);
 return data;
}
async function refresh(){
 if(busy)return;
 try{
  const response=await invoke("list"),body=$("#medAccountsBody");
  const staff=response.users||[];
  users=new Map(staff.map(u=>[u.id,u]));
  body.innerHTML=staff.length?staff.map(u=>{
   const secure=!u.manageable;
   return '<tr><td><input data-med-name="'+escapeHtml(u.id)+'" value="'+escapeHtml(u.display_name)+'"'+(secure?' disabled':'')+' aria-label="Nome RP"></td>'+
   '<td>'+escapeHtml(u.email||"—")+'</td>'+
   '<td><select data-med-rank="'+escapeHtml(u.id)+'"'+(secure?' disabled':'')+'>'+choices(u.rank)+'</select></td>'+
   '<td>'+ (u.active?'Attivo':'Sospeso')+'</td>'+
   '<td>'+escapeHtml(date(u.last_sign_in_at))+'</td>'+
   '<td class="medic-account-actions">'+(secure?'<small>Account protetto</small>':
   '<button type="button" class="btn-secondary btn-small" data-med-name-save="'+escapeHtml(u.id)+'">Salva nome</button> '+
   '<button type="button" class="btn-primary btn-small" data-med-rank-save="'+escapeHtml(u.id)+'">Salva grado</button> '+
   '<button type="button" class="btn-secondary btn-small" data-med-password="'+escapeHtml(u.id)+'">Password</button> '+
   '<button type="button" class="btn-secondary btn-small" data-med-active="'+escapeHtml(u.id)+'">'+(u.active?'Sospendi':'Riattiva')+'</button>')+'</td></tr>';
  }).join(""):'<tr><td colspan="6">Nessun account medico presente.</td></tr>';
 }catch(e){
  $("#medAccountsBody").innerHTML='<tr><td colspan="6">Impossibile caricare gli account.</td></tr>';
  status(e.message||String(e),true);
 }
}
async function loadHistory(){
 try{
  const r=await invoke("rank_history");
  const list=r.history||[],names=new Map([...users.values()].map(u=>[u.id,u.display_name]));
  const out=$("#medRankHistory");
  out.innerHTML=list.length?'<table class="admin-table"><thead><tr><th>Data</th><th>Medico</th><th>Da</th><th>A</th><th>Motivo</th></tr></thead><tbody>'+
    list.map(h=>'<tr><td>'+escapeHtml(date(h.changed_at))+'</td><td>'+escapeHtml(names.get(h.user_id)||h.user_id)+'</td><td>'+escapeHtml(label(h.old_rank))+'</td><td><strong>'+escapeHtml(label(h.new_rank))+'</strong></td><td>'+escapeHtml(h.reason)+'</td></tr>').join("")+'</tbody></table>':'Nessuna promozione o retrocessione registrata.';
 }catch(e){$("#medRankHistory").textContent="Storico non disponibile: "+(e.message||String(e));}
}
async function saveRank(id){
 const u=users.get(id),rank=document.querySelector('[data-med-rank="'+id+'"]')?.value;
 if(!u||!rank)return;
 if(rank===u.rank){status("Questo grado è già assegnato.");return;}
 const reason=prompt("Motivazione per il cambio grado di "+u.display_name+" (minimo 5 caratteri):");
 if(reason===null)return;
 if(reason.trim().length<5){status("La motivazione deve contenere almeno 5 caratteri.",true);return;}
 if(!confirm("Confermi il nuovo grado "+label(rank)+" per "+u.display_name+"?"))return;
 await invoke("set_rank",{userId:id,rank,reason:reason.trim()});
 await refresh();await loadHistory();
 status("Grado aggiornato e registrato nello storico per "+u.display_name+".");
}
async function saveName(id){
 const u=users.get(id),name=document.querySelector('[data-med-name="'+id+'"]')?.value.trim();
 if(!u||!name)return status("Nome RP obbligatorio.",true);
 await invoke("update_name",{userId:id,displayName:name});
 await refresh();status("Nome RP aggiornato.");
}
async function changePassword(id){
 const u=users.get(id);if(!u)return;
 const password=prompt("Nuova password temporanea per "+u.display_name+" (minimo 8 caratteri):");
 if(password===null)return;
 if(password.length<8)return status("La password richiede almeno 8 caratteri.",true);
 if(!confirm("Confermi l'aggiornamento della password?"))return;
 await invoke("set_password",{userId:id,password});
 status("Password aggiornata. Consegnala privatamente al medico.");
}
async function toggle(id){
 const u=users.get(id);if(!u)return;
 const active=!u.active;
 if(!confirm((active?"Riattivare":"Sospendere")+" l'account di "+u.display_name+"?"))return;
 await invoke("toggle_active",{userId:id,active});
 await refresh();
 status("Account "+(active?"riattivato":"sospeso")+".");
}
async function create(e){
 e.preventDefault();
 const displayName=$("#medNewName").value.trim(),email=$("#medNewEmail").value.trim(),
 password=$("#medNewPassword").value,confirmPassword=$("#medNewPasswordConfirm").value,
 rank=$("#medNewRank").value;
 if(password.length<8)return status("Password minima: 8 caratteri.",true);
 if(password!==confirmPassword)return status("Le password non coincidono.",true);
 const button=$("#medCreateSubmit");
 button.disabled=true;
 try{
  await invoke("create",{displayName,email,password,rank});
  $("#medCreateForm").reset();await refresh();await loadHistory();
  status("Account medico "+displayName+" creato con grado "+label(rank)+".");
 }catch(err){status(err.message||String(err),true);}
 finally{button.disabled=false;}
}
function generatePassword(){
 const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
 const bytes=new Uint32Array(16);crypto.getRandomValues(bytes);
 const value=Array.from(bytes,v=>alphabet[v%alphabet.length]).join("");
 $("#medNewPassword").value=value;$("#medNewPasswordConfirm").value=value;
 status("Password generata e inserita nei campi: conservala in un luogo sicuro.");
}
async function init(){
 if(!window.supabase||!window.LC_SUPABASE_URL||!window.LC_SUPABASE_KEY){
  return status("Configurazione Supabase assente.",true);
 }
 db=window.supabase.createClient(window.LC_SUPABASE_URL,window.LC_SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
 const result=await db.auth.getUser();
 if(result.error||!result.data?.user){$("#medAdminLoginRequired").hidden=false;return;}
 const [portal,legacy]=await Promise.all([db.rpc("lc_portal_is_admin"),db.rpc("is_sheriff_admin")]);
 if((portal.error||portal.data!==true)&&(legacy.error||legacy.data!==true)){
  $("#medAdminLoginRequired").hidden=false;
  return status("Account non autorizzato alla gestione del personale medico.",true);
 }
 $("#medAdminPanel").hidden=false;
 $("#medCreateForm").addEventListener("submit",create);
 $("#medGeneratePassword").addEventListener("click",generatePassword);
 $("#medRefresh").addEventListener("click",async()=>{await refresh();await loadHistory()});
 $("#medAccountsBody").addEventListener("click",async e=>{
  const btn=e.target.closest("button");if(!btn||busy)return;
  const attr=["data-med-name-save","data-med-rank-save","data-med-password","data-med-active"].find(a=>btn.hasAttribute(a));
  if(!attr)return;
  busy=true;btn.disabled=true;
  try{
   const id=btn.getAttribute(attr);
   if(attr==="data-med-name-save")await saveName(id);
   if(attr==="data-med-rank-save")await saveRank(id);
   if(attr==="data-med-password")await changePassword(id);
   if(attr==="data-med-active")await toggle(id);
  }catch(err){status(err.message||String(err),true);}
  finally{busy=false;btn.disabled=false;}
 });
 await refresh();await loadHistory();
}
document.addEventListener("DOMContentLoaded",()=>{init().catch(e=>status(e.message||String(e),true));});
})();