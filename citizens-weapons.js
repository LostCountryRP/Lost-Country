(()=>{"use strict";
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let db,people=[],weapons=[],history=[];
const msg=(id,t,bad=false)=>{const e=$(id);if(e){e.textContent=t;e.style.color=bad?"#a33":""}};
async function auth(){
 const {data}=await db.auth.getSession();if(!data.session)throw Error("Accedi come Sceriffo.");
 const r=await db.rpc("current_sheriff_name");if(r.error||!r.data)throw Error("Account non autorizzato.");
 return {id:data.session.user.id,name:String(r.data).trim()};
}
const nameOf=id=>people.find(p=>p.id===id)?.full_name||"Sconosciuto";
function options(){
 const opts='<option value="">Seleziona cittadino</option>'+people.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.full_name)+'</option>').join("");
 ["weaponOwner","weaponNewOwner"].forEach(id=>{let e=$("#"+id),prev=e.value;e.innerHTML=opts;e.value=prev});
}
function renderPeople(){
 const q=$("#citizenRegistrySearch").value.trim().toLowerCase();
 const filtered=people.filter(x=>[x.full_name,x.residence,x.occupation,x.birthplace].join(" ").toLowerCase().includes(q));
 $("#citizenRegistryCount").textContent=filtered.length+" cittadini";
 $("#citizenRegistryList").innerHTML=filtered.length?filtered.map(p=>'<article class="case-card"><strong>'+esc(p.full_name)+'</strong><p>Nascita: '+esc(p.birth_date||"Non indicata")+' · Luogo: '+esc(p.birthplace||"—")+'</p><p>Residenza: '+esc(p.residence||"—")+' · Professione: '+esc(p.occupation||"—")+'</p>'+(p.notes?'<p>Note: '+esc(p.notes)+'</p>':'')+'<button type="button" class="btn-secondary btn-small" data-citizen-edit="'+esc(p.id)+'">Modifica scheda</button></article>').join(""):'<p class="empty-state">Nessun cittadino.</p>';
 $("#citizenRegistryList").querySelectorAll("[data-citizen-edit]").forEach(b=>b.onclick=()=>editCitizen(b.dataset.citizenEdit));
}
function renderWeapons(){
 const q=$("#weaponRegistrySearch").value.trim().toLowerCase();
 const filtered=weapons.filter(x=>[x.serial_number,x.weapon_type,x.status,nameOf(x.owner_id)].join(" ").toLowerCase().includes(q));
 $("#weaponRegistryCount").textContent=filtered.length+" armi";
 $("#weaponRegistryList").innerHTML=filtered.length?filtered.map(w=>'<article class="case-card"><h3>'+esc(w.serial_number)+'</h3><p>'+esc(w.weapon_type)+' — <strong>'+esc(w.status)+'</strong></p><p>Intestatario: '+esc(nameOf(w.owner_id))+'</p><p>'+esc(w.notes||"")+'</p><button type="button" class="btn-secondary btn-small" data-weapon-edit="'+esc(w.id)+'">Trasferisci / cambia stato</button> <button type="button" class="btn-secondary btn-small" data-weapon-history="'+esc(w.id)+'">Storico</button></article>').join(""):'<p class="empty-state">Nessuna arma trovata.</p>';
 $("#weaponRegistryList").querySelectorAll("[data-weapon-edit]").forEach(b=>b.onclick=()=>changeWeapon(b.dataset.weaponEdit));
 $("#weaponRegistryList").querySelectorAll("[data-weapon-history]").forEach(b=>b.onclick=()=>showHistory(b.dataset.weaponHistory));
}
function showHistory(id){
 const data=history.filter(h=>h.weapon_id===id);
 const w=weapons.find(x=>x.id===id);if(!w)return;
 alert("Storico "+w.serial_number+"\n\n"+(data.map(h=>new Date(h.changed_at).toLocaleString("it-IT")+" · "+h.changed_by_name+"\n"+nameOf(h.previous_owner_id)+" → "+nameOf(h.new_owner_id)+"\n"+(h.previous_status||"—")+" → "+(h.new_status||"—")+"\n"+h.reason).join("\n\n")||"Nessuna voce"));
}
async function load(){
 try{
  await auth();
  const [a,b,c]=await Promise.all([db.from("citizen_registry").select("*").order("full_name"),db.from("weapon_registry").select("*").order("registered_at",{ascending:false}),db.from("weapon_registry_history").select("*").order("changed_at",{ascending:false})]);
  if(a.error||b.error||c.error)throw(a.error||b.error||c.error);
  people=a.data||[];weapons=b.data||[];history=c.data||[];
  options();renderPeople();renderWeapons();msg("#registryStatus","");
 }catch(e){msg("#registryStatus","Registro non disponibile. Esegui sql/citizens-weapons.sql su Supabase. "+e.message,true)}
}
async function createCitizen(e){
 e.preventDefault();
 const button=$("#citizenRegistrySave");button.disabled=true;
 try{
  const a=await auth(),full_name=$("#registryFullName").value.trim();
  if(full_name.length<3)throw Error("Nome non valido.");
  const payload={full_name,birth_date:$("#registryBirthDate").value||null,birthplace:$("#registryBirthplace").value.trim(),residence:$("#registryResidence").value.trim(),occupation:$("#registryOccupation").value.trim(),notes:$("#registryCitizenNotes").value.trim(),created_by:a.id,updated_by:a.id};
  const r=await db.from("citizen_registry").insert(payload);if(r.error)throw r.error;
  $("#citizenRegistryForm").reset();await load();msg("#registryStatus","Cittadino registrato.");
 }catch(e){msg("#registryStatus",e.message,true)}finally{button.disabled=false}
}
async function editCitizen(id){
 const p=people.find(x=>x.id===id);if(!p)return;
 const residence=prompt("Residenza di "+p.full_name,p.residence||"");if(residence===null)return;
 const occupation=prompt("Professione",p.occupation||"");if(occupation===null)return;
 const notes=prompt("Note",p.notes||"");if(notes===null)return;
 try{const a=await auth();const r=await db.from("citizen_registry").update({residence:residence.trim(),occupation:occupation.trim(),notes:notes.trim(),updated_by:a.id,updated_at:new Date().toISOString()}).eq("id",id);if(r.error)throw r.error;await load();msg("#registryStatus","Scheda aggiornata.");}
 catch(e){msg("#registryStatus",e.message,true)}
}
async function createWeapon(e){
 e.preventDefault();const b=$("#weaponRegistrySave");b.disabled=true;
 try{
  const a=await auth(),serial_number=$("#weaponSerial").value.trim().toUpperCase(),weapon_type=$("#weaponType").value.trim(),owner_id=$("#weaponOwner").value;
  if(serial_number.length<3||weapon_type.length<2||!owner_id)throw Error("Compila seriale, modello e intestatario.");
  const r=await db.from("weapon_registry").insert({serial_number,weapon_type,owner_id,registered_by:a.id,updated_by:a.id,notes:$("#weaponNotes").value.trim()});
  if(r.error)throw r.error;$("#weaponRegistryForm").reset();await load();msg("#registryStatus","Arma registrata.");
 }catch(e){msg("#registryStatus",e.message,true)}finally{b.disabled=false}
}
async function changeWeapon(id){
 const w=weapons.find(x=>x.id===id);if(!w)return;
 const owner=prompt("Nome esatto del nuovo proprietario (lascia invariato per aggiornare solo lo stato)",nameOf(w.owner_id));if(owner===null)return;
 const selected=people.find(p=>p.full_name.toLowerCase()===owner.trim().toLowerCase());if(!selected){msg("#registryStatus","Proprietario non trovato nell'anagrafe.",true);return}
 const status=prompt("Stato: REGOLARE / RUBATA / SEQUESTRATA / SMARRITA",w.status);if(status===null)return;
 const value=status.trim().toUpperCase();if(!["REGOLARE","RUBATA","SEQUESTRATA","SMARRITA"].includes(value)){msg("#registryStatus","Stato non valido.",true);return}
 if(selected.id===w.owner_id&&value===w.status){msg("#registryStatus","Nessuna variazione.");return}
 const why=prompt("Motivo della variazione (obbligatorio):");if(why===null)return;if(why.trim().length<5){msg("#registryStatus","Motivazione troppo breve.",true);return}
 try{
  const a=await auth();
  const r=await db.rpc("update_weapon_registry",{p_weapon_id:id,p_owner_id:selected.id,p_status:value,p_reason:why.trim()});
  if(r.error)throw r.error;await load();msg("#registryStatus","Arma aggiornata, storico registrato.");
 }catch(e){msg("#registryStatus",e.message,true)}
}
document.addEventListener("DOMContentLoaded",()=>{
 if(!$("#citizenRegistryForm")||!window.supabase||!window.LC_SUPABASE_URL)return;
 db=window.supabase.createClient(window.LC_SUPABASE_URL,window.LC_SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
 $("#citizenRegistryForm").addEventListener("submit",createCitizen);
 $("#weaponRegistryForm").addEventListener("submit",createWeapon);
 $("#citizenRegistrySearch").addEventListener("input",renderPeople);
 $("#weaponRegistrySearch").addEventListener("input",renderWeapons);
 $("#registryRefresh").addEventListener("click",load);
 db.auth.onAuthStateChange(()=>setTimeout(load,0));load();
});
})();