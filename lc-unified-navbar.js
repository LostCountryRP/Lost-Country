/* Lost Country RP — barra superiore unica, identica su Home e pagine reali.
 * I link puntano solo alle pagine esistenti. Non modifica sidebar, moduli o autorizzazioni.
 */
(() => {
  'use strict';
  const MAIN = [
    ['regolamento.html','Regolamento'],
    ['approfondimenti.html','Approfondimenti'],
    ['codice-penale.html','Codice Penale'],
    ['lore.html','Lore'],
    ['medico.html','Registro Medico'],
    ['voce-della-frontiera.html','La Voce della Frontiera'],
    ['eventi.html','Eventi'],
    ['sceriffi.html','Gestione Sceriffi'],
    ['attivita-commerciali.html','Attività Commerciali']
  ];
  const EXTRA = [
    ['hosting-immagini.html','Hosting Immagini'],
    ['amministrazione.html','Amministrazione'],
    ['ufficio-civico.html','Ufficio Civico'],
    ['redazione.html','Redazione'],
    ['admin-sceriffi.html','Account Sceriffi']
  ];
  const current=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  function makeLink(href,label) {
    const a=document.createElement('a');
    a.href=href;
    a.textContent=label;
    if(current===href) {
      a.classList.add('active-page');
      a.setAttribute('aria-current','page');
    }
    return a;
  }
  function createArrow(text,description,delta,viewport) {
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='lc-nav-arrow';
    btn.textContent=text;
    btn.title=description;
    btn.setAttribute('aria-label',description);
    btn.addEventListener('click',()=>viewport.scrollBy({left:delta,behavior:'smooth'}));
    return btn;
  }
  function setupBar(nav) {
    if(nav.dataset.lcUnified==='1')return;
    nav.dataset.lcUnified='1';
    nav.classList.add('lc-site-nav');
    nav.setAttribute('aria-label','Navigazione principale Lost Country');

    const viewport=document.createElement('div');
    viewport.className='lc-nav-viewport';
    viewport.setAttribute('tabindex','0');
    viewport.setAttribute('role','region');
    viewport.setAttribute('aria-label','Scorri le categorie del sito a destra o a sinistra');
    const track=document.createElement('div');
    track.className='lc-nav-track';
    MAIN.forEach(([href,label])=>track.append(makeLink(href,label)));
    viewport.append(track);

    const prev=createArrow('‹','Categorie precedenti',-320,viewport);
    const next=createArrow('›','Categorie successive',320,viewport);
    const more=document.createElement('details');
    more.className='lc-home-more lc-site-more';
    const summary=document.createElement('summary');
    summary.textContent='Altre sezioni';
    summary.setAttribute('aria-label','Apri altre sezioni');
    const panel=document.createElement('div');
    panel.className='lc-home-more-menu lc-site-more-menu';
    EXTRA.forEach(([href,label])=>panel.append(makeLink(href,label)));
    more.append(summary,panel);

    nav.replaceChildren(prev,viewport,next,more);
    const update=()=>{
      const available=viewport.scrollWidth>viewport.clientWidth+3;
      prev.hidden=!available;
      next.hidden=!available;
      prev.disabled=!available||viewport.scrollLeft<=2;
      next.disabled=!available||viewport.scrollLeft+viewport.clientWidth>=viewport.scrollWidth-3;
    };
    viewport.addEventListener('scroll',update,{passive:true});
    if(typeof ResizeObserver!=='undefined') {
      const observer=new ResizeObserver(update);
      observer.observe(viewport);
      observer.observe(track);
    } else {
      addEventListener('resize',update,{passive:true});
    }
    requestAnimationFrame(update);
    more.addEventListener('toggle',()=>{
      if(more.open) more.querySelector('summary')?.setAttribute('aria-expanded','true');
      else more.querySelector('summary')?.setAttribute('aria-expanded','false');
    });
    document.addEventListener('click',event=>{
      if(more.open&&!more.contains(event.target))more.open=false;
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&more.open)more.open=false;
    });
  }
  function init() {
    const home=document.body.classList.contains('page-home');
    const main=document.querySelector('.site-main');
    if(home) {
      const nav=document.querySelector('.lc-map-navbar');
      if(nav)setupBar(nav);
      return;
    }
    if(!main)return;
    const nav=main.querySelector(':scope > .top-nav') || (() => {
      const el=document.createElement('nav');
      el.className='top-nav';
      main.prepend(el);
      return el;
    })();
    setupBar(nav);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
