(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 let db, generation=0, resetTarget=null;
 const status=(id,message)=>{$(id).textContent=message;};
 const value=id=>$(id).value.trim();
 const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
 async function manage(body) {
  const {data,error}=await db.functions.invoke('manage-civic',{body});
  if(error) {
   let detail;
   try {detail=await error.context?.json();}catch{}
   throw new Error(detail?.error||'Operazione non riuscita. Verifica accesso e connessione.');
  }
  if(data?.error) throw new Error(data.error);
  return data;
 }
 async function access() {
  const turn=++generation;
  $('civicEditor').hidden=$('civicAccounts').hidden=$('civicAccountsLink').hidden=true;
  $('civicAccountsLink').style.setProperty('display','none','important');
  $('civicAccountsList').replaceChildren();
  $('civicResetForm').hidden=true;resetTarget=null;$('civicResetForm').reset();
  const {data,error}=await db.auth.getSession();
  if(turn!==generation)return;
  const user=data?.session?.user;
  $('civicLoginForm').hidden=!!user;$('civicSession').hidden=!user;
  if(error||!user){status('civicAccessStatus',error?'Impossibile verificare la sessione.':'Accedi per pubblicare attività ed eventi.');return;}
  $('civicIdentity').textContent='Account connesso: '+user.email;
  const [portal,legacy,staff,sheriff]=await Promise.all([
   db.rpc('lc_portal_is_admin'),db.rpc('is_sheriff_admin'),
   db.from('civic_staff').select('active,display_name').eq('user_id',user.id).maybeSingle(),db.rpc('current_sheriff_name')
  ]);
  if(turn!==generation)return;
  const admin=(!portal.error&&portal.data===true)||(!legacy.error&&legacy.data===true);
  const allowed=admin||(!staff.error&&staff.data?.active===true)||(!sheriff.error&&typeof sheriff.data==='string'&&!!sheriff.data.trim());
  $('civicEditor').hidden=!allowed;
  $('civicAccounts').hidden=$('civicAccountsLink').hidden=!admin;
  $('civicAccountsLink').style.setProperty('display',admin?'flex':'none','important');
  status('civicAccessStatus',allowed?'Accesso autorizzato.':'Account non abilitato o sospeso. Rivolgiti a un amministratore.');
  if(admin)await loadAccounts(turn);
 }
 async function loadAccounts(turn=generation) {
  try {
   const {users}=await manage({action:'list'});
   if(turn!==generation)return;
   const list=$('civicAccountsList');list.replaceChildren();
   if(!users.length)list.append(node('p','Nessun account civico creato.'));
   for(const u of users) {
    const card=node('article','');card.className='app-card';
    card.append(node('h3',u.display_name),node('p',u.email+' · '+(u.active?'Attivo':'Sospeso')));
    if(u.manageable) {
     const toggle=node('button',u.active?'Sospendi':'Riattiva');toggle.type='button';toggle.className='btn-secondary';
     toggle.addEventListener('click',async()=>{toggle.disabled=true;try{await manage({action:'toggle_active',userId:u.id,active:!u.active});status('civicAccountStatus','Stato account aggiornato.');await loadAccounts();}catch(e){status('civicAccountStatus',e.message);}finally{toggle.disabled=false;}});
     const reset=node('button','Nuova password');reset.type='button';reset.className='btn-secondary';
     reset.addEventListener('click',()=>{resetTarget=u.id;$('civicResetForm').reset();$('civicResetForm').hidden=false;$('civicResetTitle').textContent='Nuova password — '+u.display_name;$('civicResetPassword').focus();});
     card.append(toggle,document.createTextNode(' '),reset);
    } else card.append(node('p','Account protetto: gestione riservata.'));
    list.append(card);
   }
  }catch(e){if(turn===generation)status('civicAccountStatus',e.message);}
 }
 function submit(formId,statusId,task) {
  $(formId).addEventListener('submit',async e=>{
   e.preventDefault();const b=e.currentTarget.querySelector('[type="submit"]');b.disabled=true;
   try{status(statusId,'Operazione in corso…');await task();}catch(err){status(statusId,err.message);}finally{b.disabled=false;}
  });
 }
 function setMode() {
  const events=$('portalType').value==='events';
  $('portalCategoryWrap').hidden=events;$('portalLocationWrap').hidden=$('portalStartWrap').hidden=!events;
  $('portalCategory').required=!events;$('portalLocation').required=$('portalStart').required=events;
  $('portalTitle').maxLength=events?160:150;$('portalTitle').minLength=3;
  $('portalTitleLabel').textContent=events?'Titolo evento':'Nome attività';
 }
 async function publish() {
  const {data}=await db.auth.getSession();if(!data.session)throw new Error('Accesso richiesto.');
  const mode=$('portalType').value;
  if(!['business','events'].includes(mode))throw new Error('Sezione non valida.');
  const row={town:value('portalTown'),description:value('portalBody'),created_by:data.session.user.id};
  if(mode==='business')Object.assign(row,{business_name:value('portalTitle'),category:value('portalCategory'),owner_name:value('portalOwner')});
  else {
   const date=new Date(value('portalStart'));if(Number.isNaN(date.getTime()))throw new Error('Data evento non valida.');
   Object.assign(row,{title:value('portalTitle'),location_name:value('portalLocation'),organizer:value('portalOwner'),starts_at:date.toISOString()});
  }
  const {error}=await db.from(mode==='business'?'commercial_registry':'frontier_events').insert(row);
  if(error)throw new Error('Pubblicazione non riuscita. Verifica i campi e che l’account sia ancora abilitato.');
  $('portalEditorForm').reset();setMode();status('portalEditorStatus','Pubblicazione completata.');
 }
 document.addEventListener('DOMContentLoaded',()=>{
  if(!$('civicLoginForm'))return;
  db=window.supabase.createClient(window.LC_SUPABASE_URL,window.LC_SUPABASE_KEY);
  submit('civicLoginForm','civicAccessStatus',async()=>{const {error}=await db.auth.signInWithPassword({email:value('civicEmail'),password:$('civicPassword').value});if(error)throw new Error('Email o password non valide, oppure accesso non disponibile.');$('civicPassword').value='';await access();});
  $('civicLogout').addEventListener('click',async()=>{const {error}=await db.auth.signOut();if(error){status('civicAccessStatus','Disconnessione non riuscita. Riprova.');return;}$('civicCreateForm').reset();$('portalEditorForm').reset();setMode();await access();});
  submit('civicCreateForm','civicAccountStatus',async()=>{
   const password=$('civicNewPassword').value;if(password!==$('civicNewConfirm').value)throw new Error('Le password non coincidono.');
   await manage({action:'create',displayName:value('civicNewName'),email:value('civicNewEmail'),password});
   $('civicCreateForm').reset();status('civicAccountStatus','Account civico creato e abilitato. Può accedere da questa pagina.');await loadAccounts();
  });
  submit('civicResetForm','civicAccountStatus',async()=>{
   const password=$('civicResetPassword').value;if(password!==$('civicResetConfirm').value)throw new Error('Le password non coincidono.');
   await manage({action:'set_password',userId:resetTarget,password});$('civicResetForm').reset();$('civicResetForm').hidden=true;resetTarget=null;status('civicAccountStatus','Password aggiornata.');
  });
  $('civicResetCancel').addEventListener('click',()=>{$('civicResetForm').reset();$('civicResetForm').hidden=true;resetTarget=null;});
  $('civicRefresh').addEventListener('click',()=>loadAccounts());
  $('portalType').addEventListener('change',setMode);submit('portalEditorForm','portalEditorStatus',publish);setMode();
  db.auth.onAuthStateChange(()=>{setTimeout(()=>access().catch(()=>status('civicAccessStatus','Impossibile verificare l’accesso. Riprova.')),0);});
  access().catch(()=>status('civicAccessStatus','Impossibile verificare l’accesso. Riprova.'));
 });
})();
