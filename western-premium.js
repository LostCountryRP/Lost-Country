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
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addMasthead,{once:true});
  else addMasthead();
})();
