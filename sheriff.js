// LOST COUNTRY RP — versione con nome sceriffo da Supabase (2026-10-22)
(()=>{"use strict";
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const state={db:null,session:null,citizens:[],cases:[],rows:[],selectedOffenses:[],closures:[],photoUrls:{},enforcement:[],enforcementAvailable:true,officerName:null,isAdmin:false};
const configured=()=>window.LC_SUPABASE_URL&&window.LC_SUPABASE_KEY&&!window.LC_SUPABASE_URL.includes("INSERISCI")&&!window.LC_SUPABASE_KEY.includes("INSERISCI");
const money=n=>"$"+Number(n||0).toLocaleString("it-IT",{maximumFractionDigits:0});
const fmtDate=v=>v?new Date(v).toLocaleString("it-IT"):"—";
function bountyStatus(a){const n=Number(a||0);if(n<600)return{label:"🔴 RICERCATO",cls:"status-wanted"};if(n<3000)return{label:"🔥 RICERCATO FEDERALE",cls:"status-federal"};return{label:"👑 NEMICO PUBBLICO №1",cls:"status-enemy"}}
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
 $("#offenseSearch").addEventListener("input",populateOffenseSelect);
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
function populateOffenseSelect(){
 const s=$("#offenseSelect"),search=$("#offenseSearch");
 const normalize=t=>String(t??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("it");
 const q=normalize(search?.value.trim()||"");
 const previous=s.value;
 s.innerHTML='<option value="">'+(q?'Seleziona un reato tra i risultati...':'Seleziona un reato...')+'</option>';
 const groups={};let matches=0;
 (window.LC_OFFENSES||[]).forEach(o=>{
  if(q&&!normalize(`${o.code} art. ${o.article} articolo ${o.article} ${o.name} ${o.category} ${o.description||""}`).includes(q))return;
  (groups[o.category]??=[]).push(o);matches++;
 });
 Object.entries(groups).forEach(([cat,items])=>{
  const og=document.createElement("optgroup");og.label=cat;
  items.forEach(o=>{const op=document.createElement("option");op.value=o.code;op.textContent=`Art. ${o.article} — ${o.name} [${o.code}] • ${money(o.fine)} • ${o.jail_minutes} min${o.capital_punishment?" • PENA CAPITALE":""}`;og.appendChild(op)});
  s.appendChild(og);
 });
 if(previous&&[...s.options].some(o=>o.value===previous))s.value=previous;
 const count=$("#offenseSearchCount");if(count)count.textContent=q?(matches?`${matches} reati trovati`:'Nessun reato trovato. Prova con un altro termine.'):'Cerca per nome, codice o categoria.';
}

function sanctionAdjustment(){
 const discount=Number($("#fineDiscount").value),increase=Number($("#fineIncrease").value),extra=Number($("#jailIncrease").value);
 if(!Number.isInteger(discount)||discount<0||discount>50||!Number.isInteger(increase)||increase<0||increase>50||!Number.isInteger(extra)||extra<0||extra>10)throw Error("Variazioni non valide: massimo 50% e 10 minuti.");
 if(discount&&increase)throw Error("Applica uno sconto O una maggiorazione sulla multa, non entrambi.");
 const reason=$("#sanctionReason").value.trim();
 if((discount||increase||extra)&&reason.length<10)throw Error("Inserisci una motivazione di almeno 10 caratteri.");
 return {discount,increase,extra,reason};
}
function adjustedRows(){
 const adj=sanctionAdjustment();
 const baseFine=state.selectedOffenses.reduce((n,o)=>n+Number(o.fine),0);
 const baseJail=state.selectedOffenses.reduce((n,o)=>n+Number(o.jail_minutes),0);
 const finalFine=Math.max(0,Math.round(baseFine*(100-adj.discount+adj.increase)/100));
 // L'ultima voce con importo positivo assorbe l'eventuale resto di arrotondamento.
 let apportioned=0;const positive=state.selectedOffenses.map((o,i)=>Number(o.fine)>0?i:-1).filter(i=>i>=0);const last=positive.at(-1);
 const rows=state.selectedOffenses.map((o,i)=>{
   const value=i===last?finalFine-apportioned:Math.round(Number(o.fine)*(100-adj.discount+adj.increase)/100);
   if(i!==last)apportioned+=value;
   return {...o,fine:Number(o.fine)>0?value:0,jail_minutes:Number(o.jail_minutes)};
 });
 // La detenzione è aggiunta una sola volta al verbale, non a ciascun reato.
 if(adj.extra){const target=rows.find(o=>!o.capital_punishment);if(!target)throw Error("La detenzione discrezionale non è applicabile a verbali con sole pene capitali.");target.jail_minutes+=adj.extra;}
 return {adj,rows,baseFine,baseJail,finalFine,finalJail:baseJail+adj.extra};
}
document.addEventListener("input",e=>{if(["fineDiscount","fineIncrease","jailIncrease","sanctionReason"].includes(e.target.id))updateDiscretionaryPreview();});
function updateDiscretionaryPreview(){
 try{
  const a=adjustedRows();$("#totalFine").textContent=money(a.finalFine);$("#totalJail").textContent=a.finalJail+" min";
  const tier=bountyStatus(a.finalFine),preview=$("#bountyPreview");if(preview){preview.textContent=money(a.finalFine)+" — "+tier.label;preview.className="wanted-status "+tier.cls;}
  $("#adjustmentError").textContent="";
 }catch(e){$("#adjustmentError").textContent=e.message;$("#totalFine").textContent="—";$("#totalJail").textContent="—";}
}

function addOffense(){const o=(window.LC_OFFENSES||[]).find(x=>x.code===$("#offenseSelect").value);if(!o)return;state.selectedOffenses.push({...o,tempId:crypto.randomUUID()});renderSelected();$("#offenseSearch").value="";populateOffenseSelect()}
function renderSelected(){const tb=$("#selectedOffensesBody");tb.innerHTML="";let f=0,j=0,c=false;state.selectedOffenses.forEach(o=>{f+=+o.fine;j+=+o.jail_minutes;c||=!!o.capital_punishment;const tr=document.createElement("tr");tr.innerHTML=`<td><strong>${esc(o.code)}</strong><br>${esc(o.name)}</td><td class="money">${money(o.fine)}</td><td>${o.jail_minutes} min${o.capital_punishment?'<span class="capital-flag">PENA CAPITALE</span>':""}</td><td class="center"><button class="btn-danger btn-small" data-r="${o.tempId}">Rimuovi</button></td>`;tb.appendChild(tr)});tb.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{state.selectedOffenses=state.selectedOffenses.filter(o=>o.tempId!==b.dataset.r);renderSelected()});updateDiscretionaryPreview();$("#capitalWarning").classList.toggle("hidden",!c);$("#selectedEmpty").classList.toggle("hidden",state.selectedOffenses.length>0)}
async function loadAll(){notice("Aggiornamento archivio...");const[a,b,c,d,k]=await Promise.all([state.db.from("citizens").select("*").order("full_name"),state.db.from("cases").select("*").order("occurred_at",{ascending:false}),state.db.from("case_offenses").select("*").order("created_at",{ascending:false}),state.db.from("wanted_closures").select("*").order("closed_at",{ascending:false}),state.db.from("case_enforcement").select("*")]);const km=k.error?.message||"";const missingEnforcement=!!k.error&&/case_enforcement/i.test(km)&&(/schema cache/i.test(km)||/could not find/i.test(km));const e=a.error||b.error||c.error||d.error||(missingEnforcement?null:k.error);if(e){notice("Errore database: "+e.message,"error");return}state.citizens=a.data||[];state.cases=b.data||[];state.rows=c.data||[];state.closures=d.data||[];state.enforcementAvailable=!missingEnforcement;state.enforcement=missingEnforcement?[]:(k.data||[]);await loadPhotoUrls();populateCitizens();renderWanted();renderFedinaFromSearch();notice(missingEnforcement?"Archivio caricato. Configurazione incompleta: manca la tabella case_enforcement in Supabase. Esegui sql/case-enforcement.sql per attivare pena scontata e irreperibilità.":"",missingEnforcement?"error":"")}
function populateCitizens(){const dl=$("#citizensList");dl.innerHTML="";state.citizens.forEach(c=>{const o=document.createElement("option");o.value=c.full_name;o.label=c.registry_code?`${c.full_name} (${c.registry_code})`:c.full_name;dl.appendChild(o)});const s=$("#fedinaCitizen"),cur=s.value;s.innerHTML='<option value="">Seleziona un cittadino...</option>';state.citizens.forEach(c=>{const o=document.createElement("option");o.value=c.id;o.textContent=c.registry_code?`${c.full_name} — ${c.registry_code}`:c.full_name;s.appendChild(o)});if([...s.options].some(o=>o.value===cur))s.value=cur}
async function getCitizen(){const name=$("#citizenName").value.trim();if(!name)throw Error("Inserisci il nome del cittadino.");const ex=state.citizens.find(c=>c.full_name.toLocaleLowerCase("it")===name.toLocaleLowerCase("it"));if(ex)return ex;const{data,error}=await state.db.from("citizens").insert({full_name:name,registry_code:$("#registryCode").value.trim()||null,alias:$("#citizenAlias").value.trim()||null}).select().single();if(error)throw error;return data}
async function saveCase(){try{notice("");if(!state.selectedOffenses.length)throw Error("Aggiungi almeno un reato.");const officer=state.officerName;if(!state.session||!officer)throw Error("Identità dello sceriffo non verificata. Effettua nuovamente l’accesso.");const {adj,rows:finalRows,baseFine,baseJail,finalFine,finalJail}=adjustedRows();
 const adjustmentActive=!!(adj.discount||adj.increase||adj.extra);
 const audit=adjustmentActive?"[ADEGUAMENTO SANZIONI — Sceriffo: "+officer+" | Multa base: "+money(baseFine)+" | Sconto: "+adj.discount+"% | Maggiorazione: "+adj.increase+"% | Multa finale: "+money(finalFine)+" | Detenzione base: "+baseJail+" min | Aumento: "+adj.extra+" min | Detenzione finale: "+finalJail+" min | Motivazione: "+adj.reason+"]":"";
 const citizen=await getCitizen();const when=$("#occurredAt").value?new Date($("#occurredAt").value).toISOString():new Date().toISOString();const{data:cas,error}=await state.db.from("cases").insert({citizen_id:citizen.id,officer_name:officer,occurred_at:when,notes:[$("#caseNotes").value.trim(),audit].filter(Boolean).join("\n\n")||null}).select().single();if(error)throw error;const rows=finalRows.map(o=>({case_id:cas.id,offense_code:o.code,offense_name:o.name,category:o.category,description:o.description,fine:o.fine,jail_minutes:o.jail_minutes,capital_punishment:o.capital_punishment,is_paid:false}));const r=await state.db.from("case_offenses").insert(rows);if(r.error)throw r.error;const img=$("#casePhoto")?.files?.[0];if(img){try{await uploadCasePhoto(cas.id,citizen.id,img)}catch(photoError){await loadAll();notice("Verbale salvato, ma fotografia NON caricata: "+photoError.message,"error");return}}state.selectedOffenses=[];["fineDiscount","fineIncrease","jailIncrease"].forEach(id=>$("#"+id).value="0");$("#sanctionReason").value="";renderSelected();["citizenName","registryCode","citizenAlias","caseNotes"].forEach(id=>$("#"+id).value="");$("#offenseSelect").value="";if($("#casePhoto"))$("#casePhoto").value="";await loadAll();notice("Verbale registrato correttamente.","success")}catch(e){notice(e.message||String(e),"error")}}

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
function enforcementFor(id){return state.enforcement.find(x=>x.case_id===id)||null}
function pendingCase(id){
 const rr=state.rows.filter(r=>r.case_id===id),e=enforcementFor(id);
 return {fine:rr.filter(r=>!r.is_paid).reduce((n,r)=>n+Number(r.fine||0),0),
 jailPending:rr.some(r=>Number(r.jail_minutes)>0)&&!e?.jail_served,
 evading:!!e?.evading};
}
function activeBounty(id){return citizenCases(id).filter(c=>pendingCase(c.id).evading).reduce((n,c)=>n+pendingCase(c.id).fine,0)}
function isWantedActive(id){return citizenCases(id).some(c=>{const p=pendingCase(c.id);return p.evading&&(p.fine>0||p.jailPending)})}
async function updateCaseEnforcement(caseId,kind){
 if(!state.enforcementAvailable){notice("Funzione non disponibile: crea prima la tabella case_enforcement in Supabase eseguendo sql/case-enforcement.sql.","error");return}
 const e=enforcementFor(caseId)||{},p=pendingCase(caseId);
 const value={case_id:caseId,jail_served:!!e.jail_served,jail_served_at:e.jail_served_at||null,evading:!!e.evading,evading_reason:e.evading_reason||null,updated_at:new Date().toISOString(),updated_by:state.session.user.id};
 if(kind==="served"){value.jail_served=!value.jail_served;value.jail_served_at=value.jail_served?new Date().toISOString():null}
 if(kind==="evading"){
  if(!value.evading&&p.fine===0&&!p.jailPending){notice("Nessuna pena pendente.","error");return}
  if(!value.evading){const reason=prompt("Motivo della fuga, del rifiuto o della mancata presentazione:");if(reason===null)return;if(reason.trim().length<5){notice("Motivazione insufficiente.","error");return}value.evading_reason=reason.trim()}
  value.evading=!value.evading;
 }
 const {error}=await state.db.from("case_enforcement").upsert(value,{onConflict:"case_id"});
 if(error){notice("Salvataggio stato pena non riuscito: "+error.message,"error");return}
 await loadAll();notice("Stato pena aggiornato.","success");
}
async function closeWanted(id){
 if(!state.enforcementAvailable){notice("Funzione non disponibile: crea prima la tabella case_enforcement in Supabase eseguendo sql/case-enforcement.sql.","error");return}
 const c=state.citizens.find(x=>x.id===id);if(!c)return;
 const reason=prompt("Motivo della chiusura della ricerca per "+c.full_name+":");
 if(reason===null)return;
 if(reason.trim().length<5){notice("Motivazione obbligatoria.","error");return}
 const selected=citizenCases(id).filter(x=>pendingCase(x.id).evading);
 if(!selected.length){notice("Nessuna segnalazione attiva.","error");return}
 if(!confirm("Chiudere la ricerca per "+c.full_name+"? Le multe e le detenzioni pendenti restano registrate."))return;
 for(const ca of selected){
  const old=enforcementFor(ca.id);
  const {error}=await state.db.from("case_enforcement").update({evading:false,updated_by:state.session.user.id,updated_at:new Date().toISOString()}).eq("case_id",ca.id);
  if(error){notice("Chiusura non completata: "+error.message,"error");await loadAll();return}
 }
 const {error}=await state.db.from("wanted_closures").insert({citizen_id:id,reason:"provvedimento",notes:reason.trim(),closed_by:state.session.user.id});
 await loadAll();notice(error?"Segnalazioni chiuse, ma errore nello storico: "+error.message:"Ricerca chiusa; precedenti e pene pendenti conservati.",error?"error":"success");
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
function renderFedina(id){const b=$("#fedinaResults");b.innerHTML="";if(!id){b.innerHTML='<div class="empty-state">Seleziona un cittadino per visualizzare la fedina.</div>';return}const c=state.citizens.find(x=>x.id===id);if(!c)return;const st=stats(id),bs=isWantedActive(id)?bountyStatus(activeBounty(id)):{label:"Nessuna ricerca attiva",cls:"status-free"},sum=document.createElement("div");sum.className="app-card";sum.innerHTML=`${photoForCitizen(id)?photoHtml(photoForCitizen(id),"fedina-photo"):""}<h3>${esc(c.full_name)}</h3><p><span class="wanted-status ${bs.cls}">${bs.label}</span></p><p><strong>Taglia attiva:</strong> ${money(activeBounty(id))}</p><div class="totals"><div class="total-box">Pendenti<strong>${money(st.pendingFine)}</strong></div><div class="total-box">Totale storico<strong>${money(st.totalFine)}</strong></div><div class="total-box">Prigione<strong>${st.totalJail} min</strong></div></div>`;b.appendChild(sum);
 if(state.isAdmin){
   const adminControls=document.createElement("div");
   adminControls.className="case-card";
   adminControls.innerHTML='<strong>Amministrazione archivio</strong><p>Operazione irreversibile: cancella cittadino, verbali, reati, multe e storico delle ricerche. Le fotografie associate saranno eliminate dallo Storage.</p><button type="button" class="btn-danger btn-small" id="deleteCitizenRecordBtn">Elimina definitivamente questa fedina</button>';
   b.appendChild(adminControls);
   adminControls.querySelector("#deleteCitizenRecordBtn").addEventListener("click",()=>deleteCitizenRecord(id));
 }
 const history=state.closures.filter(x=>x.citizen_id===id);
 if(history.length){const h=document.createElement("div");h.className="case-card";h.innerHTML=`<strong>Storico chiusure ricerche</strong>${history.map(x=>`<p>${fmtDate(x.closed_at)} — ${esc(x.reason.replaceAll("_"," "))}: ${esc(x.notes||"")}</p>`).join("")}`;b.appendChild(h)}
 st.cases.forEach(ca=>{const d=document.createElement("div");d.className="case-card";d.innerHTML=`<div class="case-head"><strong>${fmtDate(ca.occurred_at)}</strong><span>Sceriffo: ${esc(ca.officer_name)}</span></div>${ca.notes?`<p>${esc(ca.notes)}</p>`:""}${ca.photo_path?photoHtml(ca.photo_path,"case-photo"):""}<p>Detenzione: ${pendingCase(ca.id).jailPending?"Da scontare":"Scontata / non prevista"} — Ricerca: ${pendingCase(ca.id).evading?"Sottrazione segnalata":"Non attiva"}</p><button class="btn-secondary btn-small" data-served="${ca.id}">${enforcementFor(ca.id)?.jail_served?"Annulla detenzione scontata":"Conferma detenzione scontata"}</button> <button class="btn-secondary btn-small" data-evading="${ca.id}">${pendingCase(ca.id).evading?"Annulla segnalazione":"Segnala fuga / rifiuto"}</button>${caseRows(ca.id).map(r=>`<div class="offense-row ${r.is_paid?"paid":""}"><div class="offense-meta"><strong>${esc(r.offense_code)} — ${esc(r.offense_name)}</strong><br>${money(r.fine)} • ${r.jail_minutes} min${r.capital_punishment?'<span class="capital-flag"> • PENA CAPITALE</span>':""} • <strong>${r.is_paid?"PAGATO":"PENDENTE"}</strong></div><button class="${r.is_paid?"btn-secondary":"btn-success"} btn-small" data-t="${r.id}" data-paid="${r.is_paid?1:0}">${r.is_paid?"Rendi pendente":"Segna pagato"}</button></div>`).join("")}`;b.appendChild(d)});b.querySelectorAll("[data-t]").forEach(x=>x.onclick=()=>togglePaid(x.dataset.t,x.dataset.paid==="1"));b.querySelectorAll("[data-served]").forEach(x=>x.onclick=()=>updateCaseEnforcement(x.dataset.served,"served"));b.querySelectorAll("[data-evading]").forEach(x=>x.onclick=()=>updateCaseEnforcement(x.dataset.evading,"evading"))}
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
