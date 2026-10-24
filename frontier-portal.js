(()=>{"use strict";
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const db=window.supabase.createClient(window.LC_SUPABASE_URL,window.LC_SUPABASE_KEY);
const cfg={
 news:{table:"frontier_news",order:"published_at",fields:["title","category","body"],render:r=>'<h3>'+esc(r.title)+'</h3><small>'+esc(r.category)+' · '+new Date(r.published_at).toLocaleDateString("it-IT")+' · '+esc(r.author_name)+'</small><p>'+esc(r.body).replaceAll("\n","<br>")+'</p>'},
 business:{table:"commercial_registry",order:"created_at",fields:["business_name","category","town","owner_name"],render:r=>'<h3>'+esc(r.business_name)+'</h3><p>'+esc(r.category)+' · '+esc(r.town)+' · '+esc(r.status)+'</p><p><strong>Titolare:</strong> '+esc(r.owner_name)+'</p><p>'+esc(r.description)+'</p>'},
 events:{table:"frontier_events",order:"starts_at",fields:["title","town","organizer","location_name"],render:r=>'<h3>'+esc(r.title)+'</h3><p><strong>'+new Date(r.starts_at).toLocaleString("it-IT")+'</strong> · '+esc(r.town)+' · '+esc(r.location_name)+'</p><p>'+esc(r.description)+'</p><small>Organizzatore: '+esc(r.organizer)+(r.is_cancelled?" · ANNULLATO":"")+'</small>'}
};
async function load(kind){
 const c=cfg[kind],e=$("#items"),status=$("#message");status.textContent="";
 let q=db.from(c.table).select("*").order(c.order,{ascending:kind!=="events"});
 if(kind==="news")q=q.eq("is_published",true);
 if(kind==="events")q=q.eq("is_cancelled",false);
 const {data,error}=await q.limit(100);if(error){status.textContent="Archivio non ancora disponibile. È necessario eseguire la migrazione SQL.";return}
 const term=($("#search").value||"").toLocaleLowerCase("it");
 const rows=(data||[]).filter(r=>c.fields.some(k=>String(r[k]||"").toLocaleLowerCase("it").includes(term)));
 e.innerHTML=rows.length?rows.map(r=>'<article class="case-card">'+c.render(r)+'</article>').join(""):'<p class="empty-state">Nessun elemento da mostrare.</p>';
}
document.addEventListener("DOMContentLoaded",()=>{const k=document.body.dataset.section;if(!cfg[k])return;$("#search").addEventListener("input",()=>load(k));load(k)});
})();