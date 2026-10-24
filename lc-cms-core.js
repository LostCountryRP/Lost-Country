/* Lost Country RP - Sanitizzazione condivisa per i testi del sito.
 * L'HTML del database e' sempre trattato come non attendibile. */
(() => {
  'use strict';
  const tags = new Set(['P','B','STRONG','EM','I','BR','UL','OL','LI','A','SPAN','SMALL','H3','H4','BLOCKQUOTE']);
  const allowedClasses = new Set(['danger','success','lead','preamble']);
  const omitted = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','FORM','INPUT','BUTTON','TEXTAREA','SELECT','TEMPLATE','LINK','META','BASE']);
  function sanitize(input) {
    const parsed = new DOMParser().parseFromString(String(input || ''), 'text/html');
    const output = document.createElement('div');
    function appendSafe(source, destination) {
      if (source.nodeType === Node.TEXT_NODE) {
        destination.appendChild(document.createTextNode(source.nodeValue));
        return;
      }
      if (source.nodeType !== Node.ELEMENT_NODE || omitted.has(source.tagName)) return;
      const acceptable = tags.has(source.tagName);
      const target = acceptable ? document.createElement(source.tagName.toLowerCase()) : destination;
      if (acceptable) {
        if (source.classList.length) {
          const classNames = [...source.classList].filter(name => allowedClasses.has(name));
          if (classNames.length) target.className = classNames.join(' ');
        }
        if (source.tagName === 'A') {
          const raw = source.getAttribute('href') || '';
          // Consenti solo link web, percorsi relativi ed ancore. Niente javascript: o data:.
          if (/^https?:\/\//i.test(raw) || /^(?:\.{0,2}\/|#)[^\s]*$/.test(raw) ||
            /^[a-z0-9][a-z0-9_./#?=&%-]*$/i.test(raw)) {
            target.setAttribute('href', raw);
            target.setAttribute('rel', 'noopener noreferrer');
          }
        }
        destination.appendChild(target);
      }
      for (const child of source.childNodes) appendSafe(child, target);
    }
    for (const child of parsed.body.childNodes) appendSafe(child, output);
    return output.innerHTML;
  }
  window.LC_CMS = Object.freeze({sanitize});
})();