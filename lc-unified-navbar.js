/* Lost Country RP — navigazione condivisa, desktop e mobile. */
(() => {
  'use strict';
  const MAIN = [
    ['regolamento.html','Regolamento'],
    ['approfondimenti.html','Approfondimenti'],
    ['lore.html','Lore'],
    ['voce-della-frontiera.html','La Voce della Frontiera'],
    ['eventi.html','Eventi']
  ];
  const SERVICES = [
    ['attivita-commerciali.html','Attività Commerciali'],
    ['codice-penale.html','Codice Penale'],
    ['sceriffi.html','Gestione Sceriffi'],
    ['medico.html','Registro Medico'],
    ['ufficio-civico.html','Ufficio Civico'],
    ['redazione.html','Redazione'],
    ['hosting-immagini.html','Hosting Immagini'],
    ['admin-sceriffi.html','Account Sceriffi']
  ];
  const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  function makeLink(href,label) {
    const a=document.createElement('a');
    a.href=href;
    a.textContent=label;
    if(current===href) a.setAttribute('aria-current','page');
    return a;
  }
  function setupBar(nav) {
    if(nav.dataset.lcUnified==='3')return;
    nav.dataset.lcUnified='3';
    nav.classList.add('lc-site-nav','lc-clean-nav');
    nav.setAttribute('aria-label','Navigazione principale Lost Country');
    const home=makeLink('index.html','Home');
    home.className='lc-clean-home';
    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='lc-clean-toggle';
    toggle.textContent='Menu ☰';
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-controls','lc-main-links');
    const links=document.createElement('div');
    links.id='lc-main-links';
    links.className='lc-clean-links';
    MAIN.forEach(([href,label])=>links.append(makeLink(href,label)));
    const services=document.createElement('details');
    services.className='lc-clean-services';
    const summary=document.createElement('summary');
    summary.textContent='Servizi';
    if(SERVICES.some(([href])=>href===current))services.classList.add('has-current-page');
    const panel=document.createElement('div');
    panel.className='lc-clean-services-panel';
    SERVICES.forEach(([href,label])=>panel.append(makeLink(href,label)));
    services.append(summary,panel);
    const admin=makeLink('amministrazione.html','Amministrazione');
    admin.className='lc-clean-admin';
    admin.setAttribute('aria-label','Funzioni amministratore');
    links.append(services,admin);
    nav.replaceChildren(home,toggle,links);
    const compact=matchMedia('(max-width: 1200px)');
    function closeMenu(restoreFocus=false) {
      if(restoreFocus)toggle.focus();
      nav.classList.remove('is-menu-open');
      toggle.setAttribute('aria-expanded','false');
      services.open=false;
    }
    toggle.addEventListener('click',()=>{
      const open=toggle.getAttribute('aria-expanded')!=='true';
      nav.classList.toggle('is-menu-open',open);
      toggle.setAttribute('aria-expanded',String(open));
      if(!open)services.open=false;
    });
    document.addEventListener('click',e=>{
      if(!nav.contains(e.target))closeMenu();
      else if(!services.contains(e.target))services.open=false;
    });
    document.addEventListener('keydown',e=>{
      if(e.key!=='Escape')return;
      if(services.open){services.open=false;summary.focus();}
      else if(nav.classList.contains('is-menu-open'))closeMenu(true);
    });
    nav.addEventListener('focusout',()=>{
      setTimeout(()=>{if(!nav.contains(document.activeElement))closeMenu();},0);
    });
    compact.addEventListener('change',()=>{
      const focus=links.contains(document.activeElement);
      closeMenu(compact.matches&&focus);
      if(!compact.matches&&document.activeElement===toggle)home.focus();
    });
    const update=()=>document.documentElement.style.setProperty('--lc-nav-height',`${Math.ceil(nav.getBoundingClientRect().height)}px`);
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(update).observe(nav);
    else window.addEventListener('resize',update,{passive:true});
    requestAnimationFrame(update);
  }
  function makeInnerHeader() {
    const header=document.createElement('header');
    header.className='lc-shared-masthead';
    header.setAttribute('aria-label','Lost Country RP');
    const home=document.createElement('a');
    home.className='lc-shared-brand';
    home.href='index.html';
    home.setAttribute('aria-label','Torna alla Home di Lost Country RP');
    const img=document.createElement('img');
    img.src='lc-logo-official.png';
    img.alt='Logo ufficiale Lost Country RP';
    img.width=130;
    img.height=130;
    const name=document.createElement('span');
    name.className='lc-shared-brand-name';
    name.textContent='Lost Country RP';
    home.append(img,name);
    const subtitle=document.createElement('p');
    subtitle.textContent='Una nuova frontiera, le tue storie';
    header.append(home,subtitle);
    return header;
  }
  function init() {
    const isHome=document.body.classList.contains('page-home');
    if(isHome){
      const nav=document.querySelector('.lc-map-navbar');
      if(nav)setupBar(nav);
      document.body.classList.add('lc-layout-unified');
      return;
    }
    const shell=document.querySelector('.site-shell');
    const main=shell?.querySelector(':scope > .site-main');
    if(!shell||!main)return;
    const nav=main.querySelector(':scope > .top-nav') || (() => {
      const created=document.createElement('nav');
      created.className='top-nav';
      main.prepend(created);
      return created;
    })();
    setupBar(nav);
    // Put the top navigation ABOVE the sidebar and office modules on every page.
    shell.prepend(nav);
    if(!shell.querySelector(':scope > .lc-shared-masthead')){
      nav.after(makeInnerHeader());
    }
    document.body.classList.add('lc-layout-unified');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
