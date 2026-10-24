(()=>{"use strict";
const $=s=>document.querySelector(s);
let db;
const msg=(text,bad=false)=>{const e=$("#portalEditorStatus");e.textContent=text;e.style.color=bad?"#a33":""};
async function publish(e){
 e.preventDefault();const b=$("#portalPublish");b.disabled=true;
 try{
 const {data}=await db.auth.getSession();if(!data.session)throw Error("Accesso Sceriffo richiesto.");
 const x=await db.rpc("current_sheriff_name");if(x.error||!x.data)throw Error("Autorizzazione mancante.");
 const mode=$("#portalType").value,table={news:"frontier_news",business:"commercial_registry",events:"frontier_events"}[mode];
 const val=id=>$("#"+id).value.trim();
 let row;
 if(mode==="news")row={title:val("portalTitle"),body:val("portalBody"),category:val("portalCategory")||"Cronaca",author_name:x.data,created_by:data.session.user.id};
 else if(mode==="business")row={business_name:val("portalTitle"),category:val("portalCategory"),town:val("portalTown"),owner_name:val("portalOwner"),description:val("portalBody"),created_by:data.session.user.id};
 else {if(!val("portalStart")||Number.isNaN(Date.parse(val("portalStart"))))throw Error("Data evento non valida.");row={title:val("portalTitle"),description:val("portalBody"),town:val("portalTown"),location_name:val("portalLocation"),organizer:val("portalOwner"),starts_at:new Date(val("portalStart")).toISOString(),created_by:data.session.user.id};}
 if(!row[mode==="business"?"business_name":"title"]||!val("portalBody"))throw Error("Compila titolo e descrizione.");
 if(mode==="news"&&row.body.length<20)throw Error("Articolo troppo breve (minimo 20 caratteri).");
 if(mode==="events"&&(!val("portalStart")||Number.isNaN(Date.parse(val("portalStart")))))throw Error("Data evento non valida.");
 const {error}=await db.from(table).insert(row);if(error)throw error;
 $("#portalEditorForm").reset();setMode();msg("Pubblicazione completata.");
 }catch(err){msg("Impossibile pubblicare: "+err.message,true)}finally{b.disabled=false}
}
function setMode(){const v=$("#portalType").value;$("#portalCategoryWrap").hidden=v==="events";$("#portalTownWrap").hidden=v==="news";$("#portalOwnerWrap").hidden=v==="news";$("#portalLocationWrap").hidden=v!=="events";$("#portalStartWrap").hidden=v!=="events";$("#portalTitleLabel").textContent=v==="business"?"Nome attività":"Titolo";$("#portalBodyLabel").textContent=v==="news"?"Testo dell'articolo":"Descrizione";}
document.addEventListener("DOMContentLoaded",()=>{if(!$("#portalEditorForm"))return;db=window.supabase.createClient(window.LC_SUPABASE_URL,window.LC_SUPABASE_KEY);$("#portalType").addEventListener("change",setMode);$("#portalEditorForm").addEventListener("submit",publish);setMode()});
})();