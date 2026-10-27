(()=>{"use strict";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const db=window.supabase.createClient(window.LC_SUPABASE_URL,window.LC_SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
let allowed=false,requests=[],businesses=[],posts=[],busy=false,version=0;
const msg=(value,error=false)=>{$("merchantAdminMessage").textContent=value;$("merchantAdminMessage").dataset.error=String(error)};
const date=v=>v?new Date(v).toLocaleString("it-IT"):"—";
const safeImage=url=>{try{const u=new URL(String(url||""));return u.protocol==="https:"?u.href:""}catch{return""}};
const business=id=>businesses.find(x=>x.id===id);
async function check(){
 const tick=++version,auth=await db.auth.getUser();
 if(tick!==version)return;
 if(!auth.data?.user){allowed=false;$("merchantAdminGate").hidden=false;$("merchantAdminWorkspace").hidden=true;return}
 const [portal,legacy]=await Promise.all([db.rpc("lc_portal_can_manage",{p_section:"business"}),db.rpc("is_sheriff_admin")]);
 if(tick!==version)return;
 allowed=portal.data===true||legacy.data===true;
 $("merchantAdminGate").hidden=allowed;$("merchantAdminWorkspace").hidden=!allowed;
 if(!allowed)return msg("Questo account non dispone dei permessi per gestire le attività commerciali.",true);
 $("merchantAdminIdentity").textContent=auth.data.user.email||"Amministratore";
 await load();
}
async function load(){
 if(!allowed)return;
 const tick=++version;
 const [b,r,p]=await Promise.all([
  db.from("commercial_registry").select("id,business_name,town,status").order("business_name"),
  db.from("business_owner_requests").select("*").order("created_at",{ascending:false}).limit(200),
  db.from("business_posts").select("*").order("created_at",{ascending:false}).limit(200)
 ]);
 if(tick!==version)return;
 for(const item of [b,r,p])if(item.error)throw item.error;
 businesses=b.data||[];requests=r.data||[];posts=p.data||[];
 draw();
}
function draw(){
 $("merchantPendingCount").textContent=requests.filter(x=>x.status==="pending").length+" da esaminare";
 $("merchantAdminRequests").innerHTML=requests.length?requests.map(x=>{
  let choices="";
  if(x.status==="pending"){
   choices='<label for="map'+esc(x.id)+'">Collega a scheda esistente o crea nuova attività</label>'+
   '<select id="map'+esc(x.id)+'">'+
   '<option value="">Crea nuova attività nel registro</option>'+
   businesses.map(b=>'<option value="'+esc(b.id)+'"'+(x.business_id===b.id?' selected':'')+'>'+esc(b.business_name)+' · '+esc(b.town)+'</option>').join("")+
   '</select>';
  }
  const buttons=x.status==="pending"
   ?'<button type="button" class="btn-primary" data-decision="approve" data-id="'+esc(x.id)+'">Approva</button>'+
    '<button type="button" class="btn-secondary" data-decision="reject" data-id="'+esc(x.id)+'">Rifiuta</button>'
   :x.status==="approved"?'<button type="button" class="btn-secondary" data-decision="revoke" data-id="'+esc(x.id)+'">Revoca</button>':"";
  return '<article class="merchant-publication"><small>'+esc(date(x.created_at))+' · '+esc(x.status)+'</small>'+
   '<h3>'+esc(x.business_name)+'</h3><p>'+esc(x.category)+' · '+esc(x.town)+'</p>'+
   '<p><strong>Proprietario RP:</strong> '+esc(x.owner_name)+'</p><p>'+esc(x.description)+'</p>'+
   (x.review_reason?'<p>Esito: '+esc(x.review_reason)+'</p>':"")+
   choices+'<div class="merchant-actions">'+buttons+'</div></article>';
 }).join(""):'<p>Nessuna richiesta in archivio.</p>';
 $("merchantAdminPosts").innerHTML=posts.length?posts.map(p=>{
  const hidden=p.moderation_status==="hidden";
  return '<article class="merchant-publication"><small>'+esc(business(p.business_id)?.business_name||"Attività")+
    ' · '+esc(date(p.created_at))+'</small><h3>'+esc(p.title)+'</h3><p>'+esc(p.body).replaceAll("\\n","<br>")+'</p>'+
    (safeImage(p.image_url)?'<img loading="lazy" src="'+esc(safeImage(p.image_url))+'" alt="Immagine dell’annuncio">':"")+
    '<small>'+esc(hidden?"Nascosto":p.is_published?"Pubblicato":"Bozza")+'</small>'+
    '<div class="merchant-actions"><button type="button" class="btn-secondary" data-post="'+esc(p.id)+'" data-mode="'+
    (hidden?"restore":"hide")+'">'+(hidden?"Ripristina":"Nascondi")+'</button></div></article>';
 }).join(""):'<p>Nessun annuncio presente.</p>';
}
async function decide(id,decision){
 const req=requests.find(x=>x.id===id);if(!req)return;
 const reason=prompt("Motivazione "+(decision==="approve"?"approvazione":decision==="reject"?"rifiuto":"revoca")+" (minimo 5 caratteri):");
 if(reason===null)return;
 if(reason.trim().length<5)throw Error("Motivazione troppo breve.");
 const chosen=decision==="approve"?$("map"+id)?.value||null:null;
 if(!confirm("Confermi la decisione per "+req.business_name+"?"))return;
 const {error}=await db.rpc("lc_business_owner_decide",{
  p_request_id:id,p_action:decision,p_reason:reason.trim(),p_existing_business_id:chosen
 });
 if(error)throw error;
 await load();msg("Decisione registrata. I permessi del titolare sono aggiornati.");
}
async function moderate(id,mode){
 const reason=prompt("Motivazione moderazione (minimo 5 caratteri):");
 if(reason===null)return;
 if(reason.trim().length<5)throw Error("Motivazione troppo breve.");
 if(!confirm("Confermi la modifica della visibilità dell'annuncio?"))return;
 const {error}=await db.rpc("lc_business_post_moderate",{
  p_post_id:id,p_action:mode,p_reason:reason.trim()
 });
 if(error)throw error;
 await load();msg("Moderazione eseguita e registrata.");
}
const handle=fn=>async e=>{try{await fn(e)}catch(err){msg(err.message||String(err),true)}};
document.addEventListener("DOMContentLoaded",()=>{
 $("merchantAdminLogin").addEventListener("submit",handle(async e=>{
  e.preventDefault();const {error}=await db.auth.signInWithPassword({
    email:$("merchantAdminEmail").value.trim(),password:$("merchantAdminPass").value
  });
  if(error)throw error;$("merchantAdminPass").value="";await check();
 }));
 $("merchantAdminLogout").addEventListener("click",handle(async()=>{await db.auth.signOut();await check();msg("Disconnesso.")}));
 $("merchantAdminRefresh").addEventListener("click",handle(async()=>{await load();msg("Elenco aggiornato.")}));
 $("merchantAdminRequests").addEventListener("click",handle(async e=>{
  const b=e.target.closest("[data-decision]");if(!b||busy)return;
  busy=true;b.disabled=true;
  try{await decide(b.dataset.id,b.dataset.decision)}
  finally{busy=false;b.disabled=false}
 }));
 $("merchantAdminPosts").addEventListener("click",handle(async e=>{
  const b=e.target.closest("[data-post]");if(!b||busy)return;
  busy=true;b.disabled=true;
  try{await moderate(b.dataset.post,b.dataset.mode)}
  finally{busy=false;b.disabled=false}
 }));
 db.auth.onAuthStateChange(event=>{
  if(["INITIAL_SESSION","SIGNED_IN","SIGNED_OUT","USER_UPDATED"].includes(event))
   setTimeout(()=>check().catch(e=>msg(e.message,true)),0);
 });
 check().catch(e=>msg(e.message,true));
});
})();