/**
 * Lost Country RP — controllo statico della struttura reale.
 * Nessuna dipendenza esterna, nessuna lettura di dati Supabase.
 * Esecuzione: node --test tests/site-structure.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ignoreDir = new Set(['.git', 'node_modules']);
const sourceAttrs = /\b(href|src)\s*=\s*["']([^"'<>]+)["']/gi;
const idRegex = /\bid\s*=\s*["']([^"'<>]+)["']/gi;
const external = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const htmlFiles = [];

async function collectFiles(dir, files = new Set()) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoreDir.has(entry.name)) await collectFiles(resolve(dir, entry.name), files);
    } else if (entry.isFile()) {
      files.add(relative(root, resolve(dir, entry.name)).replaceAll('\\', '/'));
    }
  }
  return files;
}
function toLocal(fromFile, href) {
  if (external.test(href) || href.startsWith('/')) return null;
  const [nameAndQuery, fragment = ''] = href.split('#', 2);
  const name = nameAndQuery.split('?', 1)[0];
  if (!name && !fragment) return null;
  let decodedName, decodedFragment;
  try {
    decodedName = decodeURIComponent(name);
    decodedFragment = decodeURIComponent(fragment);
  } catch {
    return { invalid: 'percent-encoding', href };
  }
  const path = decodedName
    ? relative(root, resolve(dirname(resolve(root, fromFile)), decodedName)).replaceAll('\\', '/')
    : fromFile;
  return { path, fragment: decodedFragment };
}

test('14 pagine storiche ancora presenti, senza creare pagine di fantasia', async () => {
  const files = await collectFiles(root);
  const required = [
    'index.html', 'approfondimenti.html', 'codice-penale.html', 'lore.html',
    'voce-della-frontiera.html', 'attivita-commerciali.html', 'eventi.html',
    'sceriffi.html', 'medico.html', 'ufficio-civico.html', 'redazione.html',
    'amministrazione.html', 'admin-sceriffi.html', 'hosting-immagini.html'
  ];
  for (const name of required) assert.ok(files.has(name), `Pagina storica mancante: ${name}`);
  assert.ok(!files.has('server.html') && !files.has('fazioni.html'),
    'Server e Fazioni sono sezioni della homepage, non pagine da aggiungere');
  for (const name of files) if (name.endsWith('.html')) htmlFiles.push(name);
});

test('tutti i link, gli script e le immagini locali puntano a file esistenti', async () => {
  const files = await collectFiles(root);
  const pages = [...files].filter(f => f.endsWith('.html'));
  const content = new Map(await Promise.all(pages.map(async f => [f, await readFile(resolve(root, f), 'utf8')])));
  const ids = new Map([...content].map(([path, html]) => [
    path, new Set([...html.matchAll(idRegex)].map(m => m[1]))
  ]));
  let checked = 0;
  const broken = [];
  for (const [page, html] of content) {
    for (const [, attribute, href] of html.matchAll(sourceAttrs)) {
      const ref = toLocal(page, href);
      if (!ref) continue;
      checked++;
      if (ref.invalid) { broken.push(`${page}: ${href} (${ref.invalid})`); continue; }
      if (!files.has(ref.path)) { broken.push(`${page}: ${attribute}="${href}" file mancante`); continue; }
      if (ref.fragment && ids.has(ref.path) && !ids.get(ref.path).has(ref.fragment))
        broken.push(`${page}: ${href} ancora #${ref.fragment} inesistente`);
    }
  }
  assert.ok(checked > 250, `Controllati solo ${checked} riferimenti: verifica la scansione`);
  assert.deepEqual(broken, [], broken.join('\n'));
});

test('gli elementi della homepage usati dal sito e dal CMS sono preservati', async () => {
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  for (const id of ['il-server', 'fazioni', 'regole-oro', 'ingaggio', 'lc-scopri', 'lc-accesso', 'lc-contatti']) {
    assert.ok(html.includes(`id="${id}"`), `Ancora essenziale non trovata: ${id}`);
  }
  for (const selector of ['lc-map-landing', 'lc-map-navbar', 'lc-map-mainlogo', 'lc-map-benefits', 'lc-map-gallery'])
    assert.ok(html.includes(selector), `Contenitore homepage mancante: ${selector}`);
  assert.ok(html.includes('data-lc-edit'), 'I punti di modifica CMS non devono scomparire');
});

test('foglio condiviso caricato da tutte le pagine senza toccare i moduli operativi', async () => {
  const files = await collectFiles(root);
  for (const file of [...files].filter(f => f.endsWith('.html'))) {
    const html = await readFile(resolve(root, file), 'utf8');
    assert.ok(html.includes('lc-heritage-theme.css'), `Stile condiviso non incluso: ${file}`);
  }
  for (const moduleName of ['sheriff.js','medico.js','lore.js','news-archive.js',
    'amministrazione.js','frontier-portal.js','lc-cms-core.js','supabase-config.js'])
    assert.ok(files.has(moduleName), `Modulo operativo assente: ${moduleName}`);
});

test('i due PNG approvati sono presenti e la home usa il logo originale', async () => {
  const files = await collectFiles(root);
  for (const p of ['lc-hero-approved.png','lc-logo-official.png'])
    assert.ok(files.has(p), `Risorsa approvata non trovata: ${p}`);
  const home = await readFile(resolve(root,'index.html'),'utf8');
  assert.ok(home.includes('src="lc-logo-official.png"'), 'Logo ufficiale assente dalla homepage');
  const css = await readFile(resolve(root,'lc-heritage-theme.css'),'utf8');
  assert.ok(css.includes("url('lc-hero-approved.png')"), 'Sfondo originale non collegato al tema');
});
