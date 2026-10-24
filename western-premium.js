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
    // The artwork is decorative: the visible action also remains keyboard accessible.
    if(home){
      const explore=document.createElement('a');
      explore.className='lc-hero-action-hit';
      explore.href='#frontierPortalTitle';
      explore.setAttribute('aria-label','Vai alla presentazione di Lost Country RP');
      explore.title='Scopri Lost Country RP';
      banner.append(explore);
    }
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
    // Desktop hides the redundant top menu on the homepage, but all original
    // destinations remain reachable in a compact, keyboard-accessible disclosure.
    if(file==='index.html'){
      const other=document.createElement('details');
      other.className='lc-premium-other-links';
      const label=document.createElement('summary');
      label.textContent='Altre sezioni';
      other.append(label);
      const extra=[
        ['approfondimenti.html','Approfondimenti'],
        ['sceriffi.html','Gestione Sceriffi'],
        ['hosting-immagini.html','Hosting immagini'],
        ['amministrazione.html','Amministrazione']
      ];
      extra.forEach(([url,title])=>{
        const a=document.createElement('a');
        a.href=url;
        a.textContent=title;
        other.append(a);
      });
      details.after(other);
    }
    aside.querySelector('.sidebar-brand')?.after(nav);
    const emblem=document.createElement('div');
    emblem.className='lc-premium-side-emblem';
    emblem.setAttribute('aria-hidden','true');
    aside.append(emblem);
  }


  function refineHomeIcons(){
    const icons={
      'index.html#regole-oro':'<path d="m12 2 3 3.5 4.7-.4-.4 4.7L22 12l-3.7 2.2.4 4.7-4.7-.4L12 22l-2-3.5-4.7.4.4-4.7L2 12l3.7-2.2-.4-4.7 4.7.4z"/><circle cx="12" cy="12" r="3"/>',
      'lore.html':'<path d="M12 6C9 3.5 5.5 4 2.5 5v14c3-.7 6.8.6 9.5 2 2.7-1.4 6.5-2.7 9.5-2V5C18.5 4 15 3.5 12 6z"/><path d="M12 6v15"/>',
      'codice-penale.html':'<path d="M12 3v18M4 7h16M6.2 8 3 15h6.4L6.2 8zm11.6 0-3.2 7H21l-3.2-7zM8 21h8"/>',
      'voce-della-frontiera.html':'<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M7 7h10M7 10h5v6H7zm8 0h3M15 13h3M7 19h11"/>',
      'medico.html':'<path d="M12 2v20M2 12h20M8 7l4 5 4-5M8 17l4-5 4 5"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
      'eventi.html':'<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M7 3v5M17 3v5M3 10h18M8 14h2M13 14h2M8 18h2"/>'
    };
    document.querySelectorAll('.page-home .lc-frontier-link').forEach(link=>{
      const content=icons[link.getAttribute('href')];
      if(!content)return;
      const element=link.querySelector('.lc-frontier-link-icon');
      if(!element)return;
      element.innerHTML='<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">'+content+'</svg>';
    });
  }

  function initializePremium(){
    addMasthead();
    refinePremiumNavigation();
    organizePublicSidebar();
    refineHomeIcons();
    if(document.body.classList.contains('page-home') &&
       document.querySelector('.lc-premium-side-nav') &&
       document.querySelector('.lc-cinematic-banner.is-home')){
      document.body.classList.add('lc-premium-ready');
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializePremium,{once:true});
  else initializePremium();
})();
