/* Lost Country RP: premium masthead — non-destructive and public pages only. */
(() => {
  'use strict';
  const excluded = new Set(['amministrazione.html','admin-sceriffi.html','redazione.html','hosting-immagini.html','ufficio-civico.html']);
  function addMasthead(){
    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    if(excluded.has(file)) return;
    const main=document.querySelector('.site-main');
    if(!main||main.querySelector('.lc-cinematic-banner'))return;
    const banner=document.createElement('header');
    const home=file==='index.html';
    banner.className='lc-cinematic-banner'+(home?' is-home':'');
    banner.setAttribute('aria-label','Lost Country Roleplay');
    const img=document.createElement('img');
    img.className='lc-masthead-logo';
    img.src='logo.png';
    img.alt='Emblema Lost Country RP';
    img.loading=home?'eager':'lazy';
    const heading=document.createElement('h1');
    heading.textContent='Lost Country RP';
    const sub=document.createElement('p');
    sub.textContent='Una nuova frontiera, le tue storie';
    banner.append(img,heading,sub);
    main.prepend(banner);
  }

  // Keep all 11 existing links, but show the six key destinations on one row
  // with the remaining offices in an accessible disclosure on large screens.
  function refinePremiumNavigation(){
    const media=window.matchMedia('(min-width:1251px)');
    document.querySelectorAll('.lc-topbar nav.lc-global-nav, .site-main > .top-nav.lc-global-nav').forEach(nav=>{
      if(nav.dataset.premiumGrouped==='1')return;
      nav.dataset.premiumGrouped='1';
      const links=[...nav.querySelectorAll(':scope > a')];
      if(links.length<8)return;
      const primary=new Set([
        'index.html','lore.html','codice-penale.html',
        'voce-della-frontiera.html','medico.html','eventi.html'
      ]);
      const rerender=()=>{
        nav.replaceChildren(...links);
        nav.classList.remove('lc-premium-grouped');
        if(!media.matches)return;
        const primaryLinks=links.filter(a=>primary.has(a.getAttribute('href')));
        const otherLinks=links.filter(a=>!primary.has(a.getAttribute('href')));
        const details=document.createElement('details');
        details.className='lc-more-menu';
        const summary=document.createElement('summary');
        summary.textContent='Altre sezioni';
        summary.setAttribute('aria-label','Apri altre sezioni del sito');
        if(otherLinks.some(a=>a.hasAttribute('aria-current')))summary.classList.add('is-current');
        const panel=document.createElement('div');
        panel.className='lc-more-panel';
        panel.append(...otherLinks);
        details.append(summary,panel);
        nav.replaceChildren(...primaryLinks,details);
        nav.classList.add('lc-premium-grouped');
      };
      rerender();
      if(media.addEventListener)media.addEventListener('change',rerender);
      else media.addListener(rerender);
    });
    document.addEventListener('click',event=>{
      document.querySelectorAll('.lc-more-menu[open]').forEach(details=>{
        if(!details.contains(event.target))details.removeAttribute('open');
      });
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape')document.querySelectorAll('.lc-more-menu[open]').forEach(d=>d.removeAttribute('open'));
    });
  }

  
  /* V3 - accessible public sidebar / real destinations */
  function organizePublicSidebar(){
    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    const eligible=new Set(['index.html','approfondimenti.html','codice-penale.html','lore.html','voce-della-frontiera.html','attivita-commerciali.html','eventi.html']);
    if(!eligible.has(file))return;
    const aside=document.querySelector('.western-sidebar');
    const localNav=aside?.querySelector('.side-nav');
    if(!aside||!localNav||aside.querySelector('.lc-premium-side-nav'))return;
    const sections=[
      ['index.html','HOME','⌂'],
      ['index.html#regole-oro','REGOLAMENTO','✦'],
      ['lore.html','LORE','▤'],
      ['codice-penale.html','CODICE PENALE','⚖'],
      ['voce-della-frontiera.html','LA VOCE DELLA FRONTIERA','▣'],
      ['medico.html','REGISTRO MEDICO','✚'],
      ['eventi.html','EVENTI','▦'],
      ['attivita-commerciali.html','ATTIVITÀ COMMERCIALI','♜']
    ];
    const nav=document.createElement('nav');
    nav.className='lc-premium-side-nav';
    nav.setAttribute('aria-label','Sezioni principali di Lost Country');
    sections.forEach(([url,title,symbol])=>{
      const a=document.createElement('a');
      a.href=url;
      const ico=document.createElement('span');
      ico.className='lc-premium-side-icon';
      ico.textContent=symbol;
      ico.setAttribute('aria-hidden','true');
      const lab=document.createElement('span');
      lab.textContent=title;
      a.append(ico,lab);
      const target=url.split('#')[0];
      if(file===target&&(file!=='index.html'||url==='index.html')){
        a.classList.add('is-active');
        a.setAttribute('aria-current','page');
      }
      nav.append(a);
    });
    const details=document.createElement('details');
    details.className='lc-premium-page-index';
    const summary=document.createElement('summary');
    summary.textContent='Indice della pagina';
    summary.setAttribute('aria-label','Mostra i collegamenti interni alla pagina');
    localNav.before(details);
    details.append(summary,localNav);
    aside.querySelector('.sidebar-brand')?.after(nav);
    const emblem=document.createElement('div');
    emblem.className='lc-premium-side-emblem';
    emblem.setAttribute('aria-hidden','true');
    aside.append(emblem);
  }

  function initializePremium(){addMasthead();refinePremiumNavigation();organizePublicSidebar();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializePremium,{once:true});
  else initializePremium();
})();
