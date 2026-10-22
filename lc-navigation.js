/* Lost Country: navigazione unica, link di pagina preservati */
(() => {
  'use strict';
  const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const page=file.includes('admin-sceriffi')?'admin':file.includes('sceriffi')?'sheriff':file.includes('approfondimenti')?'approfondimenti':file.includes('codice-penale')||file.includes('codice_penale')||file.includes('penale')?'penale':'home';
  const TOP=[['index.html','Regolamento'],['approfondimenti.html','Approfondimenti'],['codice-penale.html','Codice Penale'],['sceriffi.html','Ufficio Sceriffo']];
  const side={
    sheriff:[['#loginPanel','Accesso Sceriffi','★'],['#newCaseTab','Nuovo Verbale','✎'],['#fedinaTab','Fedine Penali','▤'],['#wantedTab','Bacheca Ricercati','☠'],['codice-penale.html','Codice Penale','§']],
    admin:[['sceriffi.html','Torna allo Sceriffo','↶'],['#create-sheriff','Crea Account','✚'],['#accounts-list','Account Esistenti','▤']],
  };
  const iconFor=(s,i)=>{
    const t=s.toLowerCase();
    if(/oro|regol/.test(t))return '★';if(/ingaggio|duell/.test(t))return '⚔';if(/band|cappell/.test(t))return '♠';
    if(/numeri|person/.test(t))return '♟';if(/bottino|econom|denaro/.test(t))return '$';if(/rapin|tren/.test(t))return '♜';
    if(/nativ/.test(t))return '❧';if(/post|messagg/.test(t))return '✉';if(/reat|pena|sanzion/.test(t))return '§';
    return ['★','❖','✦','▤','§'][i%5];
  };
  function setLink(a,label,icon){
    a.classList.add('lc-nav-btn');
    let ic=a.querySelector('.side-icon');
    if(!ic){ic=document.createElement('span');ic.className='side-icon';a.prepend(ic)}
    ic.textContent=icon;
    let txt=a.querySelector('.side-text');
    if(!txt){txt=document.createElement('span');txt.className='side-text';const existing=[...a.childNodes].filter(n=>n!==ic);existing.forEach(n=>n.remove());a.append(txt)}
    txt.textContent=label;
    a.setAttribute('aria-label',label);
  }
  function apply(){
    const brand=document.querySelector('.western-sidebar .sidebar-brand');
    if(brand){let img=brand.querySelector('img');if(!img){img=document.createElement('img');brand.prepend(img)}img.src='lc-logo-ufficiale.png';img.alt='Lost Country RP';}
    const nav=document.querySelector('.western-sidebar .side-nav');
    if(nav){
      const links=[...nav.querySelectorAll(':scope > a')];
      if(side[page]){
        const configured=side[page];
        const usable=configured.filter(([href])=>href[0]!=='#'||!!document.getElementById(href.slice(1)));
        nav.replaceChildren(...usable.map(([href,label,icon])=>{const a=links.find(x=>x.getAttribute('href')===href)||document.createElement('a');a.href=href;setLink(a,label,icon);return a}));
      }else{
        /* Indici originali delle pagine: salvaguardiamo href/#id reali. */
        const homeLabels=['Regole d’oro','Regole d’ingaggio','Numero partecipanti','Bande e gruppi','Bottino','Rapine','Nativi','Servizio postale'];
        links.forEach((a,i)=>{
          const old=(a.textContent||'').trim().replace(/\s+/g,' ');
          const target=a.getAttribute('href')||'';
          const id=target.startsWith('#')?document.getElementById(target.slice(1)):null;
          const h=id?.querySelector('h1,h2,h3')||(id?.matches('h1,h2,h3')?id:null);
          const label=(page==='home'&&links.length===8)?homeLabels[i]:(old||h?.textContent?.trim()||`Sezione ${i+1}`);
          setLink(a,label,iconFor(label,i));
        });
      }
    }
    const top=document.querySelector('.site-main > .top-nav');
    if(top){
      const entries=page==='admin'?[...TOP,['admin-sceriffi.html','Account Sceriffi']]:TOP;
      top.replaceChildren(...entries.map(([href,label])=>{
        const a=document.createElement('a');a.href=href;a.textContent=label;
        if((page==='home'&&href==='index.html')||(page==='approfondimenti'&&href==='approfondimenti.html')||(page==='penale'&&href==='codice-penale.html')||(page==='sheriff'&&href==='sceriffi.html')||(page==='admin'&&href==='admin-sceriffi.html')){a.className='active-page';a.setAttribute('aria-current','page')}
        return a;
      }));
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
