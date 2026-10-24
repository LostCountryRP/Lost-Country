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

  function initializePremium(){addMasthead();refinePremiumNavigation();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializePremium,{once:true});
  else initializePremium();
})();
