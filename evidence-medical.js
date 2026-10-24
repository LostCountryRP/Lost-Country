(()=>{"use strict";
const $=s=>document.querySelector(s),safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let db,proofs=[],medical=[];
function message(id,t){const x=$(id);if(x)x.textContent=t}
async function user(){const{data}=await db.auth.getSession();if(!data.session)throw Error("Accedi con un account autorizzato.");return data.session.user}
async function sheriff(){await user();const r=await db.rpc("current_sheriff_name");if(r.error||!r.data)throw Error("Account Sceriffo non autorizzato.");return String(r.data).trim()}
async function doctor(){const u=await user();const r=await db.from("medical_staff").select("display_name").eq("user_id",u.id).eq("active",true).maybeSingle();if(r.error||!r.data)throw Error("Account non abilitato come medico. L'amministratore deve inserirlo in medical_staff.");return r.data.display_name}
const date=d=>new Date(d).toLocaleString("it-IT");
async function loadProofs(){
 try{await sheriff();const r=await db.from("evidence_registry").select("*").order("recorded_at",{ascending:false});if(r.error)throw r.error;proofs=r.data||[];showProofs();message("#evidenceMessage","")}
 catch(e){message("#evidenceMessage",e.message)}
}
function showProofs(){
 const q=$("#evidenceSearch").value.toLowerCase();
 const rows=proofs.filter(p=>[p.reference_code,p.title,p.description,p.storage_location,p.status].join(" ").toLowerCase().includes(q));
 $("#evidenceList").innerHTML=rows.length?rows.map(p=>'<div class="case-card"><h3>'+safe(p.reference_code)+' — '+safe(p.title)+'</h3><p>'+safe(p.category)+' · '+safe(p.status)+' · '+date(p.recorded_at)+'</p><p>'+safe(p.description)+'</p><p><strong>Deposito:</strong> '+safe(p.storage_location)+' · <strong>Sceriffo:</strong> '+safe(p.recorded_by_name)+'</p><p>Verbale: '+safe(p.case_id||"Non associato")+' · Cittadino: '+safe(p.citizen_id||"Non associato")+'</p><button type="button" class="btn-secondary" data-proof="'+safe(p.id)+'">Aggiorna stato</button></div>').join(""):'<p>Nessuna prova trovata.</p>';
 $("#evidenceList").querySelectorAll("[data-proof]").forEach(b=>b.onclick=()=>changeStatus(b.dataset.proof));
}
async function addProof(e){
 e.preventDefault();const b=$("#evidenceSave");b.disabled=true;
 try{
  const u=await user(),name=await sheriff(),f=id=>$("#"+id).value.trim();
  const row={title:f("evidenceTitle"),category:f("evidenceCategory"),description:f("evidenceDescription"),storage_location:f("evidenceStorage"),recorded_by:u.id,recorded_by_name:name};
  if(f("evidenceCase"))row.case_id=f("evidenceCase");if(f("evidenceCitizen"))row.citizen_id=f("evidenceCitizen");
  const r=await db.from("evidence_registry").insert(row);if(r.error)throw r.error;
  $("#evidenceForm").reset();await loadProofs();message("#evidenceMessage","Prova registrata.");
 }catch(e){message("#evidenceMessage","Errore: "+e.message)}finally{b.disabled=false}
}
async function changeStatus(id){
 const item=proofs.find(p=>p.id===id);if(!item)return;
 const next=prompt("Nuovo stato: CUSTODIA / RESTITUITA / CONFISCATA / DISTRUTTA",item.status);if(next===null)return;
 const state=next.trim().toUpperCase();if(!["CUSTODIA","RESTITUITA","CONFISCATA","DISTRUTTA"].includes(state)){message("#evidenceMessage","Stato non valido.");return}
 const reason=prompt("Motivazione del passaggio (obbligatoria):");if(reason===null)return;
 try{await sheriff();const r=await db.rpc("change_evidence_status",{p_evidence_id:id,p_new_status:state,p_reason:reason.trim()});if(r.error)throw r.error;await loadProofs();message("#evidenceMessage","Stato aggiornato, movimento registrato.");}
 catch(e){message("#evidenceMessage","Errore: "+e.message)}
}
async function loadMedical(){
 try{await doctor();const r=await db.from("medical_records").select("*").order("visit_at",{ascending:false}).limit(100);if(r.error)throw r.error;medical=r.data||[];showMedical();message("#medicalMessage","")}
 catch(e){$("#medicalList").innerHTML="";message("#medicalMessage",e.message)}
}
function showMedical(){
 const q=$("#medicalSearch").value.toLowerCase();
 const rows=medical.filter(x=>[x.patient_name,x.physician_name,x.reason].join(" ").toLowerCase().includes(q));
 $("#medicalList").innerHTML=rows.length?rows.map(x=>'<div class="case-card"><strong>'+safe(x.patient_name)+'</strong> · '+date(x.visit_at)+'<p><strong>Medico:</strong> '+safe(x.physician_name)+'</p><p><strong>Motivo:</strong> '+safe(x.reason)+'</p><p><strong>Referto:</strong> '+safe(x.findings)+'</p><p><strong>Trattamento:</strong> '+safe(x.treatment)+'</p><p>'+safe(x.notes)+'</p></div>').join(""):'<p>Nessun referto trovato.</p>';
}
async function addMedical(e){
 e.preventDefault();const b=$("#medicalSave");b.disabled=true;
 try{const u=await user(),name=await doctor(),f=id=>$("#"+id).value.trim();
  const row={patient_name:f("medicalPatient"),reason:f("medicalReason"),findings:f("medicalFindings"),treatment:f("medicalTreatment"),notes:f("medicalNotes"),physician_id:u.id,physician_name:name};
  const r=await db.from("medical_records").insert(row);if(r.error)throw r.error;
  $("#medicalForm").reset();await loadMedical();message("#medicalMessage","Referto medico RP registrato.");
 }catch(e){message("#medicalMessage","Errore: "+e.message)}finally{b.disabled=false}
}
document.addEventListener("DOMContentLoaded",()=>{
 if(!$("#evidenceForm")||!window.supabase||!window.LC_SUPABASE_URL)return;
 db=window.supabase.createClient(window.LC_SUPABASE_URL,window.LC_SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
 $("#evidenceForm").addEventListener("submit",addProof);$("#evidenceSearch").addEventListener("input",showProofs);
 db.auth.onAuthStateChange(()=>setTimeout(loadProofs,0));loadProofs();
});
})();