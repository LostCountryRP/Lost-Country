(()=>{"use strict";
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const db=window.supabase.createClient(window.LC_SUPABASE_URL,window.LC_SUPABASE_KEY);
const cfg={
 news:{table:"frontier_news",order:"published_at",fields:["title","category","body"],render:r=>'<h3>'+esc(r.title)+'</h3><small>'+esc(r.category)+' · '+new Date(r.published_at).toLocaleDateString("it-IT")+' · '+esc(r.author_name)+'</small><p>'+esc(r.body).replaceAll("\n","<br>")+'</p>'},
 business:{table:"commercial_registry",order:"created_at",fields:["business_name","category","town","owner_name"],render:r=>'<h3>'+esc(r.business_name)+'</h3><p>'+esc(r.category)+' · '+esc(r.town)+' · '+esc(r.status)+'</p><p><strong>Titolare:</strong> '+esc(r.owner_name)+'</p><p>'+esc(r.description)+'</p>'},
 events:{table:"frontier_events",order:"starts_at",fields:["title","town","organizer","location_name"],render:r=>'<h3>'+esc(r.title)+'</h3><p><strong>'+new Date(r.starts_at).toLocaleString("it-IT")+'</strong> · '+esc(r.town)+' · '+esc(r.location_name)+'</p><p>'+esc(r.description)+'</p><small>Organizzatore: '+esc(r.organizer)+(r.is_cancelled?" · ANNULLATO":"")+'</small>'}
};
const safeImage=url=>{try{const parsed=new URL(String(url||""));return parsed.protocol==="https:"?parsed.href:""}catch{return""}};
const TYPES={announcement:"Comunicazione",offer:"Offerta",event:"Evento",catalog:"Prodotto / servizio"};
function businessFeed(business,posts){
 const related=posts.filter(p=>p.business_id===business.id);
 const list=related.length?'<section class="merchant-public-feed"><h4>Novità e comunicazioni dell’attività</h4>'+
   related.map(p=>'<article class="merchant-feed-entry"><small>'+esc(TYPES[p.post_type]||"Annuncio")+
   ' · '+new Date(p.created_at).toLocaleDateString("it-IT")+'</small><h5>'+esc(p.title)+'</h5>'+
   '<p>'+esc(p.body).replaceAll("\\n","<br>")+'</p>'+
   (safeImage(p.image_url)?'<img loading="lazy" alt="Immagine dell’attività" src="'+esc(safeImage(p.image_url))+'">':"")+
   '</article>').join("")+'</section>':
   '<p class="merchant-no-posts">Nessuna comunicazione pubblicata dal titolare.</p>';
 return '<article class="case-card merchant-public-business">'+cfg.business.render(business)+list+'</article>';
}
async function loadBusiness(){
 const box=$("#items"),status=$("#message");status.textContent="";
 const [reg,feed]=await Promise.all([
   db.from("commercial_registry").select("*").order("created_at",{ascending:false}).limit(100),
   db.from("business_posts").select("business_id,post_type,title,body,image_url,created_at,expires_at")
    .eq("is_published",true).eq("moderation_status","visible").order("created_at",{ascending:false}).limit(300)
 ]);
 if(reg.error){status.textContent="Registro commerciale al momento non disponibile.";return}
 const posts=feed.error?[]:(feed.data||[]);
 if(feed.error)status.textContent="Le comunicazioni dei titolari non sono momentaneamente disponibili.";
 const q=($("#search").value||"").toLocaleLowerCase("it").trim();
 const records=(reg.data||[]).filter(r=>[r.business_name,r.category,r.town,r.owner_name,r.description,
   ...posts.filter(p=>p.business_id===r.id).flatMap(p=>[p.title,p.body])]
   .some(t=>String(t||"").toLocaleLowerCase("it").includes(q)));
 box.innerHTML=records.length?records.map(r=>businessFeed(r,posts)).join(""):
   '<p class="empty-state">Non risultano attività da mostrare.</p>';
}
async function load(kind){
 if(kind==="business")return loadBusiness();
 const c=cfg[kind],e=$("#items"),status=$("#message");status.textContent="";
 let q=db.from(c.table).select("*").order(c.order,{ascending:kind==="events"});
 if(kind==="news")q=q.eq("is_published",true);
 if(kind==="events")q=q.eq("is_cancelled",false);
 const {data,error}=await q.limit(100);if(error){status.textContent="Archivio non ancora disponibile. È necessario eseguire la migrazione SQL.";return}
 const term=($("#search").value||"").toLocaleLowerCase("it");
 const rows=(data||[]).filter(r=>c.fields.some(k=>String(r[k]||"").toLocaleLowerCase("it").includes(term)));
 e.innerHTML=rows.length?rows.map(r=>'<article class="case-card">'+c.render(r)+'</article>').join(""):'<p class="empty-state">Nessun elemento da mostrare.</p>';
}
document.addEventListener("DOMContentLoaded",()=>{const k=document.body.dataset.section;if(!cfg[k])return;$("#search").addEventListener("input",()=>load(k));load(k)});
})();