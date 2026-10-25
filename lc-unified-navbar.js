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
    ['redazione.html','Redazione']
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
    if(nav.dataset.lcUnified==='4')return;
    nav.dataset.lcUnified='4';
    nav.classList.add('lc-site-nav','lc-expanded-nav');
    nav.setAttribute('aria-label','Navigazione principale Lost Country');
    const links=document.createElement('div');
    links.id='lc-main-links';
    links.className='lc-expanded-links';
    links.append(makeLink('index.html','Home'));
    [...MAIN,...SERVICES].forEach(([href,label])=>links.append(makeLink(href,label)));
    const admin=makeLink('amministrazione.html','Amministrazione');
    if(['admin-sceriffi.html','hosting-immagini.html'].includes(current)) {
      admin.classList.add('lc-parent-current');
      admin.setAttribute('aria-label','Amministrazione — sezione corrente');
    }
    links.append(admin);
    const arrow=(direction,label)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='lc-expanded-arrow';
      button.textContent=direction<0?'‹':'›';
      button.setAttribute('aria-label',label);
      button.setAttribute('aria-controls','lc-main-links');
      button.addEventListener('click',()=>links.scrollBy({left:direction*links.clientWidth*.8,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));
      return button;
    };
    const prev=arrow(-1,'Scorri le sezioni a sinistra');
    const next=arrow(1,'Scorri le sezioni a destra');
    nav.replaceChildren(prev,links,next);
    const update=()=>{
      const max=links.scrollWidth-links.clientWidth;
      prev.hidden=next.hidden=max<=2;
      prev.disabled=links.scrollLeft<=2;
      next.disabled=links.scrollLeft>=max-2;
      document.documentElement.style.setProperty('--lc-nav-height',`${Math.ceil(nav.getBoundingClientRect().height)}px`);
    };
    links.addEventListener('scroll',update,{passive:true});
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(update).observe(nav);
    window.addEventListener('resize',update,{passive:true});
    document.fonts?.ready.then(update);
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
