(() => {
  'use strict';

  const pages = [
    'LORE/IL_MIETITORE_DI_SANGUE/pages/01_copertina.webp',
    'LORE/IL_MIETITORE_DI_SANGUE/pages/02_pagina.webp',
    'LORE/IL_MIETITORE_DI_SANGUE/pages/03_pagina.webp',
    'LORE/IL_MIETITORE_DI_SANGUE/pages/04_pagina.webp',
    'LORE/IL_MIETITORE_DI_SANGUE/pages/05_pagina.webp',
    'LORE/IL_MIETITORE_DI_SANGUE/pages/06_pagina.webp',
    'LORE/IL_MIETITORE_DI_SANGUE/pages/07_pagina.webp',
    'LORE/IL_MIETITORE_DI_SANGUE/pages/08_epilogo.webp'
  ];

  const basePage = document.getElementById('basePage');
  const turnPage = document.getElementById('turnPage');
  const turnPageImg = document.getElementById('turnPageImg');
  const prev = document.getElementById('prevPage');
  const next = document.getElementById('nextPage');
  const first = document.getElementById('firstPage');
  const last = document.getElementById('lastPage');
  const counter = document.getElementById('pageCounter');
  const dots = document.getElementById('pageDots');
  const book = document.getElementById('flipbook');

  let index = 0;
  let animating = false;
  let touchStartX = 0;

  pages.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  const dotButtons = pages.map((_, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'flipbook-dot';
    button.setAttribute('aria-label', 'Vai a pagina ' + (i + 1));
    button.addEventListener('click', () => goTo(i));
    dots.appendChild(button);
    return button;
  });

  function syncUi() {
    basePage.src = pages[index];
    basePage.alt = 'Pagina ' + (index + 1) + ' del libro Lore';
    counter.textContent = (index + 1) + ' / ' + pages.length;
    prev.disabled = index === 0;
    next.disabled = index === pages.length - 1;
    first.disabled = index === 0;
    last.disabled = index === pages.length - 1;
    dotButtons.forEach((dot, i) => dot.classList.toggle('active', i === index));
  }

  function finish(newIndex) {
    index = newIndex;
    basePage.src = pages[index];
    turnPage.className = 'book-page book-page-turn';
    turnPageImg.src = '';
    turnPage.style.visibility = '';
    animating = false;
    syncUi();
  }

  function flipNext() {
    if (animating || index >= pages.length - 1) return;
    animating = true;
    const target = index + 1;
    basePage.src = pages[target];
    turnPageImg.src = pages[index];
    turnPage.style.visibility = 'visible';
    turnPage.className = 'book-page book-page-turn flip-next';
    window.setTimeout(() => finish(target), 720);
  }

  function flipPrev() {
    if (animating || index <= 0) return;
    animating = true;
    const target = index - 1;
    basePage.src = pages[index];
    turnPageImg.src = pages[target];
    turnPage.style.visibility = 'visible';
    turnPage.className = 'book-page book-page-turn flip-prev';
    window.setTimeout(() => finish(target), 720);
  }

  function goTo(target) {
    if (animating || target === index || target < 0 || target >= pages.length) return;
    if (target > index) {
      basePage.src = pages[target];
      turnPageImg.src = pages[index];
      turnPage.style.visibility = 'visible';
      turnPage.className = 'book-page book-page-turn flip-next';
    } else {
      basePage.src = pages[index];
      turnPageImg.src = pages[target];
      turnPage.style.visibility = 'visible';
      turnPage.className = 'book-page book-page-turn flip-prev';
    }
    animating = true;
    window.setTimeout(() => finish(target), 720);
  }

  prev.addEventListener('click', flipPrev);
  next.addEventListener('click', flipNext);
  first.addEventListener('click', () => goTo(0));
  last.addEventListener('click', () => goTo(pages.length - 1));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'PageDown') flipNext();
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') flipPrev();
    if (event.key === 'Home') goTo(0);
    if (event.key === 'End') goTo(pages.length - 1);
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