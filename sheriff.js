// LOST COUNTRY RP — versione con nome sceriffo da Supabase (2026-10-22)
(()=>{"use strict";
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const state={db:null,session:null,citizens:[],cases:[],rows:[],selectedOffenses:[],closures:[],photoUrls:{},officerName:null,isAdmin:false};
const configured=()=>window.LC_SUPABASE_URL&&window.LC_SUPABASE_KEY&&!window.LC_SUPABASE_URL.includes("INSERISCI")&&!window.LC_SUPABASE_KEY.includes("INSERISCI");
const money=n=>"$"+Number(n||0).toLocaleString("it-IT",{maximumFractionDigits:0});
const fmtDate=v=>v?new Date(v).toLocaleString("it-IT"):"—";
function bountyStatus(a){const n=Number(a||0);if(n<200)return{label:"Cittadino Libero",cls:"status-free"};if(n<350)return{label:"🔴 RICERCATO: VIVO",cls:"status-wanted"};if(n<500)return{label:"🔥 FEDERALE: VIVO",cls:"status-federal"};if(n<=1000)return{label:"☠️ FEDERALE: MORTO",cls:"status-dead"};return{label:"👑 NEMICO PUBBLICO №1",cls:"status-enemy"}}
function notice(m,t=""){const b=$("#notice");b.textContent=m||"";b.className="notice"+(t?" "+t:"");b.classList.toggle("hidden",!m)}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function showAuth(ok){
 $("#loginPanel").classList.toggle("hidden",ok);
 $("#appPanel").classList.toggle("hidden",!ok);
 const field=$("#officerName");
 if(field){field.readOnly=true;field.setAttribute("aria-readonly","true");field.title="Nome assegnato automaticamente dall’account sceriffo";field.autocomplete="off";field.value=ok?(state.officerName||"Caricamento nome sceriffo..."):"";}
 const save=$("#saveCaseBtn");if(save)save.disabled=!ok||!state.officerName;
 const adminBtn=$("#adminBtn");if(adminBtn){adminBtn.classList.toggle("hidden",!(ok&&state.isAdmin));adminBtn.hidden=!(ok&&state.isAdmin);}
 if(ok&&state.session?.user)$("#sessionUser").textContent=state.session.user.email||"Utente autenticato";
}
async function loadOfficerName(){
 state.officerName=null;state.isAdmin=false;showAuth(!!state.session);
 if(!state.session)return false;
 const {data,error}=await state.db.rpc("current_sheriff_name");
 if(error||!data||!String(data).trim()){
  showAuth(false);
  notice("Impossibile identificare lo sceriffo autorizzato: "+(error?.message||"nome non configurato")+". Verifica la funzione SQL current_sheriff_name.","error");
  return false;
 }
 state.officerName=String(data).trim();
 const adminCheck=await state.db.rpc("is_sheriff_admin");
 state.isAdmin=!adminCheck.error&&adminCheck.data===true;
 showAuth(true);
 return true;
}
function bind(){
 $("#loginForm").addEventListener("submit",login);$("#logoutBtn").addEventListener("click",()=>state.db.auth.signOut());
 const adminBtn=$("#adminBtn");if(adminBtn)adminBtn.addEventListener("click",()=>{if(state.session&&state.isAdmin)window.location.href="admin-sceriffi.html";});
 $("#addOffenseBtn").addEventListener("click",addOffense);$("#saveCaseBtn").addEventListener("click",saveCase);$("#refreshBtn").addEventListener("click",loadAll);
 $("#fedinaCitizen").addEventListener("change",renderFedinaFromSearch);$("#fedinaSearchBtn").addEventListener("click",renderFedinaFromSearch);$("#wantedSearch").addEventListener("input",renderWanted);

 $$(".tab-btn").forEach(b=>b.addEventListener("click",()=>{$$(".tab-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");$$(".tab-panel").forEach(p=>p.classList.add("hidden"));$("#"+b.dataset.tab).classList.remove("hidden");if(b.dataset.tab==="wantedTab")renderWanted();if(b.dataset.tab==="fedinaTab")renderFedinaFromSearch()}));
}
async function init(){
 populateOffenseSelect();bind();
 if(!configured()){$("#configWarning").classList.remove("hidden");$("#loginPanel").classList.add("hidden");return}
 state.db=window.supabase.createClient(window.LC_SUPABASE_URL,window.LC_SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
 const{data}=await state.db.auth.getSession();state.session=data.session;showAuth(!!state.session);
 state.db.auth.onAuthStateChange((_e,s)=>{
  const previousId=state.session?.user?.id;
  state.session=s;
  if(!s){state.officerName=null;state.isAdmin=false;showAuth(false);return;}
  if(previousId!==s.user?.id||!state.officerName){
   setTimeout(async()=>{if(await loadOfficerName())await loadAll()},0);
  }
 });
 if(state.session&&await loadOfficerName())await loadAll();
}
async function login(e){e.preventDefault();notice("");const{error}=await state.db.auth.signInWithPassword({email:$("#loginEmail").value.trim(),password:$("#loginPassword").value});if(error)notice("Accesso non riuscito: "+error.message,"error")}
function populateOffenseSelect(){const s=$("#offenseSelect");s.innerHTML='<option value="">Seleziona un reato...</option>';const g={};(window.LC_OFFENSES||[]).forEach(o=>(g[o.category]??=[]).push(o));Object.entries(g).forEach(([cat,items])=>{const og=document.createElement("optgroup");og.label=cat;items.forEach(o=>{const op=document.createElement("option");op.value=o.code;op.textContent=`${o.code} — ${o.name} • ${money(o.fine)} • ${o.jail_minutes} min${o.capital_punishment?" • PENA CAPITALE":""}`;og.appendChild(op)});s.appendChild(og)})}
function addOffense(){const o=(window.LC_OFFENSES||[]).find(x=>x.code===$("#offenseSelect").value);if(!o)return;state.selectedOffenses.push({...o,tempId:crypto.randomUUID()});renderSelected()}
function renderSelected(){const tb=$("#selectedOffensesBody");tb.innerHTML="";let f=0,j=0,c=false;state.selectedOffenses.forEach(o=>{f+=+o.fine;j+=+o.jail_minutes;c||=!!o.capital_punishment;const tr=document.createElement("tr");tr.innerHTML=`<td><strong>${esc(o.code)}</strong><br>${esc(o.name)}</td><td class="money">${money(o.fine)}</td><td>${o.jail_minutes} min${o.capital_punishment?'<span class="capital-flag">PENA CAPITALE</span>':""}</td><td class="center"><button class="btn-danger btn-small" data-r="${o.tempId}">Rimuovi</button></td>`;tb.appendChild(tr)});tb.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{state.selectedOffenses=state.selectedOffenses.filter(o=>o.tempId!==b.dataset.r);renderSelected()});$("#totalFine").textContent=money(f);$("#totalJail").textContent=j+" min";$("#capitalWarning").classList.toggle("hidden",!c);$("#selectedEmpty").classList.toggle("hidden",state.selectedOffenses.length>0)}
async function loadAll(){notice("Aggiornamento archivio...");const[a,b,c,d]=await Promise.all([state.db.from("citizens").select("*").order("full_name"),state.db.from("cases").select("*").order("occurred_at",{ascending:false}),state.db.from("case_offenses").select("*").order("created_at",{ascending:false}),state.db.from("wanted_closures").select("*").order("closed_at",{ascending:false})]);const e=a.error||b.error||c.error||d.error;if(e){notice("Errore database: "+e.message,"error");return}state.citizens=a.data||[];state.cases=b.data||[];state.rows=c.data||[];state.closures=d.data||[];await loadPhotoUrls();populateCitizens();renderWanted();renderFedinaFromSearch();notice("")}
function populateCitizens(){const dl=$("#citizensList");dl.innerHTML="";state.citizens.forEach(c=>{const o=document.createElement("option");o.value=c.full_name;o.label=c.registry_code?`${c.full_name} (${c.registry_code})`:c.full_name;dl.appendChild(o)});const s=$("#fedinaCitizen"),cur=s.value;s.innerHTML='<option value="">Seleziona un cittadino...</option>';state.citizens.forEach(c=>{const o=document.createElement("option");o.value=c.id;o.textContent=c.registry_code?`${c.full_name} — ${c.registry_code}`:c.full_name;s.appendChild(o)});if([...s.options].some(o=>o.value===cur))s.value=cur}
async function getCitizen(){const name=$("#citizenName").value.trim();if(!name)throw Error("Inserisci il nome del cittadino.");const ex=state.citizens.find(c=>c.full_name.toLocaleLowerCase("it")===name.toLocaleLowerCase("it"));if(ex)return ex;const{data,error}=await state.db.from("citizens").insert({full_name:name,registry_code:$("#registryCode").value.trim()||null,alias:$("#citizenAlias").value.trim()||null}).select().single();if(error)throw error;return data}
async function saveCase(){try{notice("");if(!state.selectedOffenses.length)throw Error("Aggiungi almeno un reato.");const officer=state.officerName;if(!state.session||!officer)throw Error("Identità dello sceriffo non verificata. Effettua nuovamente l’accesso.");const citizen=await getCitizen();const when=$("#occurredAt").value?new Date($("#occurredAt").value).toISOString():new Date().toISOString();const{data:cas,error}=await state.db.from("cases").insert({citizen_id:citizen.id,officer_name:officer,occurred_at:when,notes:$("#caseNotes").value.trim()||null}).select().single();if(error)throw error;const rows=state.selectedOffenses.map(o=>({case_id:cas.id,offense_code:o.code,offense_name:o.name,category:o.category,description:o.description,fine:o.fine,jail_minutes:o.jail_minutes,capital_punishment:o.capital_punishment,is_paid:false}));const r=await state.db.from("case_offenses").insert(rows);if(r.error)throw r.error;const img=$("#casePhoto")?.files?.[0];if(img){try{await uploadCasePhoto(cas.id,citizen.id,img)}catch(photoError){await loadAll();notice("Verbale salvato, ma fotografia NON caricata: "+photoError.message,"error");return}}state.selectedOffenses=[];renderSelected();["citizenName","registryCode","citizenAlias","caseNotes"].forEach(id=>$("#"+id).value="");$("#offenseSelect").value="";if($("#casePhoto"))$("#casePhoto").value="";await loadAll();notice("Verbale registrato correttamente.","success")}catch(e){notice(e.message||String(e),"error")}}

async function uploadCasePhoto(caseId,citizenId,file){
 const accepted={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
 if(!accepted[file.type])throw Error("Formato non valido: usa JPG, PNG o WebP.");
 if(file.size>5*1024*1024)throw Error("Dimensione massima della fotografia: 5 MB.");
 const path=`${citizenId}/${caseId}.${accepted[file.type]}`;
 const {error}=await state.db.storage.from("wanted-photos").upload(path,file,{contentType:file.type,upsert:false});
 if(error)throw error;
 const up=await state.db.from("cases").update({photo_path:path}).eq("id",caseId);
 if(up.error)throw Error("Foto caricata, ma associazione al verbale non riuscita: "+up.error.message);
}
async function loadPhotoUrls(){
 state.photoUrls={};const paths=[...new Set(state.cases.map(c=>c.photo_path).filter(Boolean))];
 await Promise.all(paths.map(async path=>{const {data,error}=await state.db.storage.from("wanted-photos").createSignedUrl(path,3600);if(!error&&data?.signedUrl)state.photoUrls[path]=data.signedUrl;}));
}
function photoForCitizen(id){return citizenCases(id).filter(c=>c.photo_path).sort((a,b)=>new Date(b.occurred_at)-new Date(a.occurred_at))[0]?.photo_path||null}
function photoHtml(path,cls="wanted-photo") {const url=state.photoUrls[path];return url?`<img class="${cls}" alt="Foto segnaletica allegata al verbale" src="${esc(url)}" loading="lazy">`:""}
function lastClosure(id){return state.closures.find(x=>x.citizen_id===id)||null}
function activeBounty(id){
 const last=lastClosure(id);
 const relevant=last?citizenCases(id).filter(c=>new Date(c.created_at)>new Date(last.closed_at)):citizenCases(id);
 const caseIds=new Set(relevant.map(c=>c.id));
 return state.rows.filter(r=>caseIds.has(r.case_id)&&!r.is_paid).reduce((a,r)=>a+Number(r.fine||0),0);
}
function isWantedActive(id){return activeBounty(id)>=200}

async function closeWanted(id){
 const c=state.citizens.find(x=>x.id===id);if(!c)return;
 const reason=prompt(`Motivo chiusura ricerca per ${c.full_name}:\n1 = Pena scontata\n2 = Multe pagate\n3 = Taglia riscossa\n4 = Provvedimento amministrativo`);
 const reasons={"1":"pena_scontata","2":"multe_pagate","3":"taglia_riscossa","4":"provvedimento"};
 if(reason===null)return;
 if(!reasons[reason]){notice("Seleziona un motivo da 1 a 4.","error");return}
 const notes=prompt("Annotazioni obbligatorie: chi ha effettuato l'arresto/pagamento/riscossione? Numero pratica?");
 if(notes===null)return;
 if(!notes.trim()){notice("Inserisci una motivazione verificabile prima di chiudere.","error");return}
 if(!confirm(`Confermi la CHIUSURA della ricerca per ${c.full_name}? La fedina penale e le eventuali multe NON saranno cancellate.`))return;
 const {error}=await state.db.from("wanted_closures").insert({citizen_id:id,reason:reasons[reason],notes:notes.trim(),closed_by:state.session.user.id});
 if(error){notice("Chiusura non riuscita: "+error.message,"error");return}
 await loadAll();notice(`Ricerca chiusa per ${c.full_name}. La fedina e lo storico sono conservati.`,"success");
}

const caseRows=id=>state.rows.filter(r=>r.case_id===id),citizenCases=id=>state.cases.filter(c=>c.citizen_id===id);
function stats(id){const cases=citizenCases(id),ids=new Set(cases.map(c=>c.id)),rows=state.rows.filter(r=>ids.has(r.case_id));return{cases,rows,pendingFine:rows.filter(r=>!r.is_paid).reduce((s,r)=>s+Number(r.fine||0),0),totalFine:rows.reduce((s,r)=>s+Number(r.fine||0),0),totalJail:rows.reduce((s,r)=>s+Number(r.jail_minutes||0),0),capital:rows.some(r=>r.capital_punishment)}}
function renderWanted(){
 const b=$("#wantedGrid"),q=($("#wantedSearch")?.value||"").trim().toLocaleLowerCase("it");b.innerHTML="";
 const rec=state.citizens.map(c=>({citizen:c,...stats(c.id)}))
 .filter(x=>isWantedActive(x.citizen.id))
 .filter(x=>!q||x.citizen.full_name.toLocaleLowerCase("it").includes(q))
 .sort((a,b)=>activeBounty(b.citizen.id)-activeBounty(a.citizen.id));
 if(!rec.length){b.innerHTML='<div class="empty-state">Nessun ricercato attivo.</div>';return}
 rec.forEach(x=>{const s=bountyStatus(activeBounty(x.citizen.id)),d=document.createElement("div"),photo=photoForCitizen(x.citizen.id);d.className="wanted-card";
 d.innerHTML=`<div class="wanted-heading">WANTED</div>${photo?photoHtml(photo):'<div class="wanted-photo placeholder">FOTO NON DISPONIBILE</div>'}<h3>${esc(x.citizen.full_name)}</h3><span class="wanted-status ${s.cls}">${s.label}</span><p><strong>Taglia attiva:</strong> ${money(activeBounty(x.citizen.id))}</p><p><strong>Verbali:</strong> ${x.cases.length}</p><button class="btn-secondary btn-small" data-f="${x.citizen.id}">Apri fedina</button> <button class="btn-danger btn-small" data-close="${x.citizen.id}">Chiudi ricerca</button>`;b.appendChild(d)});
 b.querySelectorAll("[data-f]").forEach(x=>x.onclick=()=>openFedina(x.dataset.f));
 b.querySelectorAll("[data-close]").forEach(x=>x.onclick=()=>closeWanted(x.dataset.close));
}
function openFedina(id){$("#fedinaCitizen").value=id;$$(".tab-btn").forEach(b=>b.classList.toggle("active",b.dataset.tab==="fedinaTab"));$$(".tab-panel").forEach(p=>p.classList.toggle("hidden",p.id!=="fedinaTab"));renderFedina(id);window.scrollTo({top:document.querySelector(".tabs").offsetTop-20,behavior:"smooth"})}
function renderFedinaFromSearch(){renderFedina($("#fedinaCitizen").value)}
function renderFedina(id){const b=$("#fedinaResults");b.innerHTML="";if(!id){b.innerHTML='<div class="empty-state">Seleziona un cittadino per visualizzare la fedina.</div>';return}const c=state.citizens.find(x=>x.id===id);if(!c)return;const st=stats(id),bs=isWantedActive(id)?bountyStatus(activeBounty(id)):{label:"Nessuna ricerca attiva",cls:"status-free"},sum=document.createElement("div");sum.className="app-card";sum.innerHTML=`${photoForCitizen(id)?photoHtml(photoForCitizen(id),"fedina-photo"):""}<h3>${esc(c.full_name)}</h3><p><span class="wanted-status ${bs.cls}">${bs.label}</span></p><div class="totals"><div class="total-box">Pendenti<strong>${money(st.pendingFine)}</strong></div><div class="total-box">Totale storico<strong>${money(st.totalFine)}</strong></div><div class="total-box">Prigione<strong>${st.totalJail} min</strong></div></div>`;b.appendChild(sum);
 if(state.isAdmin){
   const adminControls=document.createElement("div");
   adminControls.className="case-card";
   adminControls.innerHTML='<strong>Amministrazione archivio</strong><p>Operazione irreversibile: cancella cittadino, verbali, reati, multe e storico delle ricerche. Le fotografie associate saranno eliminate dallo Storage.</p><button type="button" class="btn-danger btn-small" id="deleteCitizenRecordBtn">Elimina definitivamente questa fedina</button>';
   b.appendChild(adminControls);
   adminControls.querySelector("#deleteCitizenRecordBtn").addEventListener("click",()=>deleteCitizenRecord(id));
 }
 const history=state.closures.filter(x=>x.citizen_id===id);
 if(history.length){const h=document.createElement("div");h.className="case-card";h.innerHTML=`<strong>Storico chiusure ricerche</strong>${history.map(x=>`<p>${fmtDate(x.closed_at)} — ${esc(x.reason.replaceAll("_"," "))}: ${esc(x.notes||"")}</p>`).join("")}`;b.appendChild(h)}
 st.cases.forEach(ca=>{const d=document.createElement("div");d.className="case-card";d.innerHTML=`<div class="case-head"><strong>${fmtDate(ca.occurred_at)}</strong><span>Sceriffo: ${esc(ca.officer_name)}</span></div>${ca.notes?`<p>${esc(ca.notes)}</p>`:""}${ca.photo_path?photoHtml(ca.photo_path,"case-photo"):""}${caseRows(ca.id).map(r=>`<div class="offense-row ${r.is_paid?"paid":""}"><div class="offense-meta"><strong>${esc(r.offense_code)} — ${esc(r.offense_name)}</strong><br>${money(r.fine)} • ${r.jail_minutes} min${r.capital_punishment?'<span class="capital-flag"> • PENA CAPITALE</span>':""} • <strong>${r.is_paid?"PAGATO":"PENDENTE"}</strong></div><button class="${r.is_paid?"btn-secondary":"btn-success"} btn-small" data-t="${r.id}" data-paid="${r.is_paid?1:0}">${r.is_paid?"Rendi pendente":"Segna pagato"}</button></div>`).join("")}`;b.appendChild(d)});b.querySelectorAll("[data-t]").forEach(x=>x.onclick=()=>togglePaid(x.dataset.t,x.dataset.paid==="1"))}
async function deleteCitizenRecord(id){
 if(!state.session||!state.isAdmin){notice("Operazione riservata all'amministratore.","error");return}
 const citizen=state.citizens.find(x=>x.id===id);if(!citizen)return;
 const st=stats(id);
 const first=confirm(`ELIMINAZIONE DEFINITIVA\n\nCittadino: ${citizen.full_name}\nVerbali: ${st.cases.length}\nReati: ${st.rows.length}\nMulte storiche: ${money(st.totalFine)}\n\nSaranno cancellati anche chiusure WANTED e foto. Vuoi continuare?`);
 if(!first)return;
 const typed=prompt(`SECONDA CONFERMA\nScrivi esattamente il nome del cittadino per autorizzare l'eliminazione:\n${citizen.full_name}`);
 if(typed===null)return;
 if(typed.trim()!==citizen.full_name){notice("Nome non corrispondente: eliminazione annullata.","error");return}
 const btn=$("#deleteCitizenRecordBtn");if(btn)btn.disabled=true;
 try{
  const {data,error}=await state.db.rpc("admin_delete_citizen",{p_citizen_id:id,p_confirm_name:typed.trim()});
  if(error)throw error;
  const paths=Array.isArray(data?.photo_paths)?data.photo_paths:[];
  let photoError=null;
  if(paths.length){
   const removed=await state.db.storage.from("wanted-photos").remove(paths);
   if(removed.error)photoError=removed.error.message;
  }
  $("#fedinaCitizen").value="";
  await loadAll();
  if(photoError){notice(`Fedina eliminata dal database, ma ${paths.length} fotografie potrebbero rimanere nello Storage. Percorsi: ${paths.join(", ")}. Errore: ${photoError}`,"error")}
  else notice(`Fedina di ${citizen.full_name} eliminata. ${paths.length} fotografie da Storage gestite; operazione registrata.`,"success");
 }catch(e){if(btn)btn.disabled=false;notice("Eliminazione NON completata: "+(e.message||String(e)),"error")}
}
async function togglePaid(id,paid){const payload=paid?{is_paid:false,paid_at:null,paid_by:null}:{is_paid:true,paid_at:new Date().toISOString(),paid_by:state.session.user.id};const{error}=await state.db.from("case_offenses").update(payload).eq("id",id);if(error){notice("Errore aggiornamento: "+error.message,"error");return}await loadAll()}
async function payAll(id){const st=stats(id),ids=st.rows.filter(r=>!r.is_paid&&Number(r.fine)>0).map(r=>r.id);if(!ids.length||!confirm(`Segnare come pagate tutte le multe pendenti (${money(st.pendingFine)})?`))return;const{error}=await state.db.from("case_offenses").update({is_paid:true,paid_at:new Date().toISOString(),paid_by:state.session.user.id}).in("id",ids);if(error){notice("Errore pagamento: "+error.message,"error");return}await loadAll();notice("Multe segnate come pagate.","success")}
document.addEventListener("DOMContentLoaded",()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());$("#occurredAt").value=d.toISOString().slice(0,16);renderSelected();init()});
})();
