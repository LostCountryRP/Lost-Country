(() => {
  'use strict';

  const spreads = [
    'LORE/IL_MIETITORE_DI_SANGUE/pages/01_copertina.webp',
    'LORE/IL_MIETITORE_DI_SANGUE/pages/02_pagina.webp',
    'LORE/IL_MIETITORE_DI_SANGUE/pages/03_pagina.webp',
    'LORE/IL_MIETITORE_DI_SANGUE/pages/04_pagina.webp',
    'LORE/IL_MIETITORE_DI_SANGUE/pages/05_pagina.webp',
    'LORE/IL_MIETITORE_DI_SANGUE/pages/06_pagina.webp',
    'LORE/IL_MIETITORE_DI_SANGUE/pages/07_pagina.webp',
    'LORE/IL_MIETITORE_DI_SANGUE/pages/08_epilogo.webp'
  ];

  const leftPage = document.getElementById('leftPage');
  const rightPage = document.getElementById('rightPage');
  const turnLeaf = document.getElementById('turnLeaf');
  const leafFront = document.getElementById('leafFront');
  const leafBack = document.getElementById('leafBack');
  const prev = document.getElementById('prevPage');
  const next = document.getElementById('nextPage');
  const first = document.getElementById('firstPage');
  const last = document.getElementById('lastPage');
  const counter = document.getElementById('pageCounter');
  const dots = document.getElementById('pageDots');
  const book = document.getElementById('flipbook');

  if (!book) return;

  const frontCover = document.createElement('div');
  frontCover.className = 'book-cover book-front-cover';
  frontCover.setAttribute('aria-hidden','true');
  frontCover.innerHTML = '<div class="cover-image spread-crop spread-right"><img src="' + spreads[0] + '" alt=""></div>';
  book.appendChild(frontCover);

  const backCover = document.createElement('div');
  backCover.className = 'book-cover book-back-cover';
  backCover.setAttribute('aria-hidden','true');
  backCover.innerHTML = '<div class="back-cover-inner"><span class="back-cover-mark">☠</span><strong>LOST COUNTRY</strong><small>CRONACHE DELLA FRONTIERA · 1885</small></div>';
  book.appendChild(backCover);

  const FLIP_MS = 560;
  const COVER_MS = 720;
  let index = 0;
  let view = 'front';
  let animating = false;
  let touchStartX = 0;

  spreads.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  const dotButtons = spreads.map((_, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'flipbook-dot';
    button.setAttribute('aria-label', 'Vai all\'apertura ' + (i + 1));
    button.addEventListener('click', () => goTo(i));
    dots.appendChild(button);
    return button;
  });

  function pageRange(i) {
    const firstPageNumber = (i * 2) + 1;
    return `Pagine ${firstPageNumber}–${firstPageNumber + 1} / ${spreads.length * 2}`;
  }

  function setSpread(i) {
    leftPage.src = spreads[i];
    rightPage.src = spreads[i];
  }

  function clearCoverClasses() {
    book.classList.remove(
      'cover-front-state','cover-back-state',
      'cover-opening-front','cover-closing-front',
      'cover-opening-back','cover-closing-back'
    );
  }

  function syncUi() {
    clearCoverClasses();

    if (view === 'front') {
      book.classList.add('cover-front-state');
      counter.textContent = 'Copertina';
      prev.disabled = true;
      next.disabled = false;
      first.disabled = true;
      last.disabled = false;
      dotButtons.forEach(dot => dot.classList.remove('active'));
      return;
    }

    if (view === 'back') {
      book.classList.add('cover-back-state');
      counter.textContent = 'Retrocopertina';
      prev.disabled = false;
      next.disabled = true;
      first.disabled = false;
      last.disabled = true;
      dotButtons.forEach(dot => dot.classList.remove('active'));
      return;
    }

    setSpread(index);
    counter.textContent = pageRange(index);
    prev.disabled = false;
    next.disabled = false;
    first.disabled = false;
    last.disabled = false;
    dotButtons.forEach((dot, i) => dot.classList.toggle('active', i === index));
  }

  function resetLeaf() {
    turnLeaf.className = 'book-leaf';
    turnLeaf.style.visibility = '';
    leafFront.src = '';
    leafBack.src = '';
  }

  function finishSpread(target) {
    index = target;
    view = 'spread';
    setSpread(index);
    resetLeaf();
    animating = false;
    syncUi();
  }

  function animateTo(target, direction) {
    if (animating || target === index || target < 0 || target >= spreads.length) return;
    animating = true;

    if (direction === 'next') {
      leftPage.src = spreads[target];
      rightPage.src = spreads[target];
      leafFront.src = spreads[index];
      leafBack.src = spreads[target];
      turnLeaf.className = 'book-leaf flip-next';
    } else {
      leftPage.src = spreads[target];
      rightPage.src = spreads[target];
      leafFront.src = spreads[target];
      leafBack.src = spreads[index];
      turnLeaf.className = 'book-leaf flip-prev';
    }

    turnLeaf.style.visibility = 'visible';
    window.setTimeout(() => finishSpread(target), FLIP_MS);
  }

  function openFront(target = 0) {
    if (animating) return;
    animating = true;
    index = Math.max(0, Math.min(spreads.length - 1, target));
    setSpread(index);
    clearCoverClasses();
    book.classList.add('cover-opening-front');
    window.setTimeout(() => {
      view = 'spread';
      animating = false;
      syncUi();
    }, COVER_MS);
  }

  function closeFront() {
    if (animating) return;
    animating = true;
    clearCoverClasses();
    book.classList.add('cover-closing-front');
    window.setTimeout(() => {
      view = 'front';
      animating = false;
      syncUi();
    }, COVER_MS);
  }

  function closeBack() {
    if (animating) return;
    animating = true;
    clearCoverClasses();
    book.classList.add('cover-closing-back');
    window.setTimeout(() => {
      view = 'back';
      animating = false;
      syncUi();
    }, COVER_MS);
  }

  function openBack(target = spreads.length - 1) {
    if (animating) return;
    animating = true;
    index = Math.max(0, Math.min(spreads.length - 1, target));
    setSpread(index);
    clearCoverClasses();
    book.classList.add('cover-opening-back');
    window.setTimeout(() => {
      view = 'spread';
      animating = false;
      syncUi();
    }, COVER_MS);
  }

  function flipNext() {
    if (animating) return;
    if (view === 'front') return openFront(0);
    if (view === 'back') return;
    if (index >= spreads.length - 1) return closeBack();
    animateTo(index + 1, 'next');
  }

  function flipPrev() {
    if (animating) return;
    if (view === 'back') return openBack(spreads.length - 1);
    if (view === 'front') return;
    if (index <= 0) return closeFront();
    animateTo(index - 1, 'prev');
  }

  function goTo(target) {
    if (animating || target < 0 || target >= spreads.length) return;
    if (view === 'front') return openFront(target);
    if (view === 'back') return openBack(target);
    if (target === index) return;
    animateTo(target, target > index ? 'next' : 'prev');
  }

  prev.addEventListener('click', flipPrev);
  next.addEventListener('click', flipNext);
  first.addEventListener('click', closeFront);
  last.addEventListener('click', closeBack);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'PageDown') flipNext();
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') flipPrev();
    if (event.key === 'Home') {
      if (view !== 'front') closeFront();
    }
    if (event.key === 'End') {
      if (view !== 'back') closeBack();
    }
  });

  book.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].clientX;
  }, {passive:true});

  book.addEventListener('touchend', (event) => {
    const delta = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) < 45) return;
    if (delta < 0) flipNext();
    else flipPrev();
  }, {passive:true});

  syncUi();
})();