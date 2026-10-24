(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const db = window.supabase.createClient(window.LC_SUPABASE_URL, window.LC_SUPABASE_KEY, {
    auth:{persistSession:true,autoRefreshToken:true}
  });
  const config = {
    news:{
      table:"frontier_news",label:"Articoli del giornale",singular:"articolo",
      order:"published_at",name:"title",
      state:row=>row.is_published?{label:"Pubblicato",tone:"live"}:{label:"Non pubblicato",tone:"off"},
      action:row=>({label:row.is_published?"Nascondi articolo":"Pubblica articolo",
        updates:{is_published:!row.is_published}}),
      fields:[
        {name:"title",label:"Titolo",kind:"text",required:true,max:160,min:5},
        {name:"category",label:"Rubrica",kind:"text",required:true,max:100},
        {name:"body",label:"Testo articolo",kind:"textarea",required:true,max:12000,min:20,full:true}
      ]
    },
    business:{
      table:"commercial_registry",label:"Attività commerciali",singular:"attività",
      order:"created_at",name:"business_name",
      state:row=>row.status==="ATTIVA"?{label:"Attiva",tone:"live"}:{label:row.status==="SOSPESA"?"Sospesa":"Chiusa",tone:"off"},
      action:row=>({label:row.status==="ATTIVA"?"Sospendi attività":"Riattiva attività",
        updates:{status:row.status==="ATTIVA"?"SOSPESA":"ATTIVA"}}),
      fields:[
        {name:"business_name",label:"Nome attività",kind:"text",required:true,max:150,min:3},
        {name:"category",label:"Categoria",kind:"text",required:true,max:100},
        {name:"town",label:"Città",kind:"text",required:true,max:100},
        {name:"owner_name",label:"Proprietario",kind:"text",required:true,max:150},
        {name:"description",label:"Descrizione",kind:"textarea",required:true,max:12000,full:true},
        {name:"status",label:"Stato",kind:"select",options:["ATTIVA","SOSPESA","CHIUSA"]}
      ]
    },
    events:{
      table:"frontier_events",label:"Eventi",singular:"evento",
      order:"starts_at",name:"title",
      state:row=>row.is_cancelled?{label:"Annullato",tone:"off"}:{label:"In programma",tone:"live"},
      action:row=>({label:row.is_cancelled?"Ripristina evento":"Annulla evento",
        updates:{is_cancelled:!row.is_cancelled}}),
      fields:[
        {name:"title",label:"Nome evento",kind:"text",required:true,max:160,min:3},
        {name:"town",label:"Città",kind:"text",required:true,max:100},
        {name:"location_name",label:"Luogo",kind:"text",required:true,max:150},
        {name:"organizer",label:"Organizzatore",kind:"text",required:true,max:150},
        {name:"starts_at",label:"Inizio",kind:"datetime",required:true},
        {name:"ends_at",label:"Fine (facoltativa)",kind:"datetime"},
        {name:"description",label:"Descrizione",kind:"textarea",required:true,max:12000,full:true}
      ]
    }
  };
  const $status = (message,isError=false) => {
    $("hubStatus").textContent = message || "";
    $("hubStatus").dataset.error = isError?"true":"false";
  };
  let isAdmin=false, section="news", rows=[], selected=null, busy=false;
  function goLogin() {
    isAdmin=false;
    $("hubWorkspace").hidden=true;
    $("hubLoginPanel").hidden=false;
    $("hubDenied").hidden=true;
  }
  function goDenied() {
    isAdmin=false;
    $("hubWorkspace").hidden=true;
    $("hubLoginPanel").hidden=true;
    $("hubDenied").hidden=false;
  }
  async function checkPermission() {
    const result=await db.auth.getUser();
    if(result.error || !result.data.user) {goLogin();return;}
    const access=await db.rpc("is_sheriff_admin");
    if(access.error) throw access.error;
    if(access.data!==true) {goDenied();return;}
    isAdmin=true;
    $("hubLoginPanel").hidden=true;
    $("hubDenied").hidden=true;
    $("hubWorkspace").hidden=false;
    $("hubIdentity").textContent=result.data.user.email||"Amministratore";
    $status("");
    await Promise.all([stats(),loadData(),staffPermissions(),loadStaff()]);
  }
  async function login(e) {
    e.preventDefault();
    const button=$("hubLoginSubmit");
    button.disabled=true;
    $status("Accesso in corso…");
    try {
      const r=await db.auth.signInWithPassword({
        email:$("hubEmail").value.trim(),password:$("hubPassword").value
      });
      if(r.error)throw r.error;
      $("hubPassword").value="";
      await checkPermission();
    } catch (err) {$status("Accesso non riuscito: "+err.message,true);}
    finally {button.disabled=false;}
  }
  async function logout() {
    await db.auth.signOut();
    rows=[];selected=null;
    $("hubEditPanel").hidden=true;
    goLogin();
    $status("Disconnesso.");
  }
  async function count(table,id) {
    const r=await db.from(table).select("id",{count:"exact",head:true});
    $(id).textContent = r.error?"—":String(r.count??"—");
    if(r.error) $(id).title="Dato non accessibile: "+r.error.message;
  }
  async function stats(){
    if(!isAdmin)return;
    const jobs=[
      count("frontier_news","hubStatNews"),
      count("commercial_registry","hubStatBusiness"),
      count("frontier_events","hubStatEvents"),
      (async()=>{
        const r=await db.storage.from("lc-image-hosting").list("uploads",{limit:100,offset:0});
        const el=$("hubStatImages");
        if(r.error) {el.textContent="—";el.title="Archivio non disponibile: "+r.error.message;}
        else {
          const n=(r.data||[]).filter(x=>x.name&&!x.name.endsWith("/")).length;
          el.textContent=n>=100?"100+":String(n);
          el.title=n>=100?"Almeno 100 immagini, vedi l'archivio":"Numero immagini in archivio";
        }
      })()
    ];
    await Promise.allSettled(jobs);
  }
  async function staffPermissions() {
    await Promise.all([
      (async()=>{const r=await db.rpc("is_medical_staff");
        const node=$("hubMedicalPermission");
        node.dataset.allowed=String(!r.error&&r.data===true);
        node.textContent=r.error?"Abilitazione da verificare":r.data===true?"✓ Accesso medico abilitato":"Ruolo medico non assegnato: l'ufficio richiede abilitazione";
      })(),
      (async()=>{const r=await db.rpc("is_journalist_staff");
        const node=$("hubJournalPermission");
        node.dataset.allowed=String(!r.error&&r.data===true);
        node.textContent=r.error?"Abilitazione da verificare":r.data===true?"✓ Accesso redazione abilitato":"Ruolo giornalista non assegnato: l'ufficio richiede abilitazione";
      })()
    ]);
  }
  function cleanStatus(row) {
    return config[section].state(row);
  }
  function node(tag,className,text){
    const element=document.createElement(tag);
    if(className)element.className=className;
    if(text!==undefined)element.textContent=text;
    return element;
  }
  function action(label, callback, cls="btn-secondary"){
    const btn=node("button",cls,label);
    btn.type="button";btn.addEventListener("click",callback);
    return btn;
  }
  function niceDate(v) {
    if(!v)return "—";
    const d=new Date(v);
    return Number.isNaN(d.getTime())?"—":d.toLocaleString("it-IT",{dateStyle:"medium",timeStyle:"short"});
  }
  function renderList() {
    const box=$("hubRows");
    box.replaceChildren();
    const query=$("hubFilter").value.trim().toLocaleLowerCase("it");
    const matching=rows.filter(row=>[row[config[section].name],row.category,row.town,row.owner_name,row.organizer].some(x=>String(x||"").toLocaleLowerCase("it").includes(query)));
    if(!matching.length) {box.appendChild(node("div","hub-empty",query?"Nessun risultato per questa ricerca.":"Non ci sono contenuti in questa sezione."));return;}
    for(const item of matching){
      const card=node("article","hub-item");
      const inner=node("div","hub-item-body");
      inner.appendChild(node("div","hub-item-title",item[config[section].name]));
      const detail=node("div","hub-item-detail",
        section==="news"?"Autore: "+item.author_name+" · "+niceDate(item.published_at):
        section==="business"?[item.town,item.owner_name,niceDate(item.created_at)].join(" · "):
        [item.town,niceDate(item.starts_at)].join(" · "));
      inner.appendChild(detail);
      const st=cleanStatus(item);
      const label=node("span","hub-item-status",st.label);
      label.dataset.state=st.tone;
      inner.appendChild(label);
      const controls=node("div","hub-item-actions");
      controls.appendChild(action("Modifica",()=>edit(item)));
      controls.appendChild(action(config[section].action(item).label,()=>toggle(item),"btn-secondary"));
      card.append(inner,controls);box.appendChild(card);
    }
  }
  async function loadData(){
    if(!isAdmin)return;
    selected=null;$("hubEditPanel").hidden=true;
    const conf=config[section];
    $("hubListTitle").textContent=conf.label;
    $("hubRows").replaceChildren(node("div","hub-empty","Caricamento contenuti…"));
    const r=await db.from(conf.table).select("*").order(conf.order,{ascending:false}).limit(100);
    if(r.error){rows=[];$("hubRows").replaceChildren(node("div","hub-empty","Errore nel caricamento: "+r.error.message));$status(r.error.message,true);return;}
    rows=r.data||[];renderList();
  }
  function setSection(next){
    if(!config[next]||next===section)return;
    section=next;
    $("hubFilter").value="";
    document.querySelectorAll(".hub-tab").forEach(btn=>{
      const active=btn.dataset.section===section;
      btn.classList.toggle("active",active);
      btn.setAttribute("aria-pressed",String(active));
    });
    loadData();
  }
  function localDateTime(value) {
    if(!value)return "";
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return "";
    const n=x=>String(x).padStart(2,"0");
    return d.getFullYear()+"-"+n(d.getMonth()+1)+"-"+n(d.getDate())+"T"+n(d.getHours())+":"+n(d.getMinutes());
  }
  function edit(item){
    selected={id:item.id,section};
    const cfg=config[section];
    $("hubEditTitle").textContent="Modifica "+cfg.singular+": "+item[cfg.name];
    const fields=$("hubEditFields");
    fields.replaceChildren();
    cfg.fields.forEach(f=>{
      const wrap=node("div",f.full?"full":"");
      const label=node("label","",f.label);
      label.setAttribute("for","hubField-"+f.name);
      let input;
      if(f.kind==="textarea") {
        input=node("textarea");
        input.rows=5;
        input.value=String(item[f.name]??"");
      } else if(f.kind==="select") {
        input=node("select");
        f.options.forEach(option=>{
          const opt=node("option","",option);
          opt.value=option;input.appendChild(opt);
        });
        input.value=item[f.name];
      } else {
        input=node("input");
        input.type=f.kind==="datetime"?"datetime-local":"text";
        input.value=f.kind==="datetime"?localDateTime(item[f.name]):String(item[f.name]??"");
      }
      input.id="hubField-"+f.name;
      if(f.required)input.required=true;
      if(f.max)input.maxLength=f.max;
      if(f.min)input.minLength=f.min;
      wrap.append(label,input);
      fields.appendChild(wrap);
    });
    $("hubEditPanel").hidden=false;
    $("hubEditPanel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function updateItem(table,id,changes) {
    const r=await db.from(table).update(changes).eq("id",id).select("id");
    if(r.error)throw r.error;
    if(!r.data||r.data.length!==1)throw Error("Nessun record modificato. Verifica i permessi.");
  }
  async function save(e){
    e.preventDefault();
    if(!isAdmin||!selected||busy||selected.section!==section)return;
    const cfg=config[section];
    const changes={};
    for(const f of cfg.fields){
      const raw=$("hubField-"+f.name).value;
      const value=f.kind==="datetime"?(raw?new Date(raw).toISOString():null):raw.trim();
      if(f.required && !value){$status("Compila il campo "+f.label,true);return;}
      if(f.min && String(value).length<f.min){$status(f.label+" richiede almeno "+f.min+" caratteri.",true);return;}
      changes[f.name]=value;
    }
    if(section==="events" && changes.ends_at && new Date(changes.ends_at)<=new Date(changes.starts_at)){
      $status("La fine dell'evento deve essere successiva all'inizio.",true);return;
    }
    busy=true;$("hubSave").disabled=true;$status("Salvataggio in corso…");
    try{
      await updateItem(cfg.table,selected.id,changes);
      $status("Modifiche salvate correttamente.");
      await Promise.all([loadData(),stats()]);
    }catch(err){$status("Impossibile salvare: "+err.message,true)}
    finally{busy=false;$("hubSave").disabled=false;}
  }
  async function toggle(item){
    if(!isAdmin||busy)return;
    const conf=config[section],task=conf.action(item);
    if(!window.confirm("Confermi: "+task.label+"?\n\n"+item[conf.name]))return;
    busy=true;$status("Aggiornamento in corso…");
    try{
      await updateItem(conf.table,item.id,task.updates);
      $status("Stato aggiornato: "+item[conf.name]);
      await Promise.all([loadData(),stats()]);
    }catch(err){$status("Operazione non riuscita: "+err.message,true)}
    finally{busy=false;}
  }

  const staffConfig = {
    medical:{table:"medical_staff",name:"display_name",target:"hubStaffMedical"},
    journalist:{table:"journalist_staff",name:"pen_name",target:"hubStaffJournalist"}
  };
  let staffBusy=false;
  async function loadStaff() {
    if(!isAdmin)return;
    await Promise.all(Object.entries(staffConfig).map(async([type,cfg])=>{
      const box=$(cfg.target);
      box.replaceChildren(node("div","hub-empty","Caricamento personale…"));
      const r=await db.from(cfg.table).select("user_id,"+cfg.name+",active").order(cfg.name,{ascending:true});
      box.replaceChildren();
      if(r.error) {
        box.appendChild(node("div","hub-empty","Errore: "+r.error.message));
        return;
      }
      if(!r.data.length) {
        box.appendChild(node("div","hub-empty","Nessun account assegnato a questo ufficio."));
        return;
      }
      for(const user of r.data){
        const entry=node("article","hub-staff-entry");
        const description=node("div","hub-staff-person");
        description.appendChild(node("strong","",user[cfg.name]));
        const uid=node("small","",user.user_id);
        uid.title="ID account Supabase";
        description.appendChild(uid);
        const state=node("span","hub-item-status",user.active?"Attivo":"Sospeso");
        state.dataset.state=user.active?"live":"off";
        description.appendChild(state);
        const button=action(user.active?"Sospendi":"Riattiva",()=>toggleStaff(type,user));
        entry.append(description,button);
        box.appendChild(entry);
      }
    }));
  }
  async function toggleStaff(type,person) {
    if(!isAdmin||staffBusy)return;
    const cfg=staffConfig[type];
    const word=person.active?"sospendere":"riattivare";
    if(!window.confirm("Confermi di "+word+" il ruolo per "+person[cfg.name]+"?\n\nL'accesso dell'utente all'ufficio cambierà immediatamente alla prossima verifica."))return;
    staffBusy=true;
    try {
      const r=await db.from(cfg.table).update({active:!person.active})
        .eq("user_id",person.user_id).select("user_id");
      if(r.error)throw r.error;
      if(!r.data?.length)throw Error("Nessuna autorizzazione modificata.");
      $status("Ruolo "+(person.active?"sospeso":"riattivato")+" per "+person[cfg.name]+".");
      await Promise.all([loadStaff(),staffPermissions()]);
    }catch(e){$status("Impossibile aggiornare il ruolo: "+e.message,true);}
    finally{staffBusy=false;}
  }
  async function createStaff(e) {
    e.preventDefault();
    if(!isAdmin||staffBusy)return;
    const cfg=staffConfig[$("hubStaffRole").value];
    if(!cfg)return;
    const name=$("hubStaffName").value.trim();
    const uid=$("hubStaffUid").value.trim().toLowerCase();
    if(name.length<2||!(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(uid))) {
      $status("Inserisci un nome e uno User UID validi.",true);return;
    }
    if(!window.confirm("Assegnare l'abilitazione "+$("hubStaffRole").selectedOptions[0].text+" a "+name+"?\n\nL'account deve già esistere in Supabase."))return;
    staffBusy=true;$("hubStaffCreateSubmit").disabled=true;
    try {
      const r=await db.from(cfg.table).insert({user_id:uid,[cfg.name]:name,active:true}).select("user_id");
      if(r.error)throw r.error;
      if(!r.data?.length)throw Error("L'assegnazione non è stata confermata.");
      $("hubStaffCreateForm").reset();
      $status("Ruolo assegnato correttamente a "+name+".");
      await Promise.all([loadStaff(),staffPermissions()]);
    }catch(err){
      $status("Impossibile assegnare il ruolo: "+err.message+". Verifica che l'account esista e non sia già assegnato.",true);
    }finally{staffBusy=false;$("hubStaffCreateSubmit").disabled=false;}
  }
  document.addEventListener("DOMContentLoaded",()=>{
    $("hubLoginForm").addEventListener("submit",login);
    $("hubSignout").addEventListener("click",logout);
    $("hubDeniedLogout").addEventListener("click",logout);
    $("hubReload").addEventListener("click",async()=>{await Promise.all([loadData(),stats(),staffPermissions(),loadStaff()]);$status("Dati aggiornati.")});
    $("hubFilter").addEventListener("input",renderList);
    $("hubRefreshList").addEventListener("click",loadData);
    document.querySelectorAll(".hub-tab").forEach(btn=>btn.addEventListener("click",()=>setSection(btn.dataset.section)));
    $("hubEditCancel").addEventListener("click",()=>{selected=null;$("hubEditPanel").hidden=true});
    $("hubEditForm").addEventListener("submit",save);
    $("hubStaffMedicRefresh").addEventListener("click",loadStaff);
    $("hubStaffJournalRefresh").addEventListener("click",loadStaff);
    $("hubStaffCreateForm").addEventListener("submit",createStaff);
    db.auth.onAuthStateChange((_e,session)=>{
      if(!session){goLogin();return;}
      if(!isAdmin)setTimeout(()=>{checkPermission().catch(e=>$status(e.message,true))},0);
    });
    checkPermission().catch(e=>{$status("Impossibile verificare i permessi: "+e.message,true);goLogin();});
  });
})();