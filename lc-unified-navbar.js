/* Lost Country RP — barra grafica unica e SCORREVOLE, 25/10/2026.
 * Le pagine reali mantengono sidebar, moduli e permessi: cambia solo l'intestazione.
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
  const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  function makeLink(href,label) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    if (current === href) {
      a.classList.add('active-page');
      a.setAttribute('aria-current','page');
    }
    return a;
  }
  function makeArrow(symbol,label,offset,viewport) {
    const button = document.createElement('button');
    button.type='button';
    button.className='lc-nav-arrow';
    button.textContent=symbol;
    button.setAttribute('aria-label',label);
    button.title=label;
    button.addEventListener('click',() => viewport.scrollBy({left:offset,behavior:'smooth'}));
    return button;
  }
  function setupBar(nav) {
    if (nav.dataset.lcUnified === '2') return;
    nav.dataset.lcUnified='2';
    nav.classList.add('lc-site-nav');
    nav.setAttribute('aria-label','Navigazione principale Lost Country');

    const viewport=document.createElement('div');
    viewport.className='lc-nav-viewport';
    viewport.tabIndex=0;
    viewport.setAttribute('role','region');
    viewport.setAttribute('aria-label','Categorie: usa le frecce o scorri orizzontalmente');
    const track=document.createElement('div');
    track.className='lc-nav-track';
    MAIN.forEach(([href,label])=>track.append(makeLink(href,label)));
    viewport.append(track);
    const back=makeArrow('‹','Scorri le categorie a sinistra',-290,viewport);
    const forward=makeArrow('›','Scorri le categorie a destra',290,viewport);

    const more=document.createElement('details');
    more.className='lc-home-more lc-site-more';
    const summary=document.createElement('summary');
    summary.textContent='Altre sezioni';
    summary.setAttribute('aria-label','Apri le altre sezioni');
    const panel=document.createElement('div');
    panel.className='lc-home-more-menu lc-site-more-menu';
    EXTRA.forEach(([href,label])=>panel.append(makeLink(href,label)));
    more.append(summary,panel);
    nav.replaceChildren(back,viewport,forward,more);

    const update=()=>{
      const max=viewport.scrollWidth-viewport.clientWidth;
      const canScroll=max>4;
      back.hidden=!canScroll;
      forward.hidden=!canScroll;
      back.disabled=!canScroll||viewport.scrollLeft<=2;
      forward.disabled=!canScroll||viewport.scrollLeft>=max-2;
      viewport.dataset.scrollable=canScroll?'true':'false';
    };
    viewport.addEventListener('scroll',update,{passive:true});
    // Mouse wheel: when hovering the bar, let the categories slide horizontally.
    viewport.addEventListener('wheel',e=>{
      if(e.ctrlKey||e.metaKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
      const amount=e.deltaY;
      const max=viewport.scrollWidth-viewport.clientWidth;
      const next=viewport.scrollLeft+amount;
      if(max>4 && ((amount>0&&viewport.scrollLeft<max-2)||(amount<0&&viewport.scrollLeft>2))){
        e.preventDefault();
        viewport.scrollLeft=Math.max(0,Math.min(max,next));
      }
    },{passive:false});
    if(typeof ResizeObserver!=='undefined'){
      const observer=new ResizeObserver(update);
      observer.observe(viewport);
      observer.observe(track);
    }else window.addEventListener('resize',update,{passive:true});
    requestAnimationFrame(update);
    setTimeout(update,200);

    more.addEventListener('toggle',()=>{
      summary.setAttribute('aria-expanded',String(more.open));
    });
    document.addEventListener('click',e=>{
      if(more.open&&!more.contains(e.target))more.open=false;
    });
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&more.open)more.open=false;
    });
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
