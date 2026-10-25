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

test('14 pagine storiche e nuovo regolamento autonomo, nessuna pagina fittizia', async () => {
  const files = await collectFiles(root);
  const required = [
    'index.html', 'regolamento.html', 'approfondimenti.html', 'codice-penale.html', 'lore.html',
    'voce-della-frontiera.html', 'attivita-commerciali.html', 'eventi.html',
    'sceriffi.html', 'medico.html', 'ufficio-civico.html', 'redazione.html',
    'amministrazione.html', 'admin-sceriffi.html', 'hosting-immagini.html'
  ];
  for (const name of required) assert.ok(files.has(name), `Pagina storica mancante: ${name}`);
  assert.ok(!files.has('server.html') && !files.has('fazioni.html'),
    'Server e Fazioni sono sezioni della homepage, non pagine da aggiungere');
  for (const name of files) if (name.endsWith('.html')) htmlFiles.push(name);
  assert.equal(htmlFiles.length,15,'La sitemap deve avere 15 pagine HTML');
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

test('gli elementi grafici della homepage sono preservati, senza manuale incorporato', async () => {
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  for (const id of ['il-server']) {
    assert.ok(html.includes(`id="${id}"`), `Ancora essenziale non trovata: ${id}`);
  }
  for (const selector of ['lc-map-landing', 'lc-map-navbar', 'lc-map-mainlogo', 'lc-map-message'])
    assert.ok(html.includes(selector), `Contenitore homepage mancante: ${selector}`);
  assert.ok(!html.includes('data-lc-edit="rule-'), 'Il Regolamento non deve più comparire sotto la Home');
});

test('foglio condiviso caricato da tutte le pagine senza toccare i moduli operativi', async () => {
  const files = await collectFiles(root);
  for (const file of [...files].filter(f => f.endsWith('.html'))) {
    const html = await readFile(resolve(root, file), 'utf8');
    assert.ok(html.includes('lc-heritage-theme.css'), `Stile condiviso non incluso: ${file}`);
    assert.ok(html.includes('lc-unified-site.css'), `Stile della barra unificata mancante: ${file}`);
    assert.ok(html.includes('lc-unified-navbar.js'), `Script della barra unificata mancante: ${file}`);
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

test('homepage: navigazione identica alle categorie ufficiali e indirizzi reali', async () => {
  const html = await readFile(resolve(root,'index.html'),'utf8');
  const start = html.indexOf('<nav class="lc-map-navbar"');
  const end = html.indexOf('</nav>',start);
  assert.ok(start >= 0 && end > start,'Menu homepage non trovato');
  const nav = html.slice(start,end);
  const expected = [
    ['REGOLAMENTO','regolamento.html'],
    ['CODICE PENALE','codice-penale.html'],
    ['LORE','lore.html'],
    ['REGISTRO MEDICO','medico.html'],
    ['LA VOCE DELLA FRONTIERA','voce-della-frontiera.html'],
    ['EVENTI','eventi.html'],
    ['APPROFONDIMENTI','approfondimenti.html'],
    ['GESTIONE SCERIFFI','sceriffi.html'],
    ['ATTIVITÀ COMMERCIALI','attivita-commerciali.html']
  ];
  for(const [label,href] of expected) {
    assert.ok(nav.includes('href="'+href+'">'+label+'</a>'), 'Voce mancante: '+label);
  }
  assert.ok(nav.includes('ALTRE SEZIONI</summary>'),'Manca il menu delle altre sezioni');
  for(const href of [
    'approfondimenti.html','sceriffi.html','attivita-commerciali.html',
    'hosting-immagini.html','amministrazione.html'
  ]) assert.ok(nav.includes('href="'+href+'"'),'Collegamento mancante: '+href);
  const topLinks = [...nav.matchAll(/<a\s+href="[^"]+">[^<]+<\/a>/g)].map(m=>m[0]);
  assert.equal(topLinks.length,14,'Il menu deve contenere 9 collegamenti diretti e 5 nel menu extra');
  const visible = nav.split('<details class="lc-home-more">')[0];
  assert.equal([...visible.matchAll(/<a\s+href=/g)].length,9,'Devono comparire 9 categorie nella barra principale');
  assert.ok(!nav.includes('IL SERVER</a>') && !nav.includes('FAZIONI</a>') && !nav.includes('MEDIA</a>'));
});

test('il regolamento è pagina autonoma, con tutti i 15 blocchi CMS e ancore storiche', async () => {
  const home=await readFile(resolve(root,'index.html'),'utf8');
  const rule=await readFile(resolve(root,'regolamento.html'),'utf8');
  const keys=[...rule.matchAll(/data-lc-edit="(rule-\d{3})"/g)].map(m=>m[1]);
  assert.deepEqual(keys,Array.from({length:15},(_,i)=>'rule-'+String(i+1).padStart(3,'0')));
  for(const id of ['inizio','regole-oro','ingaggio','numeri','bande','bottino','rapine','nativi','postale'])
    assert.ok(rule.includes('id="'+id+'"'), 'Capitolo mancante: '+id);
  assert.ok(!home.includes('id="regole-oro"'));
  assert.ok(home.includes("location.replace('regolamento.html'+location.hash)"),'Vecchi link al Regolamento non reindirizzati');
  assert.ok(!home.includes('class="lc-home-guide-actions"'),'La fascia inferiore deve essere rimossa');
  for (const removed of ['lc-map-ctas','lc-map-bottom','lc-map-after-hero','lc-map-contact','lc-map-gallery','lc-home-guides'])
    assert.ok(!home.includes(removed),'Sezione non rimossa dalla Home: '+removed);
});

test('il Regolamento mantiene le pubblicazioni legacy Supabase e il proprio editor', async () => {
  const publicCMS=await readFile(resolve(root,'lc-cms-public.js'),'utf8');
  const editor=await readFile(resolve(root,'amministrazione-contenuti.js'),'utf8');
  assert.ok(publicCMS.includes("page === 'regolamento.html' ? 'index.html' : page"),'Manca l’alias CMS pubblico');
  assert.ok(editor.includes("cmsStoragePage=()=>page==='regolamento.html'?'index.html':page"),'Manca l’alias dell’editor');
  assert.ok(editor.includes('<option value="regolamento.html">Regolamento</option>'),'L’editor deve aprire il nuovo documento');
});

test('stesse categorie e ordine su tutte le pagine, Regolamento e Approfondimenti vicini', async () => {
  const script=await readFile(resolve(root,'lc-unified-navbar.js'),'utf8');
  const expected=[
    "['regolamento.html','Regolamento']",
    "['approfondimenti.html','Approfondimenti']",
    "['lore.html','Lore']",
    "['voce-della-frontiera.html','La Voce della Frontiera']",
    "['eventi.html','Eventi']",
    "['attivita-commerciali.html','Attività Commerciali']",
    "['codice-penale.html','Codice Penale']",
    "['sceriffi.html','Gestione Sceriffi']",
    "['medico.html','Registro Medico']"
  ];
  const positions=expected.map(x=>script.indexOf(x));
  assert.ok(positions.every(x=>x>=0),'Mancano categorie nel menu condiviso');
  assert.ok(positions.every((x,i)=>i===0||x>positions[i-1]),'Ordine del menu non corretto');
  assert.ok(script.includes("viewport.scrollBy({left:offset,behavior:'smooth'})"),'Barra non scorrevole tramite frecce');
  assert.ok(script.includes("MAIN.slice(-3)"),'I tre servizi devono essere raggruppati sulla destra');
  assert.ok(script.includes("rightGroup.className='lc-nav-rightgroup'"),'Manca il gruppo dei pulsanti a destra');
});

test('la homepage non contiene i pulsanti centrali né sezioni inferiori e i servizi sono a destra', async () => {
  const home=await readFile(resolve(root,'index.html'),'utf8');
  const navScript=await readFile(resolve(root,'lc-unified-navbar.js'),'utf8');
  const css=await readFile(resolve(root,'lc-unified-site.css'),'utf8');
  assert.ok(!home.includes('ENTRA NEL SERVER'));
  assert.ok(!home.includes('SCOPRI IL SERVER'));
  const right=["['codice-penale.html','Codice Penale']","['sceriffi.html','Gestione Sceriffi']","['medico.html','Registro Medico']"];
  const indexes=right.map(x=>navScript.indexOf(x));
  assert.ok(indexes.every(x=>x>=0));
  assert.ok(indexes[0]<indexes[1] && indexes[1]<indexes[2], 'Ordine servizi a destra errato');
  assert.ok(css.includes('lc-nav-rightgroup') && css.includes('.lc-nav-track > a.lc-nav-right-item'));
  assert.ok(css.includes('max-width:920px'), 'Il menu deve poter scorrere anche su schermi larghi');
  assert.ok(home.includes('src="lc-logo-official.png"'));
});
