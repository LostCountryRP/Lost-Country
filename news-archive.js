(() => {
  'use strict';

  const ISSUES = [
    {
      id:'ricercata-ophelia-white',
      type:'avviso',
      typeLabel:'Avviso pubblico',
      paper:'Lost Country',
      title:'Ricercata — Ophelia White',
      dateLabel:'Ultima pubblicazione',
      image:'ARCHIVIO_GIORNALI/01-ricercata-ophelia-white.webp',
      aspect:'300 / 450',
      excerpt:'Manifesto di ricerca per la giovane Ophelia White, 6 anni. Si offre ricompensa per informazioni utili al suo ritrovamento.'
    },
    {
      id:'blackwater-ledger-21-09-1885',
      type:'ledger',
      typeLabel:'The Blackwater Ledger',
      paper:'The Blackwater Ledger',
      title:'Addio al vicesceriffo Simon Riley',
      dateLabel:'21/09/1885',
      image:'ARCHIVIO_GIORNALI/02-ledger-21-09-1885.webp',
      aspect:'300 / 450',
      excerpt:'Blackwater saluta il vicesceriffo Simon Riley. Nello stesso numero: ippodromo, intossicazioni e notizie da Armadillo.'
    },
    {
      id:'blackwater-ledger-18-09-1885',
      type:'ledger',
      typeLabel:'The Blackwater Ledger',
      paper:'The Blackwater Ledger',
      title:'Notizie dalla Contea',
      dateLabel:'18/09/1885',
      image:'ARCHIVIO_GIORNALI/03-ledger-18-09-1885.webp',
      aspect:'300 / 449',
      excerpt:'Aggiornamenti da Armadillo e Blackwater, visita del Governatore Caldwell, incendio nelle Tall Trees e assalti al treno.'
    },
    {
      id:'blackwater-ledger-14-09-1885',
      type:'ledger',
      typeLabel:'The Blackwater Ledger',
      paper:'The Blackwater Ledger',
      title:'Ritrovata la piccola Ofelia',
      dateLabel:'14/09/1885',
      image:'ARCHIVIO_GIORNALI/04-ledger-14-09-1885.webp',
      aspect:'300 / 351',
      excerpt:'La bambina è stata ritrovata sana e salva. Le ricerche proseguono per rintracciare i genitori.'
    },
    {
      id:'blackwater-ledger-12-09-1885',
      type:'ledger',
      typeLabel:'The Blackwater Ledger',
      paper:'The Blackwater Ledger',
      title:'Che fine ha fatto la bambina?',
      dateLabel:'12/09/1885',
      image:'ARCHIVIO_GIORNALI/05-ledger-12-09-1885.webp',
      aspect:'300 / 450',
      excerpt:'Blackwater in ansia per la scomparsa della piccola Ofelia. Gli sceriffi lavorano senza sosta e la città si mobilita.'
    },
    {
      id:'voci-dalle-citta',
      type:'voce',
      typeLabel:'La Voce della Frontiera',
      paper:'La Voce della Frontiera',
      title:'Voci dalle città',
      dateLabel:'Edizione speciale',
      image:'ARCHIVIO_GIORNALI/06-voci-dalle-citta.webp',
      aspect:'300 / 375',
      excerpt:'Cronache economiche da Blackwater e Strawberry e una domanda che corre lungo la frontiera: dov’è il Sindaco?'
    },
    {
      id:'dalla-frontiera',
      type:'voce',
      typeLabel:'La Voce della Frontiera',
      paper:'La Voce della Frontiera',
      title:'Dalla Frontiera',
      dateLabel:'Edizione speciale',
      image:'ARCHIVIO_GIORNALI/07-dalla-frontiera.webp',
      aspect:'300 / 375',
      excerpt:'Una disputa tra gli sceriffi di Strawberry e Blackwater accende la frontiera: la guerra del gilet rosso.'
    },
    {
      id:'voce-frontiera-n1',
      type:'voce',
      typeLabel:'La Voce della Frontiera',
      paper:'La Voce della Frontiera',
      title:'La notizia della settimana — Epidemia',
      dateLabel:'20/08/1885 · N.1',
      image:'ARCHIVIO_GIORNALI/08-voce-frontiera-n1.webp',
      aspect:'300 / 375',
      excerpt:'Il primo numero conservato nell’emeroteca: l’epidemia di Blackwater e l’intervento del reparto medico congiunto.'
    }
  ];

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  let activeFilter = 'all';
  let searchTerm = '';
  let activeIndex = 0;
  let zoom = 1;

  const issueIndex = (id) => ISSUES.findIndex(issue => issue.id === id);

  function imageFallback(img, issue) {
    const frame = img.closest('.news-cover-frame, .news-viewer-paper');
    if (!frame || frame.querySelector('.news-image-missing')) return;
    img.hidden = true;
    const missing = document.createElement('div');
    missing.className = 'news-image-missing';
    missing.innerHTML = '<strong>' + esc(issue.paper) + '</strong><span>' + esc(issue.title) + '</span><small>' + esc(issue.dateLabel) + '</small>';
    frame.appendChild(missing);
  }

  function cover(issue, eager=false) {
    return `
      <div class="news-cover-frame" style="--issue-ratio:${issue.aspect}">
        <img
          src="${issue.image}"
          alt="${esc(issue.title)}"
          ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}
          data-archive-image="${issue.id}">
      </div>`;
  }

  function featuredTemplate(issue) {
    return `
      <article class="news-featured-card">
        <button class="news-cover-button" type="button" data-open-issue="${issue.id}" aria-label="Apri ${esc(issue.title)}">
          ${cover(issue, true)}
        </button>
        <div class="news-featured-copy">
          <div class="news-featured-eyebrow"><span>ULTIMA USCITA</span><span>${esc(issue.typeLabel)}</span></div>
          <h2>${esc(issue.title)}</h2>
          <p class="news-issue-date">${esc(issue.dateLabel)}</p>
          <p>${esc(issue.excerpt)}</p>
          <button class="news-open-btn" type="button" data-open-issue="${issue.id}">Sfoglia il documento</button>
        </div>
      </article>`;
  }

  function cardTemplate(issue) {
    return `
      <article class="news-archive-card" data-type="${issue.type}">
        <button class="news-cover-button" type="button" data-open-issue="${issue.id}" aria-label="Apri ${esc(issue.title)}">
          ${cover(issue)}
        </button>
        <div class="news-card-copy">
          <div class="news-card-meta"><span>${esc(issue.typeLabel)}</span><span>${esc(issue.dateLabel)}</span></div>
          <h3>${esc(issue.title)}</h3>
          <p>${esc(issue.excerpt)}</p>
          <button class="news-open-link" type="button" data-open-issue="${issue.id}">Apri nell’archivio</button>
        </div>
      </article>`;
  }

  function visibleIssues() {
    return ISSUES.filter((issue, index) => {
      if (index === 0) return false;
      const filterOk = activeFilter === 'all' || issue.type === activeFilter;
      const haystack = [issue.title, issue.paper, issue.dateLabel, issue.excerpt, issue.typeLabel].join(' ').toLocaleLowerCase('it');
      const searchOk = !searchTerm || haystack.includes(searchTerm);
      return filterOk && searchOk;
    });
  }

  function bindImageErrors(root=document) {
    $$('img[data-archive-image]', root).forEach(img => {
      const issue = ISSUES.find(x => x.id === img.dataset.archiveImage);
      if (!issue) return;
      img.addEventListener('error', () => imageFallback(img, issue), {once:true});
      if (img.complete && img.naturalWidth === 0) imageFallback(img, issue);
    });
  }

  function renderArchive() {
    const featured = $('#newsFeatured');
    const grid = $('#newsArchiveGrid');
    const count = $('#newsArchiveCount');
    if (!featured || !grid) return;

    featured.innerHTML = featuredTemplate(ISSUES[0]);
    const rows = visibleIssues();
    grid.innerHTML = rows.length
      ? rows.map(cardTemplate).join('')
      : '<div class="news-empty">Nessuna uscita corrisponde ai filtri selezionati.</div>';

    if (count) count.textContent = ISSUES.length + ' documenti conservati';
    bindImageErrors(featured);
    bindImageErrors(grid);
  }

  function setFilter(filter) {
    activeFilter = filter;
    $$('.news-filter-btn').forEach(btn => {
      const active = btn.dataset.filter === filter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    renderArchive();
  }

  function updateViewer() {
    const issue = ISSUES[activeIndex];
    const img = $('#newsViewerImage');
    const title = $('#newsViewerTitle');
    const meta = $('#newsViewerMeta');
    const position = $('#newsViewerPosition');
    if (!issue || !img) return;

    img.hidden = false;
    img.src = issue.image;
    img.alt = issue.title;
    img.dataset.archiveImage = issue.id;
    img.style.transform = 'scale(' + zoom + ')';
    const existing = $('.news-viewer-paper .news-image-missing');
    if (existing) existing.remove();
    img.onerror = () => imageFallback(img, issue);

    title.textContent = issue.title;
    meta.textContent = issue.paper + ' · ' + issue.dateLabel;
    position.textContent = (activeIndex + 1) + ' / ' + ISSUES.length;
    $('#newsZoomValue').textContent = Math.round(zoom * 100) + '%';
  }

  function openViewer(id) {
    const index = issueIndex(id);
    if (index < 0) return;
    activeIndex = index;
    zoom = 1;
    const modal = $('#newsArchiveModal');
    modal.hidden = false;
    document.body.classList.add('news-modal-open');
    updateViewer();
    $('#newsModalClose')?.focus();
  }

  function closeViewer() {
    const modal = $('#newsArchiveModal');
    modal.hidden = true;
    document.body.classList.remove('news-modal-open');
  }

  function moveViewer(step) {
    activeIndex = (activeIndex + step + ISSUES.length) % ISSUES.length;
    zoom = 1;
    updateViewer();
  }

  function changeZoom(delta) {
    zoom = Math.max(.75, Math.min(2.5, Math.round((zoom + delta) * 100) / 100));
    updateViewer();
  }

  function init() {
    renderArchive();

    document.addEventListener('click', e => {
      const opener = e.target.closest('[data-open-issue]');
      if (opener) openViewer(opener.dataset.openIssue);

      const filter = e.target.closest('.news-filter-btn');
      if (filter) setFilter(filter.dataset.filter);

      if (e.target.closest('#newsModalClose') || e.target.matches('[data-news-close]')) closeViewer();
      if (e.target.closest('#newsPrev')) moveViewer(-1);
      if (e.target.closest('#newsNext')) moveViewer(1);
      if (e.target.closest('#newsZoomIn')) changeZoom(.25);
      if (e.target.closest('#newsZoomOut')) changeZoom(-.25);
      if (e.target.closest('#newsZoomReset')) { zoom = 1; updateViewer(); }
    });

    $('#newsArchiveSearch')?.addEventListener('input', e => {
      searchTerm = e.target.value.trim().toLocaleLowerCase('it');
      renderArchive();
    });

    document.addEventListener('keydown', e => {
      const modal = $('#newsArchiveModal');
      if (!modal || modal.hidden) return;
      if (e.key === 'Escape') closeViewer();
      if (e.key === 'ArrowLeft') moveViewer(-1);
      if (e.key === 'ArrowRight') moveViewer(1);
      if (e.key === '+' || e.key === '=') changeZoom(.25);
      if (e.key === '-') changeZoom(-.25);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();