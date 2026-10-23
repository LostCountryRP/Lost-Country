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

  const FLIP_MS = 560;
  let index = 0;
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

  function syncUi() {
    setSpread(index);
    counter.textContent = pageRange(index);
    prev.disabled = index === 0;
    next.disabled = index === spreads.length - 1;
    first.disabled = index === 0;
    last.disabled = index === spreads.length - 1;
    dotButtons.forEach((dot, i) => dot.classList.toggle('active', i === index));
  }

  function resetLeaf() {
    turnLeaf.className = 'book-leaf';
    turnLeaf.style.visibility = '';
    leafFront.src = '';
    leafBack.src = '';
  }

  function finish(target) {
    index = target;
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
    window.setTimeout(() => finish(target), FLIP_MS);
  }

  function flipNext() {
    if (index >= spreads.length - 1) return;
    animateTo(index + 1, 'next');
  }

  function flipPrev() {
    if (index <= 0) return;
    animateTo(index - 1, 'prev');
  }

  function goTo(target) {
    animateTo(target, target > index ? 'next' : 'prev');
  }

  prev.addEventListener('click', flipPrev);
  next.addEventListener('click', flipNext);
  first.addEventListener('click', () => goTo(0));
  last.addEventListener('click', () => goTo(spreads.length - 1));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'PageDown') flipNext();
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') flipPrev();
    if (event.key === 'Home') goTo(0);
    if (event.key === 'End') goTo(spreads.length - 1);
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