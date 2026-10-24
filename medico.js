(()=>{"use strict";
const $=s=>document.querySelector(s),escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const client=window.supabase.createClient(window.LC_SUPABASE_URL,window.LC_SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
let records=[];
const info=(t)=>{$("#medicNotice").textContent=t};
async function identity(){
 const r=await client.auth.getSession();if(!r.data.session)throw Error("Accedi con le tue credenziali mediche.");
 const u=r.data.session.user,x=await client.from("medical_staff").select("display_name").eq("user_id",u.id).eq("active",true).maybeSingle();
 if(x.error||!x.data)throw Error("Questo account non è ancora autorizzato come medico.");
 return {id:u.id,name:x.data.display_name};
}
function draw(){
 const q=$("#medicSearch").value.toLocaleLowerCase("it");
 const shown=records.filter(r=>[r.patient_name,r.reason,r.physician_name].join(" ").toLocaleLowerCase("it").includes(q));
 $("#medicList").innerHTML=shown.length?shown.map(r=>'<article class="case-card"><h3>'+escapeHtml(r.patient_name)+'</h3><p>'+new Date(r.visit_at).toLocaleString("it-IT")+' · '+escapeHtml(r.physician_name)+'</p><p><strong>Motivo:</strong> '+escapeHtml(r.reason)+'</p><p><strong>Referto:</strong> '+escapeHtml(r.findings)+'</p><p><strong>Trattamento:</strong> '+escapeHtml(r.treatment)+'</p><p>'+escapeHtml(r.notes)+'</p></article>').join(""):'<p>Nessun referto da visualizzare.</p>';
}
async function refresh(){
 try{const u=await identity();$("#medicAuth").hidden=true;$("#medicPanel").hidden=false;$("#medicUser").textContent=u.name;
 const r=await client.from("medical_records").select("*").order("visit_at",{ascending:false}).limit(200);
 if(r.error)throw r.error;records=r.data||[];draw();info("");
 }catch(e){$("#medicPanel").hidden=true;$("#medicAuth").hidden=false;info(e.message)}
}
async function save(e){e.preventDefault();const b=$("#medicSave");b.disabled=true;try{
 const u=await identity(),v=id=>$("#"+id).value.trim();
 const r=await client.from("medical_records").insert({patient_name:v("medicPatient"),reason:v("medicReason"),findings:v("medicFindings"),treatment:v("medicTreatment"),notes:v("medicNotes"),physician_id:u.id,physician_name:u.name});
 if(r.error)throw r.error;$("#medicForm").reset();await refresh();info("Referto salvato.");
 }catch(err){info(err.message)}finally{b.disabled=false}}
document.addEventListener("DOMContentLoaded",()=>{
 $("#medicLogin").addEventListener("submit",async e=>{e.preventDefault();const r=await client.auth.signInWithPassword({email:$("#medicEmail").value.trim(),password:$("#medicPassword").value});if(r.error)info(r.error.message);else await refresh()});
 $("#medicLogout").addEventListener("click",async()=>{await client.auth.signOut();await refresh()});
 $("#medicForm").addEventListener("submit",save);$("#medicSearch").addEventListener("input",draw);$("#medicRefresh").addEventListener("click",refresh);
 client.auth.onAuthStateChange(()=>setTimeout(refresh,0));refresh();
});
})();