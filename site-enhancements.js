/* Lost Country RP — navigazione contestuale + set icone SVG western */
(() => {
  'use strict';

  const svg = (body, cls='') =>
    `<svg class="lc-svg-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

  const ICONS = {
    star: svg('<path d="M12 2.5l2.35 5.05 5.5.65-4.05 3.75 1.08 5.43L12 14.65 7.12 17.38 8.2 11.95 4.15 8.2l5.5-.65L12 2.5z"/><circle cx="12" cy="11" r="1.15"/>'),
    target: svg('<circle cx="12" cy="12" r="8.3"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.25"/><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3"/>'),
    badge: svg('<path d="M12 2.8l2.1 2.05 2.92-.48.5 2.9 2.65 1.3-1.32 2.65 1.32 2.65-2.65 1.3-.5 2.9-2.92-.48L12 21.2l-2.1-2.05-2.92.48-.5-2.9-2.65-1.3 1.32-2.65-1.32-2.65 2.65-1.3.5-2.9 2.92.48L12 2.8z"/>'),
    hat: svg('<path d="M7 13.5c.7-4.7 2.1-7 5-7s4.3 2.3 5 7"/><path d="M4 13.4c2.4 1.2 5 1.8 8 1.8s5.6-.6 8-1.8c-.3 2.9-3.1 4.4-8 4.4s-7.7-1.5-8-4.4z"/><path d="M8 11.7h8"/>'),
    money: svg('<path d="M9 4.2h6l-1.2 2.4c3.5 1.3 5.2 4 5.2 7.4 0 4.2-2.8 6.8-7 6.8s-7-2.6-7-6.8c0-3.4 1.7-6.1 5.2-7.4L9 4.2z"/><path d="M9.5 13.3c.8.7 1.6 1 2.7 1 1.3 0 2.1-.6 2.1-1.4 0-2.2-4.6-1-4.6-3.3 0-1 .9-1.8 2.3-1.8 1 0 1.8.3 2.4.8M12 7v8.6"/>'),
    revolver: svg('<path d="M4 9h10.8l2.1 2.4-2.2 2.2H11l-1.1 5.1H7.2l.2-5.1H4z"/><path d="M14.5 9V6.8H21V9z"/><circle cx="11.8" cy="11.3" r="1.8"/><path d="M7.4 13.6l-2 3.2"/>'),
    feather: svg('<path d="M19.5 3.2C13.8 3.4 8 7.3 6.2 13.4c-.7 2.4-.8 4.5-.7 6.1"/><path d="M6.1 16.2c3.4-.5 6.4-2.5 8.6-5.1 2.3-2.6 3.8-5.6 4.8-7.9"/><path d="M8 12.8l4.2.2M10.3 9.4l4 .2M6.6 16l3.1.2"/>'),
    mail: svg('<rect x="3" y="5.3" width="18" height="13.4" rx="1"/><path d="M4 6.5l8 6.1 8-6.1"/>'),
    alert: svg('<path d="M12 3l9 17H3L12 3z"/><path d="M12 8v5.2"/><circle cx="12" cy="16.8" r=".7" fill="currentColor" stroke="none"/>'),
    house: svg('<path d="M3.3 11.4L12 4l8.7 7.4"/><path d="M5.5 10.3V20h13v-9.7M9.5 20v-5.8h5V20"/>'),
    scales: svg('<path d="M12 3v17M7 5h10M5.8 7.2L3 13h5.6L5.8 7.2zM18.2 7.2L15.4 13H21l-2.8-5.8z"/><path d="M8.7 20h6.6"/>'),
    handshake: svg('<path d="M3 10.2l4-3.3 3 1.2 2.2-1.1 3.2 1.2L21 12.4l-3.3 3-2.1-.8-2.4 2.2-2.2-1-2.2 1-2-1.9-2 .3L3 10.2z"/><path d="M9.5 9.1l2.1 1.7c.7.6 1.7.5 2.3-.2l.8-.9M8.8 14.8l1.5-1.5M11 15.8l1.4-1.4M13.2 16.8l1.3-1.3"/>'),
    store: svg('<path d="M4 8h16l-1.1-4H5.1L4 8z"/><path d="M5 8v12h14V8M8 20v-6h5v6M15.5 11.5h2"/><path d="M4 8c.4 1.5 1.4 2.2 2.7 2.2S9 9.5 9.4 8c.4 1.5 1.3 2.2 2.6 2.2s2.2-.7 2.6-2.2c.4 1.5 1.4 2.2 2.7 2.2S19.6 9.5 20 8"/>'),
    horseshoe: svg('<path d="M6 4v7.3c0 4.2 2.3 7.2 6 7.2s6-3 6-7.2V4h-3v7.2c0 2.5-1 4.1-3 4.1s-3-1.6-3-4.1V4H6z"/><path d="M6 7h3M15 7h3"/>'),
    eye: svg('<path d="M2.5 12s3.5-5.2 9.5-5.2 9.5 5.2 9.5 5.2-3.5 5.2-9.5 5.2S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.3"/>'),
    skull: svg('<path d="M6 10.2c0-4 2.5-6.5 6-6.5s6 2.5 6 6.5c0 2.7-1.1 4.8-3 5.8v3H9v-3c-1.9-1-3-3.1-3-5.8z"/><circle cx="9.5" cy="10.8" r="1.2"/><circle cx="14.5" cy="10.8" r="1.2"/><path d="M12 13l-1 1.5h2L12 13zM10 18v2M12 18v2M14 18v2"/>'),
    file: svg('<path d="M6 3h8l4 4v14H6V3z"/><path d="M14 3v5h5M9 12h6M9 15h6M9 18h4"/>'),
    support: svg('<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="3.5"/><path d="M6.2 6.2l3.3 3.3M17.8 6.2l-3.3 3.3M6.2 17.8l3.3-3.3M17.8 17.8l-3.3-3.3"/>'),
    book: svg('<path d="M3.5 5.2c3-.9 5.7-.4 8.5 1.4v12.2c-2.8-1.8-5.5-2.3-8.5-1.4V5.2zM20.5 5.2c-3-.9-5.7-.4-8.5 1.4v12.2c2.8-1.8 5.5-2.3 8.5-1.4V5.2z"/>'),
    seal: svg('<circle cx="12" cy="9.5" r="5.2"/><path d="M8.8 13.6L7.4 21l4.6-2.6 4.6 2.6-1.4-7.4"/><circle cx="12" cy="9.5" r="2.1"/>'),
    chest: svg('<path d="M4 9.2h16V20H4V9.2z"/><path d="M5 9.2c.4-3.3 2.8-5.2 7-5.2s6.6 1.9 7 5.2M12 9.2V20M9.5 13.4h5"/>'),
    gavel: svg('<path d="M7 6l4 4M10 3l5 5-3 3-5-5 3-3zM13 11l7 7M4 20h9"/>'),
    burst: svg('<path d="M12 2l1.6 5 4.6-2.5-2 4.8L21 11l-4.8 1.7 2 4.8-4.6-2.5L12 20l-1.6-5-4.6 2.5 2-4.8L3 11l4.8-1.7-2-4.8L10.4 7 12 2z"/>'),
    scroll: svg('<path d="M7 4h10a2 2 0 010 4H9v11a2 2 0 11-4 0V7a3 3 0 013-3z"/><path d="M9 8h8v9a3 3 0 01-3 3H7"/>'),
    id: svg('<rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.5 16c.7-1.8 1.7-2.7 3-2.7s2.3.9 3 2.7M14 9h4M14 12h4M14 15h3"/>'),
    wanted: svg('<rect x="5" y="3" width="14" height="18"/><path d="M8 7h8M9 11c.7-1.6 1.7-2.4 3-2.4s2.3.8 3 2.4"/><circle cx="12" cy="13.5" r="2.4"/><path d="M9.5 18h5"/>'),
    map: svg('<path d="M3.5 5.5l5-2 7 2.5 5-2v14.5l-5 2-7-2.5-5 2V5.5z"/><path d="M8.5 3.5V18M15.5 6v14.5M11 11l2-2 2 2"/>'),
    newspaper: svg('<rect x="4" y="3.5" width="16" height="17"/><path d="M7 7h10M7 10h4v5H7zM13 10h4M13 13h4M7 18h10"/>'),
    calendar: svg('<rect x="4" y="5.5" width="16" height="14.5" rx="1"/><path d="M8 3v4M16 3v4M4 9h16M8 12h2M12 12h2M16 12h1M8 16h2M12 16h2"/>'),
    gear: svg('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/><circle cx="12" cy="12" r="7"/>')
  };

  const textOf = (el) => (el?.textContent || '').replace(/\s+/g,' ').trim();

  function iconKeyFor(text, context='') {
    const t = String(text || '').toLocaleLowerCase('it');
    const c = String(context || '').toLocaleLowerCase('it');

    if (/regole d.?oro/.test(t)) return 'star';
    if (/ingaggio|faida|scontro/.test(t)) return 'target';
    if (/numeri|partecipanti/.test(t)) return 'badge';
    if (/bande|gruppi|criminale/.test(t)) return 'hat';
    if (/bottino/.test(t)) return 'money';
    if (/rapine|rapina/.test(t)) return c.includes('home') ? 'revolver' : 'money';
    if (/nativi|nativo/.test(t)) return 'feather';
    if (/postale|missive/.test(t)) return 'mail';

    if (/bolla|bug|malfunzion|camperaggio|bait|revenge/.test(t)) return 'alert';
    if (/propriet/.test(t)) return 'house';
    if (/legge.*civili|ordine pubblico/.test(t)) return 'scales';
    if (/fair play/.test(t)) return 'handshake';
    if (/uomini di legge|accesso|federal/.test(t)) return 'star';
    if (/banditi dalla città|bando cittadino|bandit/.test(t)) return 'alert';
    if (/prove|sequestri/.test(t)) return 'chest';
    if (/attivit|commercial/.test(t)) return 'store';
    if (/cavall/.test(t)) return 'horseshoe';
    if (/riconosc/.test(t)) return 'eye';
    if (/permadeath|morte/.test(t)) return 'skull';
    if (/file|integrit|verbale/.test(t)) return 'file';
    if (/assistenza|support|ferite|svenimenti|medici|neutralit/.test(t)) return 'support';
    if (/clip|convalid/.test(t)) return 'file';
    if (/zone safe|zone rosse/.test(t)) return 'badge';
    if (/sciacall/.test(t)) return 'chest';

    if (/disposizioni generali|disposizioni|preambolo/.test(t)) return 'book';
    if (/reati minori/.test(t)) return 'seal';
    if (/patrimonio/.test(t)) return 'chest';
    if (/delitti/.test(t)) return 'gavel';
    if (/aggravanti/.test(t)) return 'burst';
    if (/finali/.test(t)) return 'scroll';

    if (/fedina|scheda/.test(t)) return 'id';
    if (/ricercati|wanted/.test(t)) return 'wanted';
    if (/licenz/.test(t)) return 'seal';
    if (/registro cittadini|registro/.test(t)) return 'book';
    if (/armi|arma/.test(t)) return 'revolver';
    if (/frontiera|mappa/.test(t)) return 'map';

    if (/approfondimenti/.test(t)) return 'book';
    if (/codice penale/.test(t)) return 'scales';
    if (/ufficio dello sceriffo|gestione sceriffi/.test(t)) return 'star';
    if (/gestione account/.test(t)) return 'gear';
    if (/voce della frontiera|giornale|gazzetta/.test(t)) return 'newspaper';
    if (/event/.test(t)) return 'calendar';
    if (/lore|libro lore/.test(t)) return 'book';
    if (/admin|gestione account/.test(t)) return 'gear';

    return 'star';
  }

  function makeIcon(key, cls='') {
    const wrap = document.createElement('span');
    wrap.className = 'lc-icon ' + cls;
    wrap.dataset.icon = key;
    wrap.setAttribute('aria-hidden','true');
    wrap.innerHTML = ICONS[key] || ICONS.star;
    return wrap;
  }

  function stripLeadingEmoji(text) {
    return String(text || '')
      .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu,'')
      .replace(/^\s*[•·✦★☆◆◇◈◉○●▣§†+$✓⚖]+\s*/u,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  const roman = (n) => {
    const map = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
    let out = '';
    for (const [value, symbol] of map) while (n >= value) { out += symbol; n -= value; }
    return out;
  };

  function applySvgToSideLink(link) {
    const label = stripLeadingEmoji(textOf(link.querySelector('.side-text') || link.querySelector('span:last-child') || link));
    const context = document.body.className;
    const key = iconKeyFor(label, context);

    let icon = link.querySelector('.side-icon, .lc-nav-icon');
    if (!icon) {
      icon = document.createElement('span');
      icon.className = 'lc-nav-icon';
      link.prepend(icon);
    }
    icon.classList.add('lc-nav-icon');
    icon.textContent = '';
    icon.appendChild(makeIcon(key, 'lc-icon-sidebar'));

    if (link.classList.contains('lc-side-btn')) {
      const textNodes = [...link.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
      if (textNodes.length) {
        const txt = document.createElement('span');
        txt.className = 'lc-side-label';
        txt.textContent = label;
        textNodes.forEach(n => n.remove());
        link.appendChild(txt);
      }
    }
  }

  function normalizeTopNavigation() {
    const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    const entries=[
      ['index.html','Regolamento'],
      ['approfondimenti.html','Approfondimenti'],
      ['codice-penale.html','Codice Penale'],
      ['lore.html','Lore'],
      ['sceriffi.html','Gestione Sceriffi'],
      ['voce-della-frontiera.html','La Voce della Frontiera'],
      ['attivita-commerciali.html','Attività commerciali'],
      ['eventi.html','Eventi']
    ];
    const activeFor=(href)=>{
      if(file==='admin-sceriffi.html') return href==='sceriffi.html';
      return file===href;
    };
    const navs=[...document.querySelectorAll('.lc-topbar nav, .site-main > .top-nav')];
    navs.forEach(nav=>{
      nav.classList.add('lc-global-nav');
      nav.replaceChildren(...entries.map(([href,label])=>{
        const a=document.createElement('a');
        a.href=href;
        a.textContent=label;
        if(activeFor(href)){
          a.classList.add(nav.matches('.top-nav')?'active-page':'active');
          a.setAttribute('aria-current','page');
        }
        return a;
      }));
    });
  }

  function enhanceMainTitles() {
    document.querySelectorAll('.main-title, .app-title').forEach(title=>{
      if(title.closest('.page-home .hero')) return;
      if(title.dataset.lcMainIcon==='1') return;
      const clean=stripLeadingEmoji(textOf(title));
      if(!clean) return;
      const key=iconKeyFor(clean,document.body.className);
      title.textContent='';
      title.classList.add('lc-main-title-with-icon');
      title.append(makeIcon(key,'lc-icon-main'));
      const label=document.createElement('span');
      label.className='lc-main-title-text';
      label.textContent=clean;
      title.append(label);
      title.dataset.lcMainIcon='1';
      title.setAttribute('aria-label',clean);
    });
  }

  function enhancePenalBadges() {
    document.querySelectorAll('.page-penale .sanctions .badge').forEach(badge=>{
      if(badge.dataset.lcSvgReady==='1') return;
      const clean=stripLeadingEmoji(textOf(badge));
      let key='seal';
      if(badge.classList.contains('fine')) key='money';
      else if(badge.classList.contains('jail')) key='gavel';
      else if(badge.classList.contains('no-jail')) key='badge';
      else if(badge.classList.contains('capital')) key='scales';
      badge.textContent='';
      badge.classList.add('lc-badge-with-icon');
      badge.append(makeIcon(key,'lc-icon-badge'));
      const span=document.createElement('span');
      span.textContent=clean;
      badge.append(span);
      badge.dataset.lcSvgReady='1';
    });
  }

  function enhanceSideNavigation() {
    const navs = [...document.querySelectorAll('.lc-sidebar-menu, .western-sidebar .side-nav')];

    navs.forEach((nav) => {
      const links = [...nav.querySelectorAll(':scope > a')];
      links.forEach((link, i) => {
        link.dataset.lcIndex = roman(i + 1);
        applySvgToSideLink(link);
      });

      const internal = links
        .map(link => {
          const href = link.getAttribute('href') || '';
          if (!href.startsWith('#') || href.length < 2) return null;
          const target = document.getElementById(href.slice(1));
          return target ? {link, target} : null;
        })
        .filter(Boolean);

      if (!internal.length) return;

      const setCurrent = (link) => {
        links.forEach(a => {
          const active = a === link;
          a.classList.toggle('is-current', active);
          if (active) a.setAttribute('aria-current', 'location');
          else if (a.getAttribute('aria-current') === 'location') a.removeAttribute('aria-current');
        });
      };

      internal.forEach(({link}) => link.addEventListener('click', () => setCurrent(link)));

      let ticking = false;
      const update = () => {
        ticking = false;
        const line = Math.max(120, window.innerHeight * .32);
        const visible = internal.filter(({target}) => {
          const style = getComputedStyle(target);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        if (!visible.length) return;

        let best = visible[0];
        for (const item of visible) {
          const rect = item.target.getBoundingClientRect();
          if (rect.top <= line && rect.bottom > 80) best = item;
        }
        setCurrent(best.link);
      };

      const onScroll = () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      };

      addEventListener('scroll', onScroll, {passive:true});
      addEventListener('resize', onScroll, {passive:true});
      setTimeout(update, 40);
    });
  }

  function enhanceSectionHeadings() {
    const selectors = [
      '.page-home .rule-section > h2',
      '.page-home .rule-section > h3',
      '.page-approfondimenti .deep-dive-section > h2',
      '.page-penale .law-section > h2',
      '.page-sceriffi .app-card > h2',
      '.page-sceriffi .auth-card > h2',
      '.page-admin .admin-card > h2'
    ];

    document.querySelectorAll(selectors.join(',')).forEach((heading) => {
      if (heading.dataset.lcSvgReady === '1') return;
      const original = textOf(heading);
      const clean = stripLeadingEmoji(original);
      if (!clean) return;
      const key = iconKeyFor(clean, document.body.className);

      heading.textContent = '';
      heading.classList.add('lc-section-heading');
      heading.append(makeIcon(key, 'lc-icon-section'));
      const label = document.createElement('span');
      label.className = 'lc-section-heading-text';
      label.textContent = clean;
      heading.append(label);
      heading.dataset.lcSvgReady = '1';
      heading.setAttribute('aria-label', clean);
    });
  }

  function formatPenalArticles() {
    document.querySelectorAll('.page-penale .law-card h3').forEach((heading) => {
      const text = heading.textContent.trim();
      const match = text.match(/^Art\.\s*(\d+)\s*[—-]\s*(.+)$/i);
      if (!match) return;

      heading.textContent = '';
      const number = document.createElement('span');
      number.className = 'law-article-number';
      number.textContent = 'ART. ' + match[1];

      const title = document.createElement('span');
      title.className = 'law-article-title';
      title.textContent = match[2];

      heading.append(number, title);
      heading.setAttribute('aria-label', text);
    });
  }

  function revealStaticSections() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const selector = [
      '.page-home .rule-section > h2',
      '.page-home .rule-section > h3',
      '.page-approfondimenti .deep-dive-section',
      '.page-penale .law-card',
      '.page-sceriffi .app-card',
      '.page-admin .admin-card'
    ].join(',');

    const nodes = [...document.querySelectorAll(selector)];
    if (!nodes.length || !('IntersectionObserver' in window)) return;

    nodes.forEach(node => node.classList.add('lc-reveal'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('lc-visible');
        observer.unobserve(entry.target);
      });
    }, {rootMargin:'0px 0px -7% 0px', threshold:.05});

    nodes.forEach(node => observer.observe(node));
  }

  function decorateMainTitles() {
    document.querySelectorAll('.main-title, .app-title, .hero-subtitle').forEach((title) => {
      title.classList.add('lc-ornamented-title');
    });
  }

  function init() {
    document.documentElement.classList.add('lc-enhanced');
    normalizeTopNavigation();
    enhanceSideNavigation();
    enhanceSectionHeadings();
    enhanceMainTitles();
    formatPenalArticles();
    enhancePenalBadges();
    revealStaticSections();
    decorateMainTitles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();