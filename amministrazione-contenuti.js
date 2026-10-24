/* Lost Country RP | Editor centrale e registro operazioni */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const pages={
    'index.html':'Regolamento',
    'approfondimenti.html':'Approfondimenti',
    'codice-penale.html':'Codice penale (descrizioni)'
  };
  let authorized=false, page='index.html', originals=[], overrides=new Map(), selected=null, working=false;
  const db=()=>window.LC_ADMIN_DB;
  function el(tag,cls,text) {
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(text!==undefined)e.textContent=String(text);
    return e;
  }
  function button(text,onClick) {
    const b=el('button','btn-secondary',text);b.type='button';b.addEventListener('click',onClick);return b;
  }
  function status(text,error=false) {
    $('cmsStatus').textContent=text||'';
    $('cmsStatus').dataset.error=error?'true':'false';
  }
  const formatDate=v=>v?new Date(v).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'}):'—';
  function labelFor(elem) {
    const parent=elem.closest('.deep-dive-section, .law-card');
    const previous=elem.previousElementSibling;
    const head=(previous && previous.matches('h2,h3'))?previous:
      parent?.querySelector('h2,h3') ||
      (elem.parentElement?.previousElementSibling?.matches('h2,h3')?elem.parentElement.previousElementSibling:null);
    return (head?.textContent||elem.textContent||'Blocco di testo').replace(/\s+/g,' ').trim().slice(0,110);
  }
  function renderList() {
    const list=$('cmsBlocks');list.replaceChildren();
    const q=$('cmsSearch').value.toLocaleLowerCase('it').trim();
    const filtered=originals.filter(item=>(item.label+' '+item.text).toLocaleLowerCase('it').includes(q));
    $('cmsCounter').textContent=filtered.length+' blocchi';
    if(!filtered.length)list.append(el('p','hub-empty','Nessun testo corrispondente.'));
    for(const item of filtered) {
      const edit=overrides.get(item.key);
      const card=el('article','hub-item');
      const content=el('div','hub-item-body');
      content.append(el('strong','hub-item-title',item.label));
      content.append(el('span','hub-item-detail',item.text.slice(0,180)+(item.text.length>180?'…':'')));
      const marker=el('span','hub-item-status',edit?.enabled?'Personalizzato':edit?'Originale attivo':'Originale');
      marker.dataset.state=edit?.enabled?'live':'off';content.append(marker);
      const actions=el('div','hub-item-actions');
      actions.append(button('Modifica',()=>openEditor(item.key)));
      card.append(content,actions);list.append(card);
    }
  }
  async function loadPage() {
    if(!authorized)return;
    selected=null;$('cmsEditor').hidden=true;status('Caricamento dei testi…');
    const target=$('cmsBlocks');target.replaceChildren(el('div','hub-empty','Caricamento in corso…'));
    try {
      page=$('cmsPage').value;
      if(!Object.hasOwn(pages,page))throw Error('Pagina non consentita');
      const [html,res]=await Promise.all([
        fetch(page,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Pagina non disponibile');return r.text()}),
        db().from('lc_site_edits').select('page,block_key,html,enabled,version,updated_at').eq('page',page)
      ]);
      if(res.error)throw res.error;
      const doc=new DOMParser().parseFromString(html,'text/html');
      originals=[...doc.querySelectorAll('[data-lc-edit]')].map(elem=>({
        key:elem.dataset.lcEdit,label:labelFor(elem),
        html:elem.innerHTML,text:elem.textContent.replace(/\s+/g,' ').trim()
      }));
      overrides=new Map((res.data||[]).map(r=>[r.block_key,r]));
      status(originals.length?'Seleziona un blocco da modificare. Il testo originale non sarà cancellato.':'Nessun blocco modificabile trovato.');
      renderList();
    }catch(err) {
      originals=[];overrides=new Map();renderList();
      status('Impossibile caricare la pagina: '+err.message,true);
    }
  }
  function preview() {
    if(!window.LC_CMS)return;
    $('cmsPreview').innerHTML=window.LC_CMS.sanitize($('cmsHtml').value);
  }
  function openEditor(key) {
    if(!authorized || working)return;
    const item=originals.find(x=>x.key===key);
    if(!item)return;
    selected=key;
    const override=overrides.get(key);
    $('cmsTitle').textContent='Modifica: '+item.label;
    $('cmsCode').textContent=page+' / '+key;
    $('cmsHtml').value=override?.enabled?override.html:item.html;
    $('cmsOriginal').textContent=item.text;
    $('cmsReset').disabled=!override?.enabled;
    $('cmsEditor').hidden=false;
    preview();loadVersions();
    $('cmsEditor').scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function saveContent(nextHTML,enabled=true) {
    const item=originals.find(x=>x.key===selected);
    if(!authorized||working||!item)return;
    const safe=window.LC_CMS.sanitize(nextHTML);
    if(!safe.trim()||!new DOMParser().parseFromString(safe,'text/html').body.textContent.trim()) {
      status('Non puoi pubblicare un contenuto vuoto.',true);return;
    }
    if(safe.length>20000){status('Contenuto troppo lungo (massimo 20.000 caratteri).',true);return;}
    working=true;$('cmsSave').disabled=true;$('cmsReset').disabled=true;
    try {
      const current=overrides.get(selected);
      let result;
      if(current) {
        result=await db().from('lc_site_edits').update({html:safe,enabled})
          .eq('page',page).eq('block_key',selected).eq('version',current.version)
          .select('page,block_key,html,enabled,version,updated_at').single();
      } else {
        result=await db().from('lc_site_edits').insert({page,block_key:selected,html:safe,enabled})
          .select('page,block_key,html,enabled,version,updated_at').single();
      }
      if(result.error)throw result.error;
      overrides.set(selected,result.data);
      $('cmsHtml').value=enabled?safe:item.html;
      preview();renderList();loadVersions();
      status(enabled?'Modifica pubblicata. Il nuovo testo sarà visibile nella pagina.':'Testo originale ripristinato: la personalizzazione resta nello storico.');
    }catch(err) {
      status('Salvataggio non riuscito: '+err.message+'. Se il testo è stato modificato da altri, aggiorna la pagina.',true);
    }finally{
      working=false;$('cmsSave').disabled=false;
      $('cmsReset').disabled=!overrides.get(selected)?.enabled;
    }
  }
  async function save(e) {
    e.preventDefault();
    if(!selected)return;
    if(!confirm('Pubblicare questa modifica su '+pages[page]+'?\n\nIl testo sarà subito visibile ai visitatori.'))return;
    await saveContent($('cmsHtml').value,true);
  }
  async function restoreOriginal() {
    if(!selected||!overrides.get(selected)?.enabled)return;
    if(!confirm('Ripristinare il testo originale del sito per questo blocco?'))return;
    const current=overrides.get(selected);
    await saveContent(current.html,false);
  }
  function versionActions(history) {
    const box=$('cmsVersions');box.replaceChildren();
    if(!history.length){box.append(el('p','hub-empty','Nessuna versione precedente.'));return;}
    for(const record of history) {
      const row=el('div','hub-staff-entry');
      const desc=el('div','hub-staff-person');
      desc.append(el('strong','',formatDate(record.changed_at)+' · '+(record.action==='INSERT'?'Creazione':'Modifica')));
      desc.append(el('small','',record.changed_by?'Account '+record.changed_by.slice(0,8):'Sistema'));
      const old=record.before_value?.html;
      if(typeof old==='string')row.append(desc,button('Carica versione precedente',()=>{
        $('cmsHtml').value=old;
        preview();
        status('Versione precedente caricata nell’editor. Premi Pubblica per ripristinarla.');
        $('cmsEditor').scrollIntoView({behavior:'smooth'});
      }));
      else row.append(desc);
      box.append(row);
    }
  }
  async function loadVersions() {
    if(!selected||!authorized)return;
    const key=page+':'+selected;
    const result=await db().from('lc_admin_history')
      .select('id,changed_at,changed_by,action,before_value')
      .eq('section','lc_site_edits').eq('entity_id',key)
      .order('changed_at',{ascending:false}).limit(15);
    if(result.error){$('cmsVersions').textContent='Storico non disponibile: '+result.error.message;return;}
    versionActions(result.data||[]);
  }
  const labels={
    lc_site_edits:'Testi del sito',
    frontier_news:'Giornale',
    commercial_registry:'Attività commerciali',
    frontier_events:'Eventi',
    medical_staff:'Ruoli medici',
    journalist_staff:'Ruoli giornalisti'
  };
  async function loadAudit() {
    if(!authorized)return;
    const box=$('cmsAuditRows');box.replaceChildren(el('p','hub-empty','Caricamento attività…'));
    const result=await db().from('lc_admin_history')
      .select('id,changed_at,changed_by,section,entity_id,action')
      .order('changed_at',{ascending:false}).limit(70);
    box.replaceChildren();
    if(result.error) {
      box.append(el('p','hub-empty','Impossibile leggere il registro: '+result.error.message));return;
    }
    if(!result.data?.length){box.append(el('p','hub-empty','Nessuna modifica registrata dalla creazione dello storico.'));return;}
    for (const entry of result.data) {
      const row=el('article','hub-audit-entry');
      const title=el('div','hub-item-title',(labels[entry.section]||entry.section)+' · '+
        (entry.action==='INSERT'?'Creato':entry.action==='DELETE'?'Eliminato':'Modificato'));
      const meta=el('div','hub-item-detail',formatDate(entry.changed_at)+
        ' · '+(entry.changed_by?'Account '+entry.changed_by.slice(0,8):'Sistema')+
        ' · '+entry.entity_id);
      row.append(title,meta);box.append(row);
    }
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('cmsRoot').innerHTML = `
      <div class="form-grid hub-cms-controls">
        <div><label for="cmsPage">Pagina</label><select id="cmsPage"><option value="index.html">Regolamento</option><option value="approfondimenti.html">Approfondimenti</option><option value="codice-penale.html">Codice penale — descrizioni</option></select></div>
        <div><label for="cmsSearch">Cerca un argomento</label><input id="cmsSearch" type="search" placeholder="Cerca nei testi…"></div>
      </div>
      <div class="hub-cms-toolbar"><span id="cmsCounter">—</span><button type="button" class="btn-secondary" id="cmsRefresh">Aggiorna testi</button></div>
      <div id="cmsBlocks" class="hub-items" aria-live="polite"></div>
      <p id="cmsStatus" class="hub-status" role="status" aria-live="polite"></p>
      <div id="cmsEditor" class="hub-cms-editor" hidden>
        <div class="hub-edit-head"><div><h3 id="cmsTitle">Modifica testo</h3><small id="cmsCode"></small></div><button type="button" class="btn-secondary" id="cmsClose">Chiudi</button></div>
        <p>Modifica HTML semplice: &lt;p&gt;, &lt;strong&gt;, &lt;em&gt; ed elenchi. Il codice non consentito viene rimosso automaticamente.</p>
        <form id="cmsForm">
          <label for="cmsHtml">Contenuto da pubblicare</label><textarea id="cmsHtml" rows="11" required spellcheck="true"></textarea>
          <h4>Anteprima pubblica</h4><div id="cmsPreview" class="hub-cms-preview"></div>
          <div class="hub-edit-actions"><button type="button" class="btn-secondary" id="cmsReset">Ripristina originale</button><button type="submit" class="btn-primary" id="cmsSave">Pubblica modifica</button></div>
        </form>
        <details><summary>Leggi testo originale</summary><p id="cmsOriginal" class="hub-cms-original"></p></details>
        <h4>Versioni precedenti</h4><div id="cmsVersions"></div>
      </div>`;
    $('cmsAuditRoot').innerHTML = `
      <div class="hub-cms-toolbar"><strong>Ultime 70 operazioni</strong><button class="btn-secondary" id="cmsAuditRefresh" type="button">Aggiorna</button></div>
      <div id="cmsAuditRows" class="hub-audit-list" aria-live="polite"></div>`;
    $('cmsPage').addEventListener('change',loadPage);
    $('cmsSearch').addEventListener('input',renderList);
    $('cmsRefresh').addEventListener('click',loadPage);
    $('cmsHtml').addEventListener('input',preview);
    $('cmsForm').addEventListener('submit',save);
    $('cmsReset').addEventListener('click',restoreOriginal);
    $('cmsClose').addEventListener('click',()=>{$('cmsEditor').hidden=true;selected=null;});
    $('cmsAuditRefresh').addEventListener('click',loadAudit);
  });
  document.addEventListener('lc-admin-state',e=>{
    authorized=Boolean(e.detail?.allowed);
    if(authorized){loadPage();loadAudit();}
    else {selected=null;originals=[];overrides=new Map();$('cmsEditor').hidden=true;}
  });
})();