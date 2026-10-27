/* LOST COUNTRY RP — Bilanci di ufficio, valido per Sceriffi e Medici.
   Nessuna chiave privata nel browser; le scritture avvengono via RPC con controlli SQL. */
(()=>{"use strict";
const root=document.querySelector("#officeFinance[data-office]");
if(!root)return;
const office=root.dataset.office;
if(!["sheriff","medical"].includes(office))return;
const isSheriff=office==="sheriff";
const $=(selector)=>root.querySelector(selector);
const html=(value)=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=(amount)=>"$"+Number(amount||0).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
const today=()=>{const now=new Date();return now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0")};
const thisMonth=()=>today().slice(0,7);
const formatDay=v=>{if(!v)return"—";const parts=String(v).slice(0,10).split("-");return parts.length===3?parts[2]+"/"+parts[1]+"/"+parts[0]:v};
const formatDate=v=>v?new Date(v).toLocaleString("it-IT"):"—";
const incomes=isSheriff?
 ["Fondo iniziale","Fondi pubblici","Multe incassate","Donazioni","Finanziamenti","Altre entrate"]:
 ["Fondo iniziale","Fondi pubblici","Prestazioni sanitarie","Donazioni","Finanziamenti","Altre entrate"];
const expenses=isSheriff?
 ["Stipendi","Equipaggiamento","Munizioni e armi","Cavalli e trasporti","Manutenzione","Ricompense","Forniture","Altre spese"]:
 ["Stipendi","Farmaci e medicazioni","Strumentazione","Trasporto pazienti","Manutenzione","Forniture","Altre spese"];
const opts=(values)=>values.map(x=>'<option value="'+html(x)+'">'+html(x)+'</option>').join("");
root.classList.add("office-finance");
root.innerHTML=`
 <header class="of-head">
   <div><p class="of-kicker">LIBRO CONTABILE RISERVATO · DOLLARI RP ($)</p>
     <h2>Bilancio economico e spese</h2>
     <p>Entrate, uscite e disponibilità dell'${isSheriff?"Ufficio dello Sceriffo":"Ospedale e Servizio Medico"}.
     I due uffici hanno registri indipendenti.</p></div>
   <button id="ofRefresh" class="btn-secondary btn-small" type="button">Aggiorna bilancio</button>
 </header>
 <div id="ofMessage" role="status" aria-live="polite" class="of-message"></div>
 <div id="ofLocked" class="of-locked" hidden>Accedi con un account autorizzato per consultare i movimenti.</div>
 <div id="ofContent" hidden>
 <div class="of-summary">
   <article class="of-stat of-balance"><span>Saldo disponibile · complessivo</span><strong id="ofBalance">—</strong><small>Tutti i movimenti registrati</small></article>
   <article class="of-stat"><span>Entrate nel mese selezionato</span><strong id="ofIncome">—</strong></article>
   <article class="of-stat"><span>Spese nel mese selezionato</span><strong id="ofExpense">—</strong></article>
   <article class="of-stat"><span>Risultato del mese</span><strong id="ofPeriodBalance">—</strong></article>
 </div>
 <div class="of-controls">
   <div><label for="ofMonth">Periodo di bilancio</label><input type="month" id="ofMonth" value="${thisMonth()}" min="1880-01" max="2100-12"></div>
   <div><label for="ofDirectionFilter">Visualizza</label>
   <select id="ofDirectionFilter"><option value="">Tutti i movimenti</option><option value="income">Solo entrate</option><option value="expense">Solo spese</option></select></div>
   <button type="button" class="btn-secondary btn-small" id="ofExport">Esporta mese in CSV</button>
 </div>
 <section class="of-entry-card" id="ofEditor" hidden>
   <h3>Registra un movimento di cassa</h3>
   <p id="ofWriterNote">Ogni operazione viene registrata con il nome dell'operatore e non può essere cancellata.</p>
   <form id="ofForm" class="of-form">
     <div><label for="ofDirection">Tipo</label><select id="ofDirection" required>
       <option value="expense">Uscita / spesa</option><option value="income">Entrata / incasso</option></select></div>
     <div><label for="ofAmount">Importo ($ RP)</label><input id="ofAmount" type="number" inputmode="decimal" min="0.01" max="999999999.99" step="0.01" required placeholder="0,00"></div>
     <div><label for="ofCategory">Categoria</label><select id="ofCategory" required></select></div>
     <div><label for="ofDate">Data del movimento</label><input id="ofDate" type="date" required value="${today()}" max="${today()}"></div>
     <div class="of-wide"><label for="ofDescription">Causale / descrizione</label>
       <textarea id="ofDescription" required minlength="5" maxlength="1000" rows="2" placeholder="Esempio: acquisto forniture per il reparto..."></textarea></div>
     <div><label for="ofReference">Riferimento documento (opzionale)</label>
       <input id="ofReference" maxlength="80" placeholder="Ricevuta, numero mandato, ecc."></div>
     <div class="of-submit"><button id="ofSave" class="btn-primary" type="submit">Registra operazione</button></div>
   </form>
 </section>
 <div class="of-readonly" id="ofReadOnly" hidden>Il tuo grado consente la consultazione. La registrazione delle operazioni è riservata a ${isSheriff?"Deputy Senior, Vice Sceriffo e Sceriffo":"Primario e Direttore Sanitario"}.</div>
 <section class="of-ledger">
   <div class="of-ledger-head"><h3>Libro dei movimenti</h3><span id="ofCount">—</span></div>
   <div class="of-table-wrap"><table class="of-table">
     <thead><tr><th>Data</th><th>Movimento</th><th>Categoria e causale</th><th>Responsabile</th><th>Importo</th></tr></thead>
     <tbody id="ofRows"><tr><td colspan="5">Nessun movimento caricato.</td></tr></tbody>
   </table></div>
   <div class="of-pagination"><button id="ofPrev" class="btn-secondary btn-small" type="button">Precedenti</button>
    <span id="ofPage">Pagina 1</span>
    <button id="ofNext" class="btn-secondary btn-small" type="button">Successivi</button></div>
 </section>
 <p class="of-disclaimer">Registro manuale di gioco. Le multe, le prestazioni e le altre attività non generano incassi automaticamente: vanno registrati quando effettivamente riscossi. Per correggere un errore, aggiungi un movimento di segno opposto spiegandone la causa.</p>
 </div>`;
const pageSize=50;
let db=null,rank=null,writer=false,loadedCount=0,currentPage=0,loadVersion=0,authTimer=null;
const message=(txt,bad=false)=>{
 const node=$("#ofMessage");node.textContent=txt||"";
 node.classList.toggle("of-error",bad&&!!txt);
};
function range(){
 const value=$("#ofMonth").value;
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))throw Error("Seleziona un mese valido.");
 const [year,month]=value.split("-").map(Number);
 const next=month===12?(year+1)+"-01-01":year+"-"+String(month+1).padStart(2,"0")+"-01";
 return {from:value+"-01",to:next};
}
function currentWriter(role){
 return isSheriff?["senior_deputy","vice_sheriff","sheriff"].includes(role):
 ["chief_physician","medical_director"].includes(role);
}
function setCategories(){
 const list=$("#ofDirection").value==="income"?incomes:expenses;
 $("#ofCategory").innerHTML=opts(list);
}
function resetState(){
 rank=null;writer=false;loadedCount=0;currentPage=0;loadVersion++;
 $("#ofContent").hidden=true;$("#ofLocked").hidden=false;$("#ofRows").innerHTML="";
}
function drawRows(rows){
 const body=$("#ofRows");
 body.innerHTML=rows.length?rows.map(entry=>`
   <tr class="${entry.direction==="income"?"of-income":"of-expense"}">
     <td><strong>${html(formatDay(entry.occurred_on))}</strong><small>Registrato ${html(formatDate(entry.created_at))}</small></td>
     <td>${entry.direction==="income"?"Entrata":"Spesa"}</td>
     <td><strong>${html(entry.category)}</strong><span>${html(entry.description)}</span>
       ${entry.reference_code?'<small>Rif.: '+html(entry.reference_code)+'</small>':""}</td>
     <td>${html(entry.created_by_name)}</td>
     <td class="of-amount">${entry.direction==="income"?"+":"−"} ${money(entry.amount)}</td>
   </tr>`).join(""):'<tr><td colspan="5" class="of-empty">Nessun movimento nel periodo selezionato.</td></tr>';
}
async function refresh({resetPage=false}={}){
 if(!db)return;
 const seq=++loadVersion;
 if(resetPage)currentPage=0;
 try{
  const {data:sessionResult,error:sessionError}=await db.auth.getSession();
  if(sessionError)throw sessionError;
  if(!sessionResult.session?.user){
   if(seq===loadVersion){resetState();message("Accedi per consultare il bilancio.");}
   return;
  }
  const {data:rankValue,error:rankError}=await db.rpc(isSheriff?"current_sheriff_rank":"current_medical_rank");
  if(rankError)throw rankError;
  if(!rankValue)throw Error("Account non autorizzato alla contabilità di questo ufficio.");
  if(seq!==loadVersion)return;
  rank=rankValue;writer=currentWriter(rank);
  $("#ofLocked").hidden=true;$("#ofContent").hidden=false;
  $("#ofEditor").hidden=!writer;$("#ofReadOnly").hidden=writer;
  const {from,to}=range();
  const summary=db.rpc("lc_office_finance_overview",{p_office:office,p_from:from,p_to:to});
  let query=db.from("office_finance_entries")
    .select("id,office,direction,amount,category,description,reference_code,occurred_on,created_at,created_by_name",{count:"exact"})
    .eq("office",office).gte("occurred_on",from).lt("occurred_on",to);
  const direction=$("#ofDirectionFilter").value;
  if(direction)query=query.eq("direction",direction);
  query=query.order("occurred_on",{ascending:false}).order("created_at",{ascending:false})
    .range(currentPage*pageSize,currentPage*pageSize+pageSize-1);
  const [totals,items]=await Promise.all([summary,query]);
  if(seq!==loadVersion)return;
  if(totals.error)throw totals.error;
  if(items.error)throw items.error;
  const t=totals.data||{};
  const balance=Number(t.balance||0),delta=Number(t.period_balance||0);
  $("#ofBalance").textContent=money(balance);
  $("#ofBalance").classList.toggle("of-negative",balance<0);
  $("#ofIncome").textContent=money(t.period_income);
  $("#ofExpense").textContent=money(t.period_expenses);
  $("#ofPeriodBalance").textContent=(delta>=0?"+":"−")+money(Math.abs(delta));
  $("#ofPeriodBalance").classList.toggle("of-negative",delta<0);
  loadedCount=Number(items.count||0);
  drawRows(items.data||[]);
  const totalPages=Math.max(1,Math.ceil(loadedCount/pageSize));
  $("#ofCount").textContent=loadedCount+" "+(loadedCount===1?"movimento":"movimenti")+" • mese selezionato";
  $("#ofPage").textContent="Pagina "+(currentPage+1)+" di "+totalPages;
  $("#ofPrev").disabled=currentPage<=0;
  $("#ofNext").disabled=(currentPage+1)>=totalPages;
  message("");
 }catch(err){
  if(seq!==loadVersion)return;
  message(err?.message||String(err),true);
  if(String(err?.message||"").includes("non autorizzato"))resetState();
 }
}
async function submitMovement(event){
 event.preventDefault();
 if(!writer)return message("Il tuo grado non autorizza la registrazione.",true);
 const button=$("#ofSave");button.disabled=true;
 try{
  const amount=Number($("#ofAmount").value);
  if(!Number.isFinite(amount)||amount<=0||amount>999999999.99||Math.round(amount*100)/100!==amount){
   throw Error("L'importo deve essere positivo e avere al massimo due decimali.");
  }
  const day=$("#ofDate").value;
  if(!day||day>today())throw Error("Seleziona una data valida, non futura.");
  const description=$("#ofDescription").value.trim();
  if(description.length<5)throw Error("Scrivi una causale di almeno 5 caratteri.");
  const dir=$("#ofDirection").value,kind=$("#ofCategory").value;
  if(!confirm("Registrare "+(dir==="income"?"un'entrata":"una spesa")+" di "+money(amount)+"? L'operazione sarà conservata nello storico."))return;
  const {data,error}=await db.rpc("lc_office_finance_add",{
   p_office:office,p_direction:dir,p_amount:amount,
   p_category:kind,p_description:description,
   p_occurred_on:day,p_reference_code:$("#ofReference").value.trim()||null
  });
  if(error)throw error;
  if(!data)throw Error("Movimento non confermato dal database.");
  $("#ofForm").reset();$("#ofDate").value=today();setCategories();
  $("#ofMonth").value=day.slice(0,7);
  $("#ofDirectionFilter").value="";
  await refresh({resetPage:true});
  message("Movimento registrato. Il saldo e i totali sono aggiornati.");
 }catch(err){message(err?.message||String(err),true)}
 finally{button.disabled=false;}
}
function csvCell(v){
 let cell=String(v??"");
 if(/^[=+@\-\t\r]/.test(cell))cell="'"+cell;
 return '"'+cell.replaceAll('"','""')+'"';
}
async function exportPeriod(){
 const button=$("#ofExport");button.disabled=true;
 try{
  const {from,to}=range(),direction=$("#ofDirectionFilter").value;
  const rows=[];
  for(let offset=0;offset<=10000;offset+=500){
   let q=db.from("office_finance_entries")
    .select("occurred_on,direction,category,description,reference_code,created_by_name,amount")
    .eq("office",office).gte("occurred_on",from).lt("occurred_on",to)
    .order("occurred_on",{ascending:false}).range(offset,offset+499);
   if(direction)q=q.eq("direction",direction);
   const {data,error}=await q;
   if(error)throw error;
   rows.push(...(data||[]));
   if((data||[]).length<500)break;
   if(offset===10000)throw Error("Esportazione troppo grande: restringi il periodo.");
  }
  const labels=["Data","Tipo","Categoria","Causale","Riferimento","Operatore","Importo firmato ($ RP)"];
  const content="\uFEFF"+[labels,...rows.map(v=>[
    v.occurred_on,v.direction==="income"?"Entrata":"Spesa",v.category,v.description,
    v.reference_code||"",v.created_by_name,(v.direction==="income"?"":"-")+Number(v.amount).toFixed(2)
  ])].map(row=>row.map(csvCell).join(";")).join("\r\n");
  const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;
  link.download="bilancio-"+office+"-"+$("#ofMonth").value+".csv";
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
  message("Esportati "+rows.length+" movimenti del periodo.");
 }catch(err){message(err?.message||String(err),true)}
 finally{button.disabled=false;}
}
function scheduleRefresh(){
 if(authTimer!==null)clearTimeout(authTimer);
 authTimer=setTimeout(()=>{authTimer=null;refresh({resetPage:true})},130);
}
document.addEventListener("DOMContentLoaded",()=>{
 if(!window.supabase||!window.LC_SUPABASE_URL||!window.LC_SUPABASE_KEY){
  $("#ofLocked").hidden=false;message("Servizio di bilancio non configurato.",true);return;
 }
 db=window.supabase.createClient(window.LC_SUPABASE_URL,window.LC_SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
 $("#ofMonth").addEventListener("change",()=>refresh({resetPage:true}));
 $("#ofDirectionFilter").addEventListener("change",()=>refresh({resetPage:true}));
 $("#ofRefresh").addEventListener("click",()=>refresh());
 $("#ofDirection").addEventListener("change",setCategories);
 $("#ofForm").addEventListener("submit",submitMovement);
 $("#ofExport").addEventListener("click",exportPeriod);
 $("#ofPrev").addEventListener("click",()=>{currentPage=Math.max(0,currentPage-1);refresh()});
 $("#ofNext").addEventListener("click",()=>{currentPage++;refresh()});
 db.auth.onAuthStateChange((event)=>{
  if(["INITIAL_SESSION","SIGNED_IN","SIGNED_OUT","USER_UPDATED"].includes(event))scheduleRefresh();
 });
 setCategories();
 $("#ofLocked").hidden=false;
 refresh({resetPage:true});
});
})();