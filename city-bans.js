(()=>{"use strict";
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
let db=null,officer="",rows=[];
const status=(m,bad=false)=>{const e=$("#banStatus");if(e){e.textContent=m;e.style.color=bad?"#a22":"";}};
const active=b=>!b.revoked_at&&(!b.expires_at||new Date(b.expires_at)>new Date());
function render(){
 const q=$("#banSearch").value.trim().toLocaleLowerCase("it"),only=$("#banActiveOnly").checked;
 const filtered=rows.filter(b=>(!only||active(b))&&[b.citizen_name,b.city,b.reason,b.officer_name].join(" ").toLocaleLowerCase("it").includes(q));
 $("#banCount").textContent=filtered.length+" risultati • "+rows.filter(active).length+" bandi attivi";
 $("#banList").innerHTML=filtered.length?filtered.map(b=>{
 const a=active(b),expired=!a&&!b.revoked_at;
 return '<div class="case-card"><strong>'+esc(b.citizen_name)+'</strong> — '+esc(b.city)+
 '<p><strong>Stato:</strong> '+(b.revoked_at?"REVOCATO":expired?"SCADUTO":"ATTIVO")+
 ' | <strong>Emesso:</strong> '+new Date(b.issued_at).toLocaleString("it-IT")+
 ' | <strong>Fine:</strong> '+(b.expires_at?new Date(b.expires_at).toLocaleString("it-IT"):"Fino a revoca")+
 '</p><p><strong>Motivo:</strong> '+esc(b.reason)+'</p><p><strong>Sceriffo:</strong> '+esc(b.officer_name)+'</p>'+
 (b.revoked_at?'<p><strong>Revocato da:</strong> '+esc(b.revoked_by_name)+' — '+esc(b.revoke_reason)+'</p>':'')+
 (a?'<button type="button" class="btn-secondary btn-small" data-revoke="'+esc(b.id)+'">Revoca bando</button>':'')+'</div>';
 }).join(""):'<p class="empty-state">Nessun bando corrispondente.</p>';
 $("#banList").querySelectorAll("[data-revoke]").forEach(x=>x.addEventListener("click",()=>revoke(x.dataset.revoke)));
}
async function refresh(){
 if(!db)return;const{data:session}=await db.auth.getSession();
 if(!session.session){status("Accedi come Sceriffo per consultare il registro.",true);return;}
 const {data,error}=await db.from("city_bans").select("*").order("issued_at",{ascending:false});
 if(error){status("Registro non disponibile. Verifica che la migrazione SQL sia stata eseguita: "+error.message,true);return;}
 rows=data||[];render();status("");
}
async function ensureOfficer(){
 const {data}=await db.auth.getSession();if(!data.session)throw Error("Devi accedere come Sceriffo.");
 const r=await db.rpc("current_sheriff_name");if(r.error||!r.data)throw Error("Account Sceriffo non autorizzato.");
 return String(r.data).trim();
}
async function create(e){
 e.preventDefault();const btn=$("#createBanBtn");btn.disabled=true;
 try{
  officer=await ensureOfficer();const citizen_name=$("#banCitizen").value.trim(),city=$("#banCity").value.trim(),reason=$("#banReason").value.trim();
  const expires=$("#banExpires").value;
  if(citizen_name.length<3||city.length<2||reason.length<10)throw Error("Compila cittadino, città e motivo (almeno 10 caratteri).");
  const payload={citizen_name,city,reason,officer_name:officer};
  if(expires)payload.expires_at=new Date(expires).toISOString();
  if(expires&&new Date(expires)<=new Date())throw Error("La scadenza deve essere futura.");
  const {error}=await db.from("city_bans").insert(payload);if(error)throw error;
  $("#banForm").reset();await refresh();status("Bando registrato correttamente.");
 }catch(err){status(err.message||String(err),true)}finally{btn.disabled=false;}
}
async function revoke(id){
 const why=prompt("Motivo della revoca del bando (obbligatorio):");if(why===null)return;
 if(why.trim().length<3){status("Inserisci una motivazione valida.",true);return;}
 if(!confirm("Confermi la revoca di questo bando?"))return;
 try{
  const name=await ensureOfficer();const {error}=await db.from("city_bans").update({revoked_at:new Date().toISOString(),revoked_by:(await db.auth.getUser()).data.user.id,revoked_by_name:name,revoke_reason:why.trim()}).eq("id",id).is("revoked_at",null);
  if(error)throw error;await refresh();status("Bando revocato.");
 }catch(err){status(err.message||String(err),true);}
}
document.addEventListener("DOMContentLoaded",()=>{
 if(!$("#banForm")||!window.supabase||!window.LC_SUPABASE_URL)return;
 db=window.supabase.createClient(window.LC_SUPABASE_URL,window.LC_SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
 $("#banForm").addEventListener("submit",create);$("#banSearch").addEventListener("input",render);$("#banActiveOnly").addEventListener("change",render);$("#banRefresh").addEventListener("click",refresh);
 db.auth.onAuthStateChange(()=>setTimeout(refresh,0));
 refresh();
});
})();
