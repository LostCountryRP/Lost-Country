(()=>{"use strict";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const db=window.supabase.createClient(window.LC_SUPABASE_URL,window.LC_SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const labels={announcement:"Comunicazione",offer:"Offerta",event:"Evento",catalog:"Prodotto / servizio"};
let user=null,requests=[],businesses=[],posts=[],busy=false,sequence=0;
const tell=(message,error=false)=>{$("ownerMessage").textContent=message;$("ownerMessage").dataset.error=String(error)};
const date=v=>v?new Date(v).toLocaleString("it-IT"):"—";
const business=id=>businesses.find(b=>b.id===id);
const approved=()=>requests.filter(x=>x.status==="approved"&&business(x.business_id)?.status==="ATTIVA");
const imageUrl=v=>{try{const u=new URL(v);return u.protocol==="https:"?u.href:""}catch{return""}};
async function load(){
 const seq=++sequence;
 const [b,r,p]=await Promise.all([
  db.from("commercial_registry").select("id,business_name,category,town,owner_name,description,status").order("business_name"),
  db.from("business_owner_requests").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
  db.from("business_posts").select("*").eq("author_id",user.id).order("created_at",{ascending:false}).limit(150)
 ]);
 if(seq!==sequence)return;
 for(const x of [b,r,p])if(x.error)throw x.error;
 businesses=b.data||[];requests=r.data||[];posts=p.data||[];
 $("ownerBusinessChoice").innerHTML='<option value="">Una nuova attività da registrare</option>'+businesses.filter(x=>x.status!=="CHIUSA")
  .map(x=>'<option value="'+esc(x.id)+'">'+esc(x.business_name)+' · '+esc(x.town)+'</option>').join("");
 const states={pending:"In attesa",approved:"Autorizzata",rejected:"Respinta",revoked:"Revocata"};
 $("ownerRequests").innerHTML=requests.length?requests.map(x=>'<article class="merchant-request"><strong>'+
 esc(business(x.business_id)?.business_name||x.business_name)+'</strong><span class="merchant-status" data-status="'+esc(x.status)+'">'+
 esc(states[x.status])+'</span><small>'+esc(x.town)+' · '+date(x.created_at)+'</small>'+
 (x.review_reason?'<p>Motivo: '+esc(x.review_reason)+'</p>':"")+'</article>').join(""):'<p>Non hai ancora richieste.</p>';
 $("ownerApplyPanel").hidden=requests.some(x=>x.status==="pending");
 const permitted=new Map(approved().map(x=>[x.business_id,business(x.business_id)]));
 $("ownerEditorLocked").hidden=permitted.size>0;
 $("ownerEditorActive").hidden=permitted.size===0;
 $("ownerPostBusiness").innerHTML=[...permitted].map(([id,b])=>'<option value="'+esc(id)+'">'+esc(b.business_name)+'</option>').join("");
 $("ownerPostList").innerHTML=posts.length?posts.map(p=>{
  const hidden=p.moderation_status==="hidden",url=imageUrl(p.image_url),status=hidden?"Nascosto da moderatore":!p.is_published?"Bozza":"Pubblicato";
  return '<article class="merchant-publication"><small>'+esc(business(p.business_id)?.business_name||"Attività")+' · '+
   esc(labels[p.post_type]||p.post_type)+'</small><h3>'+esc(p.title)+'</h3><p>'+esc(p.body).replaceAll("\n","<br>")+'</p>'+
   (url?'<img loading="lazy" src="'+esc(url)+'" alt="Immagine dell’annuncio">':"")+
   '<small>'+esc(status)+' · '+date(p.updated_at||p.created_at)+'</small><div class="merchant-actions">'+
   '<button type="button" class="btn-secondary" data-edit="'+esc(p.id)+'"'+(hidden?' disabled':'')+'>Modifica</button>'+
   '<button type="button" class="btn-secondary" data-toggle="'+esc(p.id)+'"'+(hidden?' disabled':'')+'>'+
   (p.is_published?"Metti in bozza":"Pubblica")+'</button></div></article>';
 }).join(""):'<p>Non hai ancora pubblicazioni.</p>';
}
async function refresh(){
 const seq=++sequence,auth=await db.auth.getUser();
 if(seq!==sequence)return;
 user=auth.data?.user||null;
 $("ownerAuthGuest").hidden=!!user;
 $("ownerAuthConnected").hidden=!user;
 $("ownerWorkspace").hidden=!user;
 if(!user){requests=[];posts=[];return}
 $("ownerIdentity").textContent=user.email||"Account";
 await load();
}
async function login(e){
 e.preventDefault();
 const {error}=await db.auth.signInWithPassword({email:$("ownerLoginEmail").value.trim(),password:$("ownerLoginPassword").value});
 if(error)throw error;
 $("ownerLoginPassword").value="";await refresh();tell("Accesso effettuato.");
}
async function signup(e){
 e.preventDefault();const password=$("ownerSignupPassword").value;
 if(password!==$("ownerSignupConfirm").value)throw Error("Le password non coincidono.");
 const {data,error}=await db.auth.signUp({email:$("ownerSignupEmail").value.trim(),password,
  options:{emailRedirectTo:new URL("portale-commercianti.html",location.href).href}});
 if(error)throw error;
 $("ownerSignup").reset();
 tell(data.session?"Account creato. Puoi richiedere la gestione dell'attività.":
  "Controlla la tua email e conferma l'account prima di accedere.");
 await refresh();
}
function chooseBusiness(){
 const existing=business($("ownerBusinessChoice").value);
 const fields={ownerBusinessName:"business_name",ownerBusinessCategory:"category",ownerBusinessTown:"town",ownerBusinessDescription:"description"};
 for(const [id,key] of Object.entries(fields)){
  $(id).value=existing?.[key]||"";$(id).readOnly=!!existing;
 }
 if(existing)$("ownerRpName").value=existing.owner_name||"";
}
async function apply(e){
 e.preventDefault();if(!user||busy)return;
 busy=true;$("ownerApplySubmit").disabled=true;
 try{
  const val=id=>$(id).value.trim();
  const {error}=await db.from("business_owner_requests").insert({
   user_id:user.id,business_id:val("ownerBusinessChoice")||null,
   business_name:val("ownerBusinessName"),category:val("ownerBusinessCategory"),
   town:val("ownerBusinessTown"),owner_name:val("ownerRpName"),
   description:val("ownerBusinessDescription")
  });
  if(error)throw error;
  $("ownerApply").reset();await load();
  tell("Richiesta inviata. Per pubblicare dovrai attendere l'approvazione dell'Amministrazione.");
 }finally{busy=false;$("ownerApplySubmit").disabled=false}
}
function resetPost(){
 $("ownerPostForm").reset();$("ownerPostId").value="";$("ownerPostBusiness").disabled=false;
 $("ownerPostPublished").checked=true;$("ownerPostCancel").hidden=true;
 $("ownerPostSubmit").textContent="Pubblica annuncio";
}
function edit(id){
 const p=posts.find(x=>x.id===id);
 if(!p||p.moderation_status==="hidden"||!approved().some(x=>x.business_id===p.business_id))return;
 const map={ownerPostBusiness:"business_id",ownerPostType:"post_type",ownerPostTitle:"title",
 ownerPostBody:"body",ownerPostImage:"image_url"};
 for(const [id,key] of Object.entries(map))$(id).value=p[key]||"";
 $("ownerPostId").value=p.id;$("ownerPostBusiness").disabled=true;
 $("ownerPostExpiry").value=p.expires_at?new Date(new Date(p.expires_at).getTime()-new Date(p.expires_at).getTimezoneOffset()*60000).toISOString().slice(0,16):"";
 $("ownerPostPublished").checked=p.is_published;
 $("ownerPostSubmit").textContent="Salva modifiche";$("ownerPostCancel").hidden=false;
 $("owner-editor").scrollIntoView({behavior:"smooth"});
}
async function save(e){
 e.preventDefault();if(!user||busy)return;
 const id=$("ownerPostId").value,business_id=$("ownerPostBusiness").value,img=$("ownerPostImage").value.trim();
 if(!approved().some(x=>x.business_id===business_id))throw Error("Attività non autorizzata.");
 if(img&&!imageUrl(img))throw Error("Usa un link immagine HTTPS.");
 const expires=$("ownerPostExpiry").value;
 const data={post_type:$("ownerPostType").value,title:$("ownerPostTitle").value.trim(),
  body:$("ownerPostBody").value.trim(),image_url:img||null,
  expires_at:expires?new Date(expires).toISOString():null,
  is_published:$("ownerPostPublished").checked};
 busy=true;$("ownerPostSubmit").disabled=true;
 try{
  const imageFile=$("ownerPostImageFile").files?.[0];
  if(imageFile){
   const types={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
   if(!types[imageFile.type])throw Error("Formato immagine non supportato. Usa JPG, PNG o WebP.");
   if(imageFile.size>5*1024*1024)throw Error("Immagine troppo grande. Limite: 5 MB.");
   tell("Caricamento dell'immagine in corso...");
   const objectPath=business_id+"/"+user.id+"/"+crypto.randomUUID()+"."+types[imageFile.type];
   const uploaded=await db.storage.from("merchant-media").upload(objectPath,imageFile,{
    cacheControl:"3600",upsert:false,contentType:imageFile.type
   });
   if(uploaded.error)throw uploaded.error;
   data.image_url=db.storage.from("merchant-media").getPublicUrl(objectPath).data.publicUrl;
  }
  const result=id
   ?await db.from("business_posts").update({...data,updated_at:new Date().toISOString()}).eq("id",id).eq("author_id",user.id).select("id")
   :await db.from("business_posts").insert({...data,business_id,author_id:user.id}).select("id");
  if(result.error)throw result.error;
  if(!result.data?.length)throw Error("La modifica non è stata autorizzata.");
  resetPost();await load();
  tell(data.is_published?"Annuncio pubblicato nel Registro Commerciale.":"Bozza salvata.");
 }finally{busy=false;$("ownerPostSubmit").disabled=false}
}
async function toggle(id){
 const p=posts.find(x=>x.id===id);if(!p||p.moderation_status==="hidden")return;
 if(!approved().some(x=>x.business_id===p.business_id))throw Error("Attività non autorizzata.");
 const {data,error}=await db.from("business_posts").update({is_published:!p.is_published,updated_at:new Date().toISOString()})
 .eq("id",id).eq("author_id",user.id).select("id");
 if(error)throw error;if(!data?.length)throw Error("Aggiornamento non consentito.");
 await load();tell(p.is_published?"Annuncio salvato come bozza.":"Annuncio pubblicato.");
}
const run=fn=>async event=>{try{await fn(event)}catch(err){tell(err.message||String(err),true)}};
document.addEventListener("DOMContentLoaded",()=>{
 $("ownerLogin").addEventListener("submit",run(login));
 $("ownerSignup").addEventListener("submit",run(signup));
 $("ownerApply").addEventListener("submit",run(apply));
 $("ownerPostForm").addEventListener("submit",run(save));
 $("ownerBusinessChoice").addEventListener("change",chooseBusiness);
 $("ownerPostCancel").addEventListener("click",resetPost);
 $("ownerReload").addEventListener("click",run(async()=>{await load();tell("Dati aggiornati.")}));
 $("ownerSignout").addEventListener("click",run(async()=>{await db.auth.signOut();resetPost();await refresh();tell("Disconnessione effettuata.")}));
 $("ownerPostList").addEventListener("click",run(async e=>{
  const btn=e.target.closest("button");if(!btn)return;
  if(btn.dataset.edit)edit(btn.dataset.edit);else if(btn.dataset.toggle)await toggle(btn.dataset.toggle);
 }));
 db.auth.onAuthStateChange(event=>{
  if(["SIGNED_IN","SIGNED_OUT","INITIAL_SESSION","USER_UPDATED"].includes(event))
   setTimeout(()=>refresh().catch(e=>tell(e.message,true)),0);
 });
 refresh().catch(e=>tell(e.message,true));
});
})();