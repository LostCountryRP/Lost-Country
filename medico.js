(()=>{"use strict";

const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const client=window.supabase.createClient(
  window.LC_SUPABASE_URL,
  window.LC_SUPABASE_KEY,
  {auth:{persistSession:true,autoRefreshToken:true}}
);

let records=[];
let reviewEvents=[];
let folders=[];
let activeFolderKey=null;
let currentMedic=null;
const MEDICAL_LEVELS={trainee:0,nurse:1,doctor:2,chief_physician:3,medical_director:4};
const MEDICAL_LABELS={trainee:"Tirocinante",nurse:"Infermiere",doctor:"Medico",chief_physician:"Primario",medical_director:"Direttore Sanitario"};
const level=()=>MEDICAL_LEVELS[currentMedic?.rank]??-1;
function refreshPermissionUI(){
 const rank=currentMedic?.rank,allowRecord=level()>=1;
 const badge=$("#medicRankBadge");
 if(badge)badge.textContent=rank?"Grado: "+(MEDICAL_LABELS[rank]||rank):"";
 const editor=$("#medicNewReport");
 if(editor)editor.hidden=!allowRecord;
 const newForFolder=$("#medicFolderNewReport");
 if(newForFolder)newForFolder.hidden=!allowRecord;
 const kind=$("#medicRecordType");
 if(kind){
  const clinical=kind.querySelector('option[value="clinical"]');
  if(clinical)clinical.disabled=level()<2;
  kind.value=level()<2?"nursing":"clinical";
 }
 const tip=$("#medicPermissionsHint");
 if(tip)tip.textContent=level()===0?
   "Accesso in sola consultazione. Non puoi registrare referti.":
   level()===1?"Puoi inserire note assistenziali, non referti clinici.":
   level()===2?"Puoi registrare referti clinici e note assistenziali.":
   level()===3?"Puoi anche convalidare referti e note assistenziali.":
   level()>=4?"Puoi convalidare e riaprire i referti già convalidati.":"";
}


const info=(text,type="")=>{
  const el=$("#medicNotice");
  if(!el)return;
  el.textContent=text||"";
  el.dataset.type=type;
};

const normalizePatient=name=>String(name||"")
  .trim()
  .replace(/\s+/g," ")
  .toLocaleLowerCase("it");

const dateTime=value=>value
  ? new Date(value).toLocaleString("it-IT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})
  : "—";

const dateOnly=value=>value
  ? new Date(value).toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit",year:"numeric"})
  : "—";

async function identity(){
  const sessionResult=await client.auth.getSession();
  if(!sessionResult.data.session)throw Error("Accedi con le tue credenziali mediche.");

  const user=sessionResult.data.session.user;
  const staff=await client
    .from("medical_staff")
    .select("display_name,rank")
    .eq("user_id",user.id)
    .eq("active",true)
    .maybeSingle();

  if(staff.error||!staff.data)throw Error("Questo account non è ancora autorizzato come medico.");
  return{id:user.id,name:staff.data.display_name,rank:staff.data.rank};
}

function buildFolders(){
  const map=new Map();

  records.forEach(record=>{
    const key=normalizePatient(record.patient_name);
    if(!key)return;

    if(!map.has(key)){
      map.set(key,{
        key,
        name:String(record.patient_name||"").trim(),
        records:[],
        latest:null,
        first:null
      });
    }

    const folder=map.get(key);
    folder.records.push(record);

    if(!folder.latest||new Date(record.visit_at)>new Date(folder.latest.visit_at)){
      folder.latest=record;
      folder.name=String(record.patient_name||folder.name).trim();
    }
    if(!folder.first||new Date(record.visit_at)<new Date(folder.first.visit_at)){
      folder.first=record;
    }
  });

  folders=[...map.values()].map(folder=>{
    folder.records.sort((a,b)=>new Date(b.visit_at)-new Date(a.visit_at));
    folder.searchText=folder.records.map(r=>[
      r.patient_name,r.reason,r.findings,r.treatment,r.notes,r.physician_name
    ].join(" ")).join(" ").toLocaleLowerCase("it");
    return folder;
  });
}

function drawPatientOptions(){
  const list=$("#medicPatientOptions");
  if(!list)return;
  list.innerHTML=folders
    .slice()
    .sort((a,b)=>a.name.localeCompare(b.name,"it",{sensitivity:"base"}))
    .map(folder=>'<option value="'+escapeHtml(folder.name)+'"></option>')
    .join("");
}

function drawStats(){
  $("#medicStatPatients").textContent=String(folders.length);
  $("#medicStatRecords").textContent=String(records.length);
  $("#medicStatLatest").textContent=records.length?dateOnly(records[0].visit_at):"—";
}

function folderCard(folder){
  const count=folder.records.length;
  const lastReason=folder.latest?.reason||"Nessuna visita registrata";

  return `
    <article class="medical-folder-card">
      <button type="button" class="medical-folder-open" data-folder="${escapeHtml(folder.key)}" aria-label="Apri la cartella clinica di ${escapeHtml(folder.name)}">
        <div class="medical-folder-card-head">
          <span class="medical-folder-mini-mark" aria-hidden="true"><i></i><i></i></span>
          <span class="medical-folder-badge">${count} ${count===1?"REFERTO":"REFERTI"}</span>
        </div>
        <h3>${escapeHtml(folder.name)}</h3>
        <dl>
          <div>
            <dt>Ultima visita</dt>
            <dd>${dateOnly(folder.latest?.visit_at)}</dd>
          </div>
          <div>
            <dt>Ultimo motivo</dt>
            <dd>${escapeHtml(lastReason)}</dd>
          </div>
          <div>
            <dt>Medico</dt>
            <dd>${escapeHtml(folder.latest?.physician_name||"—")}</dd>
          </div>
        </dl>
        <span class="medical-folder-cta">Apri cartella →</span>
      </button>
    </article>`;
}

function drawFolders(){
  const list=$("#medicFolderList");
  if(!list)return;

  const term=($("#medicSearch")?.value||"").trim().toLocaleLowerCase("it");
  const sort=$("#medicSort")?.value||"recent";

  let shown=folders.filter(folder=>!term||folder.searchText.includes(term));

  shown=[...shown].sort((a,b)=>{
    if(sort==="name")return a.name.localeCompare(b.name,"it",{sensitivity:"base"});
    if(sort==="records")return b.records.length-a.records.length||a.name.localeCompare(b.name,"it");
    return new Date(b.latest?.visit_at||0)-new Date(a.latest?.visit_at||0);
  });

  list.innerHTML=shown.length
    ?shown.map(folderCard).join("")
    :'<div class="medical-empty-state"><strong>Nessuna cartella trovata</strong><span>Prova a modificare i termini di ricerca.</span></div>';
}

function recordTemplate(record,index){
  const treatment=String(record.treatment||"").trim();
  const notes=String(record.notes||"").trim();
  const nursing=record.record_type==="nursing";
  const log=reviewEvents.filter(e=>e.record_id===record.id);
  const historyHtml=log.length?
    '<details class="medical-review-history"><summary>Storico convalide ('+log.length+')</summary><ol>'+
    log.map(e=>'<li>'+escapeHtml(dateTime(e.reviewed_at))+' — '+escapeHtml(e.new_status==="validated"?"Convalidato":"Riaperto")+
      ' · '+escapeHtml(e.reason)+'</li>').join("")+'</ol></details>':"";
  const status=record.review_status==="validated"?"Convalidato":record.review_status==="reopened"?"Riaperto":"Da convalidare";
  const reviewAction=level()>=4&&record.review_status==="validated"
    ?'<button class="btn-secondary btn-small" data-med-review="reopen" data-record-id="'+escapeHtml(record.id)+'" type="button">Riapri documento</button>'
    :level()>=3&&record.review_status!=="validated"
    ?'<button class="btn-primary btn-small" data-med-review="validate" data-record-id="'+escapeHtml(record.id)+'" type="button">Convalida</button>':"";

  return `
    <article class="medical-timeline-item">
      <div class="medical-timeline-dot" aria-hidden="true"></div>
      <details class="medical-record-card" ${index===0?"open":""}>
        <summary>
          <span class="medical-record-date">${dateTime(record.visit_at)}</span>
          <strong>${escapeHtml(record.reason)}</strong>
          <span class="medical-record-doctor">${nursing?"Operatore":"Medico"}: ${escapeHtml(record.physician_name||"—")}</span>
        </summary>
        <div class="medical-record-body">
          <div class="medical-review-summary"><strong>${nursing?"Nota assistenziale":"Referto clinico"}</strong> · ${escapeHtml(status)}
          ${record.review_note?'<small>Ultima decisione: '+escapeHtml(record.review_note)+'</small>':""}
          ${reviewAction}</div>
          ${historyHtml}
          <section>
            <h4>${nursing?"Nota assistenziale":"Referto clinico"}</h4>
            <p>${escapeHtml(record.findings).replaceAll("\n","<br>")}</p>
          </section>
          <section>
            <h4>Trattamento</h4>
            <p>${treatment?escapeHtml(treatment).replaceAll("\n","<br>"):"Nessun trattamento indicato."}</p>
          </section>
          ${notes?`<section class="medical-private-notes"><h4>Note riservate</h4><p>${escapeHtml(notes).replaceAll("\n","<br>")}</p></section>`:""}
        </div>
      </details>
    </article>`;
}

function openFolder(key,{scroll=true}={}){
  const folder=folders.find(f=>f.key===key);
  if(!folder)return;

  activeFolderKey=folder.key;
  $("#medicFolderName").textContent=folder.name;
  $("#medicFolderCount").textContent=`${folder.records.length} ${folder.records.length===1?"referto":"referti"}`;
  $("#medicFolderFirst").textContent="Prima visita: "+dateOnly(folder.first?.visit_at);
  $("#medicFolderLatest").textContent="Ultima visita: "+dateOnly(folder.latest?.visit_at);
  $("#medicTimeline").innerHTML=folder.records.map(recordTemplate).join("");

  $("#medicFolders").hidden=true;
  $("#medicFolderDetail").hidden=false;

  if(scroll)$("#medicFolderDetail").scrollIntoView({behavior:"smooth",block:"start"});
}

function closeFolder({scroll=true}={}){
  activeFolderKey=null;
  $("#medicFolderDetail").hidden=true;
  $("#medicFolders").hidden=false;
  if(scroll)$("#medicFolders").scrollIntoView({behavior:"smooth",block:"start"});
}

function preparePatient(name){
  const input=$("#medicPatient");
  input.value=name;
  input.readOnly=true;
  input.classList.add("is-locked");
  $("#medicClearPatient").hidden=false;
  $("#medicNewReport").scrollIntoView({behavior:"smooth",block:"start"});
  setTimeout(()=>$("#medicReason")?.focus(),350);
}

function clearPatient(){
  const input=$("#medicPatient");
  input.readOnly=false;
  input.classList.remove("is-locked");
  input.value="";
  $("#medicClearPatient").hidden=true;
  input.focus();
}

async function refresh({keepFolder=true}={}){
  try{
    currentMedic=await identity();
    $("#medicAuth").hidden=true;
    $("#medicPanel").hidden=false;
    $("#medicUser").textContent=currentMedic.name;
    refreshPermissionUI();

    const [result,historical]=await Promise.all([
      client.from("medical_records").select("*").order("visit_at",{ascending:false}).limit(1000),
      client.from("medical_review_history")
        .select("record_id,old_status,new_status,reviewed_at,reason")
        .order("reviewed_at",{ascending:false}).limit(2000)
    ]);
    if(result.error)throw result.error;
    if(historical.error)throw historical.error;
    records=result.data||[];
    reviewEvents=historical.data||[];
    buildFolders();
    drawPatientOptions();
    drawStats();
    drawFolders();
    info("");

    if(keepFolder&&activeFolderKey){
      const stillExists=folders.some(f=>f.key===activeFolderKey);
      if(stillExists)openFolder(activeFolderKey,{scroll:false});
      else closeFolder({scroll:false});
    }
  }catch(error){
    currentMedic=null;
    reviewEvents=[];
    refreshPermissionUI();
    $("#medicPanel").hidden=true;
    $("#medicAuth").hidden=false;
    info(error.message||"Impossibile aprire il registro medico.","error");
  }
}

async function save(event){
  event.preventDefault();
  const button=$("#medicSave");
  button.disabled=true;

  try{
    const medic=await identity();
    if((MEDICAL_LEVELS[medic.rank]??-1)<1)throw Error("Il tuo grado non permette di scrivere documenti.");
    const recordType=$("#medicRecordType").value;
    if(recordType==="clinical"&&(MEDICAL_LEVELS[medic.rank]??-1)<2)
      throw Error("Solo Medici, Primari e Direttori possono firmare referti clinici.");
    if(!["nursing","clinical"].includes(recordType))throw Error("Tipo di registrazione non valido.");
    const value=id=>$("#"+id).value.trim();

    const enteredPatient=value("medicPatient");
    const folderKey=normalizePatient(enteredPatient);
    const existingFolder=folders.find(folder=>folder.key===folderKey);
    const patientName=existingFolder?.name||enteredPatient;

    const result=await client.from("medical_records").insert({
      patient_name:patientName,
      reason:value("medicReason"),
      findings:value("medicFindings"),
      treatment:value("medicTreatment"),
      notes:value("medicNotes"),
      physician_id:medic.id,
      physician_name:medic.name,
      record_type:recordType
    });

    if(result.error)throw result.error;

    $("#medicForm").reset();
    $("#medicPatient").readOnly=false;
    $("#medicPatient").classList.remove("is-locked");
    $("#medicClearPatient").hidden=true;

    activeFolderKey=folderKey;
    await refresh({keepFolder:true});
    info((recordType==="nursing"?"Nota assistenziale":"Referto clinico")+" salvato nella cartella del paziente.","success");

    if(folders.some(f=>f.key===folderKey)){
      openFolder(folderKey,{scroll:true});
    }
  }catch(error){
    info(error.message||"Impossibile salvare il referto.","error");
  }finally{
    button.disabled=false;
  }
}

async function reviewRecord(id,action){
  if(!["validate","reopen"].includes(action))return;
  const allowed=action==="validate"?level()>=3:level()>=4;
  if(!allowed){info("Grado insufficiente per questa operazione.","error");return;}
  const reason=prompt(action==="validate"?"Motivazione della convalida (minimo 5 caratteri):":"Motivo della riapertura (minimo 5 caratteri):");
  if(reason===null)return;
  if(reason.trim().length<5){info("Motivazione troppo breve.","error");return;}
  if(!confirm(action==="validate"?"Confermare la convalida del documento?":"Riaprire il documento convalidato?"))return;
  try{
    const result=await client.rpc("lc_review_medical_record",{
      p_record_id:id,p_action:action,p_reason:reason.trim()
    });
    if(result.error)throw result.error;
    await refresh({keepFolder:true});
    info(action==="validate"?"Documento convalidato.":"Documento riaperto, storico aggiornato.","success");
  }catch(err){info(err.message||String(err),"error");}
}

document.addEventListener("DOMContentLoaded",()=>{
  $("#medicLogin").addEventListener("submit",async event=>{
    event.preventDefault();
    info("Accesso in corso…");
    const result=await client.auth.signInWithPassword({
      email:$("#medicEmail").value.trim(),
      password:$("#medicPassword").value
    });

    if(result.error)info(result.error.message,"error");
    else await refresh({keepFolder:false});
  });

  $("#medicLogout").addEventListener("click",async()=>{
    await client.auth.signOut();
    records=[];
    reviewEvents=[];
    folders=[];
    activeFolderKey=null;
    await refresh({keepFolder:false});
  });

  $("#medicForm").addEventListener("submit",save);
  $("#medicTimeline").addEventListener("click",event=>{
    const button=event.target.closest("[data-med-review][data-record-id]");
    if(button)reviewRecord(button.dataset.recordId,button.dataset.medReview);
  });
  $("#medicSearch").addEventListener("input",drawFolders);
  $("#medicSort").addEventListener("change",drawFolders);
  $("#medicRefresh").addEventListener("click",()=>refresh({keepFolder:true}));
  $("#medicFolderBack").addEventListener("click",()=>closeFolder({scroll:true}));
  $("#medicClearPatient").addEventListener("click",clearPatient);

  $("#medicFolderNewReport").addEventListener("click",()=>{
    const folder=folders.find(f=>f.key===activeFolderKey);
    if(folder&&level()>=1)preparePatient(folder.name);
  });

  $("#medicFolderList").addEventListener("click",event=>{
    const button=event.target.closest("[data-folder]");
    if(button)openFolder(button.dataset.folder);
  });

  client.auth.onAuthStateChange(()=>setTimeout(()=>refresh({keepFolder:true}),0));
  refresh({keepFolder:false});
});

})();