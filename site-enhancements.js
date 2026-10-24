/* Lost Country RP — migliorie grafiche e navigazione contestuale */
(() => {
  'use strict';

  const roman = (n) => {
    const map = [
      [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
      [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']
    ];
    let out = '';
    for (const [value, symbol] of map) {
      while (n >= value) { out += symbol; n -= value; }
    }
    return out;
  };

  function enhanceSideNavigation() {
    const navs = [...document.querySelectorAll('.lc-sidebar-menu, .western-sidebar .side-nav')];

    navs.forEach((nav) => {
      const links = [...nav.querySelectorAll(':scope > a')];
      links.forEach((link, i) => link.dataset.lcIndex = roman(i + 1));

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

      internal.forEach(({link}) => {
        link.addEventListener('click', () => setCurrent(link));
      });

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
    enhanceSideNavigation();
    formatPenalArticles();
    revealStaticSections();
    decorateMainTitles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();