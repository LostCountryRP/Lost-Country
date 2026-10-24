/* Lost Country RP — Gestione dei ruoli amministrativi */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const sections={all:'Intero portale',news:'Giornale',business:'Attività commerciali',
    events:'Eventi',content:'Regolamento e testi'};
  const roles={super_admin:'Super Amministratore',admin:'Amministratore',
    section_manager:'Responsabile di sezione'};
  let authorized=false,busy=false;
  const db=()=>window.LC_ADMIN_DB;
  function node(tag,cls,value) {
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(value!==undefined)n.textContent=value;
    return n;
  }
  function status(msg,error=false) {
    $('hubRolesStatus').textContent=msg||'';
    $('hubRolesStatus').dataset.error=String(error);
  }
  function sectionVisibility() {
    const manager=$('hubRolesRole').value==='section_manager';
    $('hubRolesSectionWrap').hidden=!manager;
    $('hubRolesSection').required=manager;
  }
  async function loadRoles() {
    if(!authorized)return;
    const box=$('hubRolesList');
    box.replaceChildren(node('div','hub-empty','Caricamento autorizzazioni…'));
    const r=await db().from('lc_admin_assignments')
      .select('user_id,role,section,active,assigned_at')
      .order('role',{ascending:true}).order('user_id',{ascending:true});
    box.replaceChildren();
    if(r.error){status('Impossibile leggere i ruoli: '+r.error.message,true);return;}
    if(!r.data?.length){box.append(node('div','hub-empty','Nessun ruolo assegnato.'));return;}
    for(const entry of r.data){
      const row=node('article','hub-staff-entry');
      const info=node('div','hub-staff-person');
      info.append(node('strong','',roles[entry.role]+' · '+sections[entry.section]));
      info.append(node('small','',entry.user_id));
      const state=node('span','hub-item-status',entry.active?'Attivo':'Sospeso');
      state.dataset.state=entry.active?'live':'off';
      info.append(state);
      const legacy=entry.user_id==='153d969d-0a90-454d-b800-465f24ce7101'
        && entry.role==='admin' && entry.active;
      if(entry.role==='super_admin'||legacy) {
        info.append(node('small','',legacy?
          'Account storico: revoca separata dagli Sceriffi':'Assegnazione protetta'));
        row.append(info);
      }else{
        const btn=node('button','btn-secondary',entry.active?'Sospendi':'Riattiva');
        btn.type='button';
        btn.addEventListener('click',()=>setRole(entry.user_id,entry.role,entry.section,!entry.active));
        row.append(info,btn);
      }
      box.append(row);
    }
    status('Elenco aggiornato.');
  }
  async function setRole(user,role,section,active) {
    if(!authorized||busy)return false;
    if(!confirm((active?'Attivare':'Sospendere')+' '+roles[role]+
      ' per '+user+' ('+sections[section]+')?'))return false;
    busy=true;$('hubRolesSubmit').disabled=true;
    try {
      const r=await db().rpc('lc_set_portal_role',{
        p_user_id:user,p_role:role,p_section:section,p_active:active
      });
      if(r.error)throw r.error;
      await loadRoles();
      status(active?'Ruolo attivato.':'Ruolo sospeso.');
      return true;
    }catch(err){status('Operazione non riuscita: '+err.message,true);return false;}
    finally{busy=false;$('hubRolesSubmit').disabled=false;}
  }
  async function submit(e) {
    e.preventDefault();
    if(!authorized||busy)return;
    const uid=$('hubRolesUid').value.trim().toLowerCase();
    const role=$('hubRolesRole').value;
    const section=role==='admin'?'all':$('hubRolesSection').value;
    if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(uid)){
      status('Inserisci uno User UID valido.',true);return;
    }
    if(await setRole(uid,role,section,true))$('hubRolesUid').value='';
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('hubRolesPanel').innerHTML=[
      '<form id="hubRolesForm" class="form-grid hub-roles-form">',
      '<div><label for="hubRolesUid">User UID Supabase (account esistente)</label>',
      '<input id="hubRolesUid" type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required></div>',
      '<div><label for="hubRolesRole">Ruolo</label><select id="hubRolesRole">',
      '<option value="section_manager">Responsabile di sezione</option>',
      '<option value="admin">Amministratore del portale</option></select></div>',
      '<div id="hubRolesSectionWrap"><label for="hubRolesSection">Sezione</label>',
      '<select id="hubRolesSection"><option value="news">Giornale</option>',
      '<option value="business">Attività commerciali</option>',
      '<option value="events">Eventi</option>',
      '<option value="content">Regolamento e testi</option></select></div>',
      '<div class="full"><button id="hubRolesSubmit" class="btn-primary" type="submit">Assegna ruolo</button></div>',
      '</form><div class="hub-cms-toolbar"><strong>Ruoli assegnati</strong>',
      '<button id="hubRolesRefresh" class="btn-secondary" type="button">Aggiorna</button></div>',
      '<div id="hubRolesList" class="hub-staff-list"></div>',
      '<p id="hubRolesStatus" class="hub-status" role="status" aria-live="polite"></p>'
    ].join('');
    $('hubRolesRole').addEventListener('change',sectionVisibility);
    sectionVisibility();
    $('hubRolesForm').addEventListener('submit',submit);
    $('hubRolesRefresh').addEventListener('click',loadRoles);
  });
  document.addEventListener('lc-admin-state',event=>{
    authorized=event.detail?.role==='super_admin';
    if(authorized)loadRoles();
    else if($('hubRolesList'))$('hubRolesList').replaceChildren();
  });
})();