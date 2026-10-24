(()=>{"use strict";
const $=s=>document.querySelector(s),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let db,items=[];
const output=(m,bad=false)=>{const n=$("#licenseStatus");if(n){n.textContent=m;n.style.color=bad?"#a33":""}};
const format=d=>d?new Date(d).toLocaleString("it-IT"):"—";
function current(l){return !l.revoked_at&&new Date(l.expires_at)>new Date()}
function render(){
 const term=$("#licenseSearch").value.trim().toLocaleLowerCase("it"),only=$("#licenseActiveOnly").checked;
 const data=items.filter(x=>(!only||current(x))&&[x.license_number,x.citizen_name,x.issued_by_name].join(" ").toLocaleLowerCase("it").includes(term));
 $("#licenseCount").textContent=data.length+" risultati — "+items.filter(current).length+" licenze valide";
 $("#licenseList").innerHTML=data.length?data.map(x=>'<article class="case-card"><h3>'+esc(x.license_number)+'</h3><p><strong>Titolare:</strong> '+esc(x.citizen_name)+'</p><p><strong>Tipo:</strong> Licenza per ricerca dell’oro | <strong>Stato:</strong> '+(x.revoked_at?"REVOCATA":current(x)?"VALIDA":"SCADUTA")+'</p><p><strong>Rilascio:</strong> '+format(x.issued_at)+' | <strong>Scadenza:</strong> '+format(x.expires_at)+'</p><p><strong>Autorità:</strong> '+esc(x.issued_by_name)+'</p>'+(x.notes?'<p><strong>Note:</strong> '+esc(x.notes)+'</p>':'')+(x.revoked_at?'<p><strong>Revoca:</strong> '+format(x.revoked_at)+' — '+esc(x.revoked_by_name)+'; '+esc(x.revocation_reason)+'</p>':'')+'<button type="button" class="btn-secondary btn-small" data-print="'+esc(x.id)+'">Stampa certificato</button> '+(current(x)?'<button type="button" class="btn-danger btn-small" data-revoke-license="'+esc(x.id)+'">Revoca licenza</button>':'')+'</article>').join(""):'<p class="empty-state">Nessuna licenza trovata.</p>';
 $("#licenseList").querySelectorAll("[data-revoke-license]").forEach(b=>b.addEventListener("click",()=>revoke(b.dataset.revokeLicense)));
 $("#licenseList").querySelectorAll("[data-print]").forEach(b=>b.addEventListener("click",()=>printLicense(b.dataset.print)));
}
async function officer(){
 const {data}=await db.auth.getSession();if(!data.session)throw Error("Accedi come Sceriffo.");
 const {data:name,error}=await db.rpc("current_sheriff_name");if(error||!name)throw Error("Account non autorizzato.");
 return {name:String(name).trim(),id:data.session.user.id};
}
async function load(){
 try{await officer();const {data,error}=await db.from("licenses").select("*").order("issued_at",{ascending:false});if(error)throw error;items=data||[];render();output("");}
 catch(e){output("Registro licenze non disponibile: "+e.message,true)}
}
async function issue(e){
 e.preventDefault();const button=$("#licenseIssueBtn");button.disabled=true;
 try{
  const o=await officer(),citizen_name=$("#licenseCitizen").value.trim(),value=$("#licenseExpiry").value,notes=$("#licenseNotes").value.trim();
  if(citizen_name.length<3)throw Error("Inserisci un nominativo valido.");
  if(!value||new Date(value)<=new Date())throw Error("La scadenza deve essere futura.");
  const {error}=await db.from("licenses").insert({citizen_name,expires_at:new Date(value).toISOString(),notes,issued_by:o.id,issued_by_name:o.name});
  if(error)throw error;$("#licenseForm").reset();await load();output("Licenza rilasciata e registrata.");
 }catch(err){output(err.message||String(err),true)}finally{button.disabled=false}
}
async function revoke(id){
 const reason=prompt("Motivazione della revoca (obbligatoria):");if(reason===null)return;
 if(reason.trim().length<5){output("Inserisci almeno 5 caratteri di motivazione.",true);return}
 if(!confirm("Confermi la revoca definitiva della licenza?"))return;
 try{const o=await officer();const {error}=await db.from("licenses").update({revoked_at:new Date().toISOString(),revoked_by:o.id,revoked_by_name:o.name,revocation_reason:reason.trim()}).eq("id",id).is("revoked_at",null);if(error)throw error;await load();output("Licenza revocata.");}
 catch(err){output(err.message||String(err),true)}
}
function printLicense(id){
 const x=items.find(l=>l.id===id);if(!x)return;
 const w=window.open("","_blank","width=800,height=650");if(!w){output("Consenti le finestre popup per stampare.",true);return}
 w.document.write('<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Licenza '+esc(x.license_number)+'</title><style>body{background:#f0e2bf;color:#35271b;font-family:Georgia,serif;text-align:center;padding:45px;border:10px double #725230}h1{font-size:34px}p{font-size:20px;line-height:1.8}.seal{font-size:35px}</style></head><body><div class="seal">★</div><h1>LOST COUNTRY — LICENZA</h1><h2>Ricerca dell’oro</h2><p>Documento n. <strong>'+esc(x.license_number)+'</strong></p><p>Si autorizza <strong>'+esc(x.citizen_name)+'</strong><br>all’attività di ricerca dell’oro.</p><p>Rilasciata: '+format(x.issued_at)+'<br>Valida fino al: '+format(x.expires_at)+'</p><p>Autorità: '+esc(x.issued_by_name)+'</p><p>Stato: <strong>'+(x.revoked_at?"REVOCATA":current(x)?"VALIDA":"SCADUTA")+'</strong></p><small>La validità deve essere verificata nel registro ufficiale.</small></body></html>');
 w.document.close();w.focus();w.print();
}
document.addEventListener("DOMContentLoaded",()=>{
 if(!$("#licenseForm")||!window.supabase||!window.LC_SUPABASE_URL)return;
 db=window.supabase.createClient(window.LC_SUPABASE_URL,window.LC_SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
 $("#licenseForm").addEventListener("submit",issue);
 $("#licenseSearch").addEventListener("input",render);
 $("#licenseActiveOnly").addEventListener("change",render);
 $("#licenseRefresh").addEventListener("click",load);
 db.auth.onAuthStateChange(()=>setTimeout(load,0));load();
});
})();