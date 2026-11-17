// Teste ponta a ponta do Sprint. A mesma bateria roda na web e no APK:
//
//   npm run e2e                          web: Chrome headless + servidor de dev (porta 3011)
//   npm run e2e -- --url http://localhost:4173   web: contra um servidor já rodando (ex.: vite preview)
//   npm run e2e -- --target android      APK: precisa de aparelho/emulador com o app instalado
//                                        (npm run android:run) e depuração do WebView ligada
//
// Opções: --chrome <caminho>   --headful   --keep (não fecha o navegador)
//
// No Android o script limpa os dados do app (pm clear) antes de começar — faça backup se precisar.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../..', import.meta.url));
const artifacts = join(root, 'scripts', 'e2e', '.artifacts');
const isWin = process.platform === 'win32';

// ── argumentos ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};
// Id do app no aparelho: o build de debug (único com WebView inspecionável). --app-id para outro.
const APP_ID = typeof opt('app-id') === 'string' ? opt('app-id') : 'com.workeric08.sprint.debug';
const TARGET = opt('target', 'web');
if (!['web', 'android'].includes(TARGET)) { console.error('--target deve ser web ou android'); process.exit(2); }
const isAndroid = TARGET === 'android';
const PREVIEW = !!opt('preview', false) && !isAndroid; // build de produção + checagens de PWA

const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

// ── adb ──────────────────────────────────────────────────────────────────────
const sdk = process.env.ANDROID_HOME || join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk');
const adbBin = join(sdk, 'platform-tools', isWin ? 'adb.exe' : 'adb');
const adb = (...a) => spawnSync(existsSync(adbBin) ? adbBin : 'adb', a, { encoding: 'utf-8' });
const adbOut = (...a) => (adb(...a).stdout ?? '').trim();

// ── resultados ───────────────────────────────────────────────────────────────
const results = [];
let page;
let browser;
let shotN = 0;

async function check(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name} (${Date.now() - t0} ms)`);
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
    console.log(`  ✗ ${name}\n      ${e.message}`);
    try {
      mkdirSync(artifacts, { recursive: true });
      const file = join(artifacts, `${TARGET}-${String(++shotN).padStart(2, '0')}.png`);
      await page.screenshot({ path: file });
      console.log(`      captura: ${file}`);
    } catch { /* sem captura */ }
  }
}
const group = title => console.log(`\n${title}`);

function assert(cond, msg) { if (!cond) throw new Error(msg); }

// ── helpers de tela ──────────────────────────────────────────────────────────
const bodyText = async () => norm(await page.evaluate(() => document.body.innerText));

async function waitFor(fn, what, timeout = 8000) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    try { last = await fn(); if (last) return last; } catch (e) { last = undefined; }
    await sleep(100);
  }
  throw new Error(`tempo esgotado esperando: ${what}`);
}

const waitText = (text, timeout) => waitFor(async () => (await bodyText()).includes(norm(text)), `texto "${text}"`, timeout);
const waitGone = (text, timeout) => waitFor(async () => !(await bodyText()).includes(norm(text)), `sumir o texto "${text}"`, timeout);
const hasText = async text => (await bodyText()).includes(norm(text));

/**
 * Clica como um dedo: acha um botão visível cujo texto (ou aria-label) contém `text`, rola até ele
 * e só clica se nenhum outro elemento estiver por cima (assim detecta telas sobrepostas).
 */
async function click(text, { exact = false, nth = 0 } = {}) {
  const needle = norm(text);
  const point = await waitFor(() => page.evaluate(({ needle, exact, nth }) => {
    const n = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const els = [...document.querySelectorAll('button, [role="button"], a')];
    const hits = [];
    for (const el of els) {
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
      const label = n(el.getAttribute('aria-label') ?? '');
      const own = n(el.innerText ?? '');
      const match = exact ? own === needle || label === needle : own.includes(needle) || label.includes(needle);
      if (!match) continue;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const top = document.elementFromPoint(x, y);
      if (top && (el === top || el.contains(top))) hits.push(el);
    }
    const chosen = hits[nth];
    if (!chosen) return null;
    chosen.scrollIntoView({ block: 'center', inline: 'center' });
    const r = chosen.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, { needle, exact, nth }), `botão clicável "${text}"`);
  await page.mouse.click(point.x, point.y);
  await sleep(120);
}

async function typeInto(placeholder, value) {
  const point = await waitFor(() => page.evaluate(ph => {
    const el = [...document.querySelectorAll('input, textarea')].find(i => (i.placeholder ?? '').toLowerCase().includes(ph.toLowerCase()));
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, placeholder), `campo "${placeholder}"`);
  await page.mouse.click(point.x, point.y);
  await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(value, { delay: 15 });
  await sleep(100);
}

async function injectSubject(subject) {
  await page.evaluate(subj => new Promise((resolve, reject) => {
    const req = indexedDB.open('SprintDB');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const database = req.result;
      const tx = database.transaction('subjects', 'readwrite');
      tx.objectStore('subjects').put(subj);
      tx.oncomplete = () => { database.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  }), subject);
}

/** Acesso direto ao IndexedDB do app (prepara cenários que levariam horas pela tela). */
const idb = (store, action, value) => page.evaluate(({ store, action, value }) => new Promise((resolve, reject) => {
  const req = indexedDB.open('SprintDB');
  req.onerror = () => reject(req.error);
  req.onsuccess = () => {
    const database = req.result;
    const tx = database.transaction(store, action === 'get' || action === 'all' ? 'readonly' : 'readwrite');
    const os = tx.objectStore(store);
    let out;
    if (action === 'put') os.put(value);
    else if (action === 'delete') os.delete(value);
    else if (action === 'clear') os.clear();
    else if (action === 'get') out = os.get(value);
    else if (action === 'all') out = os.getAll();
    tx.oncomplete = () => { database.close(); resolve(out ? out.result : undefined); };
    tx.onerror = () => reject(tx.error);
  };
}), { store, action, value });

const SIM_KEY = 'simulado_active';
const getSimSession = async () => {
  const row = await idb('settings', 'get', SIM_KEY);
  return row ? JSON.parse(row.value) : null;
};
const putSimSession = session => idb('settings', 'put', { key: SIM_KEY, value: JSON.stringify(session) });
/** Sessão de simulado pronta para injetar. `ago` = há quantos ms ela começou. */
const simSession = ({ minutes = 60, speed = 1, strict = false, ago = 0, extra = {} } = {}) => ({
  template: { id: 'custom', name: 'Customizado', durationMinutes: minutes, strictMode: strict, hasRedacao: false, areas: [] },
  startedAt: Date.now() - ago, pausedAt: null, pausedMs: 0, endedAt: null, speed, ...extra,
});
const simRecord = ({ id, daysAgo, areas, over = {} }) => {
  const at = Date.now() - daysAgo * 86_400_000;
  return {
    id, templateId: 'custom', templateName: 'Customizado', startedAt: at - 3 * 3_600_000, completedAt: at,
    plannedDurationMinutes: 180, actualDurationMinutes: 180, completed: true,
    areaResults: areas.map(([areaName, questionsCorrect, questionsTotal]) => ({ areaName, color: '#3b82f6', questionsCorrect, questionsTotal })),
    timeControlScore: null, perception: '', redacaoText: '', redacaoScore: null, ...over,
  };
};
const clockText = () => page.evaluate(() => document.querySelector('[data-testid="simulado-clock"]')?.textContent ?? '');
const clockSeconds = async () => {
  const [h, m, s] = (await clockText()).split(':').map(Number);
  return h * 3600 + m * 60 + s;
};
const noHorizontalScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1
  && document.body.scrollWidth <= window.innerWidth + 1);

/**
 * Mede, a cada quadro de animação, se a tela cheia do sprint existe e está opaca, e se ela cobre o centro
 * da tela. Serve para provar que nenhuma transição deixa a tela de baixo aparecer.
 */
const startFrameSampler = () => page.evaluate(() => {
  window.__frames = [];
  window.__sampling = true;
  const loop = () => {
    const el = document.querySelector('[data-testid="sprint-runner"]');
    const mid = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    window.__frames.push({
      runner: !!el,
      opacity: el ? Number(getComputedStyle(el).opacity) : 0,
      covers: !!(el && mid && el.contains(mid)),
    });
    if (window.__sampling) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});
const stopFrameSampler = () => page.evaluate(() => { window.__sampling = false; return window.__frames; });

const chipText = () => page.evaluate(() => document.querySelector('[data-testid="streak-chip"]')?.textContent ?? '');

const todayCell = () => page.evaluate(() => {
  const el = document.querySelector('[data-today="true"]');
  return el ? { date: el.dataset.date, level: el.dataset.level, label: el.getAttribute('aria-label') ?? '' } : null;
});

/** Chave de hoje no fuso do navegador/aparelho (não do PC que roda o script). */
const localKey = () => page.evaluate(() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});

/** Move um <input type="range"> achado pelo aria-label (setter nativo + evento input). */
const setRange_ = (ariaLabel, value) => page.evaluate(({ ariaLabel, value }) => {
  const el = document.querySelector(`input[aria-label="${ariaLabel}"]`);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, { ariaLabel, value });

/** Move um <input type="range"> como o React espera (setter nativo + evento input). */
const setRange = (id, value) => page.evaluate(({ id, value }) => {
  const el = document.getElementById(id);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, { id, value });

/**
 * Substitui matérias e registros de bloco no banco. `logDaysAgo`: um registro ao meio-dia de cada
 * "N dias atrás" (montado no fuso do próprio navegador). Zera o que havia antes.
 */
const seedDb = ({ logDaysAgo = [], deleteSettings = [] }) => page.evaluate(({ logDaysAgo, deleteSettings }) => new Promise((resolve, reject) => {
  const req = indexedDB.open('SprintDB');
  req.onerror = () => reject(req.error);
  req.onsuccess = () => {
    const database = req.result;
    const tx = database.transaction(['subjects', 'blockLogs', 'settings'], 'readwrite');
    tx.objectStore('subjects').clear();
    tx.objectStore('blockLogs').clear();
    const now = new Date();
    logDaysAgo.forEach((n, i) => tx.objectStore('blockLogs').put({
      id: `e2e-log-${n}-${i}`, subjectId: 'e2e-s', subjectTitle: 'E2E', subjectColor: '#6366f1',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, 12).getTime(),
      questionsTotal: 0, questionsCorrect: 0, subtopic: '', selfScore: 3, flaggedForReview: false, blockType: 'study',
    }));
    deleteSettings.forEach(k => tx.objectStore('settings').delete(k));
    tx.oncomplete = () => { database.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  };
}), { logDaysAgo, deleteSettings });

async function reload() {
  await page.reload({ waitUntil: 'load' });
  await waitFor(async () => !(await page.$('.animate-spin')), 'fim do carregamento', 10000);
  await sleep(300);
}

// ── alvos (só mudam: abrir o app e apertar "voltar") ────────────────────────
let devServer;

async function startWebServer() {
  const given = opt('url');
  if (typeof given === 'string') return given;
  if (PREVIEW) {
    // Build de produção servido pelo vite preview: é onde o service worker e o manifest existem.
    console.log('Build de produção (PWA)…');
    const b = spawnSync(isWin ? 'npx.cmd' : 'npx', ['vite', 'build'], { cwd: root, shell: isWin, stdio: 'ignore' });
    if (b.status !== 0) throw new Error('vite build falhou');
    const purl = 'http://localhost:4175';
    devServer = spawn(isWin ? 'npx.cmd' : 'npx', ['vite', 'preview', '--port', '4175', '--strictPort'], { cwd: root, shell: isWin, stdio: 'ignore' });
    await waitFor(() => fetch(purl).then(r => r.ok).catch(() => false), 'vite preview', 30000);
    return purl;
  }
  const url = 'http://localhost:3011';
  const up = await fetch(url).then(r => r.ok).catch(() => false);
  if (up) return url;
  console.log('Subindo servidor de dev na porta 3011…');
  devServer = spawn(isWin ? 'npx.cmd' : 'npx', ['vite', '--port', '3011', '--strictPort'], { cwd: root, shell: isWin, stdio: 'ignore' });
  await waitFor(() => fetch(url).then(r => r.ok).catch(() => false), 'servidor de dev', 30000);
  return url;
}

function findChrome() {
  const given = opt('chrome');
  const candidates = [
    typeof given === 'string' ? given : null,
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const found = candidates.find(existsSync);
  if (!found) throw new Error('Chrome não encontrado. Use --chrome <caminho> ou CHROME_PATH.');
  return found;
}

const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

// A abertura de 2 s (index.html, services/abertura.ts) cobriria o app e seguraria o toque: nesta bateria a chave de
// duração fica em 0 (a camada nem entra). A abertura em si é testada por scripts/e2e/abertura.mjs.
const semAbertura = () => { try { localStorage.setItem('sprint-abertura-ms', '0'); } catch { /* sem localStorage */ } };

const web = {
  name: 'web',
  async open() {
    const url = await startWebServer();
    browser = await puppeteer.launch({
      executablePath: findChrome(),
      headless: !opt('headful'),
      userDataDir: mkdtempSync(join(tmpdir(), 'sprint-e2e-')),
      args: ['--no-first-run', '--disable-features=Translate'],
    });
    page = (await browser.pages())[0] ?? (await browser.newPage());
    await page.setViewport(MOBILE);
    await page.evaluateOnNewDocument(semAbertura);
    await page.goto(url, { waitUntil: 'load' });
  },
  async pressBack() {
    await page.evaluate(() => history.back());
    await sleep(250);
  },
};

const android = {
  name: 'android',
  async connect() {
    await waitFor(() => {
      const unix = adbOut('shell', 'cat', '/proc/net/unix');
      const m = unix.match(/webview_devtools_remote_(\d+)/);
      return m ? m[1] : null;
    }, 'socket de depuração do WebView (o APK é de debug? o app abriu?)', 20000)
      .then(pid => adb('forward', 'tcp:9222', `localabstract:webview_devtools_remote_${pid}`));
    browser = await waitFor(() => puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null }).catch(() => null), 'conexão com o WebView', 15000);
    page = await waitFor(async () => (await browser.pages()).find(p => p.url().includes('localhost')), 'página do app no WebView', 15000);
    await page.evaluateOnNewDocument(semAbertura); // vale a partir da próxima carga (a primeira, ao abrir o app, já mostrou a abertura)
    await page.evaluate(semAbertura);
  },
  async open() {
    const devices = adbOut('devices').split('\n').slice(1).filter(l => /\bdevice\b/.test(l));
    if (devices.length === 0) throw new Error('Nenhum aparelho/emulador conectado (adb devices).');
    if (!adbOut('shell', 'pm', 'list', 'packages', APP_ID).includes(APP_ID)) throw new Error(`App ${APP_ID} não instalado (npm run android:run).`);
    adb('shell', 'pm', 'clear', APP_ID);
    await this.launch();
  },
  async launch() {
    adb('shell', 'am', 'force-stop', APP_ID);
    adb('shell', 'am', 'start', '-n', `${APP_ID}/.MainActivity`);
    await this.connect();
  },
  async relaunch() { await browser.disconnect().catch(() => {}); await this.launch(); },
  async pressBack() {
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK');
    await sleep(350);
  },
  focusedApp: () => adbOut('shell', 'dumpsys', 'window'),
};

const target = isAndroid ? android : web;

// ── bateria ──────────────────────────────────────────────────────────────────
const pageErrors = [];
const externalRequests = [];

async function main() {
  console.log(`E2E Sprint · alvo: ${TARGET}`);
  await target.open();

  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });
  page.on('request', r => {
    const u = r.url();
    if (/^(data|blob|about|chrome-extension):/.test(u)) return;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(u)) return;
    externalRequests.push(u);
  });
  await waitFor(async () => !(await page.$('.animate-spin')), 'fim do carregamento', 15000);
  await sleep(400);

  // ── Inicialização ──
  group('Inicialização');
  await check('mostra o estado vazio do Ciclo', () => waitText('Nenhuma matéria ainda'));
  await check('navegação tem Ciclo, Progresso e Ajustes', async () => {
    const t = await bodyText();
    assert(['ciclo', 'progresso', 'ajustes'].every(x => t.includes(x)), 'faltam abas na navegação');
  });
  if (isAndroid) {
    await check('roda como app nativo (Capacitor)', async () => {
      assert(await page.evaluate(() => window.Capacitor?.isNativePlatform?.() === true), 'Capacitor.isNativePlatform() não é true');
    });
    await check('não há service worker no APK', async () => {
      const n = await page.evaluate(async () => (await navigator.serviceWorker?.getRegistrations?.() ?? []).length);
      assert(n === 0, `${n} service worker(s) registrado(s)`);
    });
    await check('Ajustes não oferece instalar/atualizar PWA', async () => {
      await click('Ajustes');
      await waitText('Seu nome');
      assert(!(await hasText('Instalar app')) && !(await hasText('Verificar atualizações')), 'cartão de PWA visível no APK');
      await click('Ciclo');
    });
  }

  if (PREVIEW) {
    group('Inicialização enxuta (orçamento)');
    await check('o primeiro arquivo do app é pequeno e não usa fonte de ícones', async () => {
      const r = await page.evaluate(() => {
        const readyAt = performance.getEntriesByName('sprint:ready')[0]?.startTime ?? Infinity;
        const early = performance.getEntriesByType('resource').filter(e => e.responseEnd <= readyAt);
        const sum = re => early.filter(e => re.test(e.name)).reduce((a, e) => a + e.encodedBodySize, 0) / 1024;
        return { js: sum(/[.]js([?]|$)/), css: sum(/[.]css([?]|$)/), font: sum(/[.](woff2?|ttf|otf)([?]|$)/) };
      });
      assert(r.js <= 90, `JS carregado antes da primeira pintura: ${r.js.toFixed(0)} KB (orçamento: 90 KB comprimidos). Algo grande entrou no primeiro arquivo?`);
      assert(r.css <= 15, `CSS: ${r.css.toFixed(0)} KB (orçamento: 15 KB)`);
      assert(r.font === 0, `${r.font.toFixed(0)} KB de fontes carregadas na inicialização (os ícones são SVG)`);
    });
    await check('telas pesadas ficam fora do primeiro arquivo e chegam pré-carregadas', async () => {
      // Depois da inicialização, o navegador ocioso baixa as outras telas: abrir Ajustes não pode precisar esperar.
      await waitFor(() => page.evaluate(() => performance.getEntriesByType('resource').filter(e => /[.]js([?]|$)/.test(e.name)).length >= 4), 'telas carregadas em segundo plano', 6000);
    });
  }

  // ── Ciclo ──
  group('Ciclo (matérias)');
  await check('cria uma matéria pelo formulário', async () => {
    await click('Adicionar matéria');
    await waitText('Nova matéria');
    await typeInto('Ex.: Matemática', 'Português');
    await click('Adicionar matéria', { exact: true });
    await waitText('0 / 20');
    assert(await hasText('português'), 'matéria não apareceu');
  });
  await check('edita a matéria', async () => {
    await click('Editar matéria');
    await waitText('Editar matéria');
    await typeInto('Ex.: Matemática', 'Português 2');
    await click('Salvar alterações');
    await waitText('português 2');
  });
  await check('seletor de cores personalizado responde ao toque (react-colorful)', async () => {
    await click('Nova matéria', { exact: true });
    await waitFor(async () => (await bodyText()).includes('duração do bloco'), 'abrir formulário');
    try {
      await click('Escolher outra cor');
      // O formulário rola sozinho até o seletor (animação suave): espera a posição parar antes de medir e tocar.
      const rectOf = () => page.evaluate(() => {
        const el = document.querySelector('.react-colorful__saturation');
        const picker = document.querySelector('.react-colorful');
        if (!el || !picker) return null;
        const r = el.getBoundingClientRect();
        const p = picker.getBoundingClientRect();
        const section = picker.parentElement?.parentElement?.getBoundingClientRect(); // a seção "Cor" (a largura útil do formulário)
        return { x: r.left, y: r.top, w: r.width, h: r.height, pickerW: p.width, pickerH: p.height, pickerX: p.left, sectionX: section?.left ?? 0, sectionW: section?.width ?? 0 };
      });
      let box = await waitFor(rectOf, 'área de saturação do seletor');
      for (let i = 0; i < 20; i++) {
        await sleep(120);
        const next = await rectOf();
        if (next && Math.abs(next.y - box.y) < 0.5) { box = next; break; }
        box = next ?? box;
      }
      // Retângulo de lado a lado: ocupa a largura toda da seção (não os 200 px fixos encostados à esquerda) e é mais largo que alto.
      assert(Math.abs(box.pickerW - box.sectionW) <= 1, `seletor com ${box.pickerW.toFixed(0)} px, a seção tem ${box.sectionW.toFixed(0)} px: não ocupa a largura toda`);
      assert(Math.abs(box.pickerX - box.sectionX) <= 1, 'seletor não começa na borda esquerda da seção');
      assert(box.pickerW > box.pickerH * 1.2, `seletor ${box.pickerW.toFixed(0)}×${box.pickerH.toFixed(0)} px: deveria ser um retângulo mais largo que alto`);
      const hexOf = () => page.evaluate(() => [...document.querySelectorAll('input')].map(i => i.value.trim()).find(v => /^#[0-9A-Fa-f]{6}$/.test(v)) ?? '');
      const swatchColor = () => page.evaluate(() => getComputedStyle(document.querySelector('div.w-12.h-12')).backgroundColor);
      const before = await hexOf();
      assert(/^#[0-9A-Fa-f]{6}$/.test(before), `cor inicial não lida (${before})`);
      await page.mouse.click(box.x + box.w * 0.2, box.y + box.h * 0.75); // canto escuro e pouco saturado: bem diferente do índigo inicial
      await waitFor(async () => (await hexOf()) !== before, 'a cor mudar depois do toque no seletor');
      // Código da cor digitado: o campo aceita um hexadecimal e a amostra acompanha.
      const field = await page.$('input[aria-label="Código hexadecimal da cor"]');
      assert(field, 'campo do código da cor ausente');
      await field.click();
      await sleep(150); // o app seleciona o texto todo ao focar: o que se digita substitui o código
      await page.keyboard.type('#10b981', { delay: 20 });
      await waitFor(async () => (await swatchColor()) === 'rgb(16, 185, 129)', 'a amostra virar a cor digitada (#10b981)');
    } finally {
      // Fecha o formulário mesmo se algo falhou: um formulário esquecido aberto derrubaria os testes seguintes em cascata.
      if (await hasText('duração do bloco')) {
        await target.pressBack().catch(() => {});
        await waitGone('duração do bloco').catch(() => {});
      }
    }
    await waitGone('duração do bloco');
  });
  await check('controles deslizantes: trilha uniforme da cor do app e preenchimento que acompanha o botão', async () => {
    await click('Nova matéria', { exact: true });
    await waitFor(async () => (await bodyText()).includes('duração do bloco'), 'abrir formulário');
    try {
      const info = () => page.evaluate(() => {
        const input = document.querySelector('input[aria-label="Duração do bloco, em minutos"]');
        input.scrollIntoView({ block: 'center' });
        const r = input.getBoundingClientRect();
        return { p: getComputedStyle(input).getPropertyValue('--p').trim(), height: r.height, x: r.left, y: r.top, w: r.width };
      });
      // Cor (R,G,B) do pixel que o usuário vê, a `dx` px da borda esquerda do controle, na altura da trilha.
      const pixelAt = async dx => {
        const r = await info();
        const png = await page.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.height }, type: 'png' });
        const { data, info: img } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const scale = img.width / r.w;
        const px = Math.round(dx * scale), py = Math.round((r.height / 2) * scale);
        const i = (py * img.width + px) * 3;
        return [data[i], data[i + 1], data[i + 2]];
      };
      // O formulário abre com uma animação (nasce transparente e sobe): medir no meio dela daria cores e posições falsas.
      await waitFor(() => page.evaluate(() => document.getAnimations().every(a => a.playState !== 'running')), 'as animações de abertura terminarem');
      const near = ([r, g, b], [r2, g2, b2], tol) => Math.abs(r - r2) <= tol && Math.abs(g - g2) <= tol && Math.abs(b - b2) <= tol;
      const INDIGO = [79, 70, 229];
      const atStart = await info();
      assert(atStart.height >= 24, `área de toque de só ${atStart.height}px`);

      // Ponto médio: as DUAS PONTAS têm que ser da família índigo, sem o branco padrão do navegador nas extremidades.
      await setRange_('Duração do bloco, em minutos', 60);
      const w = (await info()).w;
      const left = await pixelAt(6); // a 3 px o pixel ainda está na curva arredondada e mistura com o fundo
      const right = await pixelAt(w - 6);
      const beforeThumb = await pixelAt(w * 0.3);
      const afterThumb = await pixelAt(w * 0.8);
      assert(near(left, INDIGO, 40), `ponta esquerda (preenchida) não é o índigo do app: rgb(${left})`);
      assert(near(beforeThumb, INDIGO, 40), `trecho preenchido não é o índigo do app: rgb(${beforeThumb})`);
      for (const [nome, c] of [['ponta direita', right], ['trecho restante', afterThumb]]) {
        assert(!near(c, [255, 255, 255], 12), `${nome} está branca (visual padrão do navegador): rgb(${c})`);
        assert(c[2] - c[0] >= 15, `${nome} não é da família índigo/azul do app: rgb(${c})`);
      }
      assert(!near(right, left, 20), 'a parte restante deveria ser um tom mais suave que a preenchida');
      await setRange_('Duração do bloco, em minutos', 120);
      assert(Number((await info()).p) === 1, 'no máximo, o preenchimento deveria ir até o fim (--p = 1)');
      await setRange_('Duração do bloco, em minutos', 5);
      assert(Number((await info()).p) === 0, 'no mínimo, o preenchimento deveria ficar vazio (--p = 0)');
      await setRange_('Duração do bloco, em minutos', 60);
      const mid = Number((await info()).p);
      assert(Math.abs(mid - (60 - 5) / (120 - 5)) < 0.01, `no meio, --p deveria ser ~0,48 e é ${mid}`);
    } finally {
      if (await hasText('duração do bloco')) {
        await target.pressBack().catch(() => {});
        await waitGone('duração do bloco').catch(() => {});
      }
    }
  });
  await check('barra do botão tem o fundo do app, some com o teclado aberto e a tecla de ação recolhe o teclado', async () => {
    await click('Nova matéria', { exact: true });
    await waitFor(async () => (await bodyText()).includes('duração do bloco'), 'abrir formulário');
    try {
      const colors = () => page.evaluate(() => ({
        footer: getComputedStyle(document.querySelector('[data-testid="form-footer"]')).backgroundColor,
        page: getComputedStyle(document.body).backgroundColor,
      }));
      const c = await colors();
      assert(c.footer === c.page, `barra do botão (${c.footer}) diferente do fundo do app (${c.page}): fica uma emenda visível`);

      // Teclado: no APK vem do plugin; na web, a área visível da página encolhe. Simula esse encolhimento.
      const keyboard = open => page.evaluate(open => {
        const vv = window.visualViewport;
        if (open) Object.defineProperty(vv, 'height', { value: Math.round(window.innerHeight * 0.5), configurable: true });
        else delete vv.height; // volta ao getter original do protótipo
        vv.dispatchEvent(new Event('resize'));
      }, open);
      await keyboard(true);
      await waitFor(async () => !(await page.$('[data-testid="form-footer"]')), 'a barra do botão sumir com o teclado aberto');
      assert(!(await hasText('Adicionar matéria')) || !(await page.$('[data-testid="form-footer"]')), 'botão ainda visível com o teclado aberto');
      await keyboard(false);
      await waitFor(async () => !!(await page.$('[data-testid="form-footer"]')), 'a barra do botão voltar ao recolher o teclado');

      // A tecla "Concluído/Ir" do teclado tira o foco do campo (recolhe o teclado).
      await typeInto('Ex.: Matemática', 'Química');
      assert(await page.evaluate(() => document.activeElement?.tagName === 'INPUT'), 'o campo do nome deveria estar em foco');
      await page.keyboard.press('Enter');
      await waitFor(() => page.evaluate(() => document.activeElement?.tagName !== 'INPUT'), 'o campo perder o foco ao apertar Enter');
      assert(await page.evaluate(() => document.querySelector('input[type="text"]').getAttribute('enterkeyhint') === 'done'), 'a tecla de ação deveria ser "Concluído"');
    } finally {
      await page.evaluate(() => { try { delete window.visualViewport.height; } catch { /* ignorado */ } });
      if (await hasText('duração do bloco')) {
        await target.pressBack().catch(() => {});
        await waitGone('duração do bloco').catch(() => {});
      }
    }
  });
  await check('botão voltar do aparelho fecha o formulário sem sair do app', async () => {
    await click('Nova matéria', { exact: true });
    await waitFor(async () => (await bodyText()).includes('duração do bloco'), 'abrir formulário');
    const before = await page.evaluate(() => location.href);
    await target.pressBack();
    await waitGone('duração do bloco');
    assert(await hasText('português 2'), 'saiu da aba Ciclo');
    assert((await page.evaluate(() => location.href)) === before, 'a URL mudou');
  });

  // ── Montar sprint ──
  group('Montar sprint');
  await check('matéria rápida (bloco de 3 s) aparece após recarregar', async () => {
    await injectSubject({ id: 'e2e-rapida', title: 'Rápida', color: '#10b981', duration: 0.05, blockCount: 5, completedBlocks: [], createdAt: Date.now() + 1 });
    await reload();
    await waitText('0 / 5');
  });
  const buildQueue = async () => {
    await click('Montar sprint');
    await waitText('Sprint vazio');
    await click('rápida');
    await click('Pausa', { exact: true });
    await click('rápida');
  };
  await check('monta a fila: bloco, pausa, bloco', async () => {
    await click('Montar sprint');
    await waitText('Sprint vazio');
    assert(await hasText('Adicione blocos para iniciar'), 'botão iniciar deveria estar desabilitado');
    await click('rápida');
    await click('Pausa', { exact: true });
    await click('rápida');
    await waitText('Iniciar · 2 blocos');
  });
  await check('toque no selo troca o tipo do bloco (Estudo → Revisão)', async () => {
    await click('Estudo', { exact: true });
    await waitFor(async () => (await page.evaluate(() => [...document.querySelectorAll('button')].some(b => b.innerText.trim().toLowerCase() === 'revisão'))), 'selo Revisão');
  });
  await check('botão voltar do aparelho fecha o Montar sprint', async () => {
    await target.pressBack();
    await waitGone('Sprint vazio');
    await waitGone('Iniciar · 2 blocos');
    assert(await hasText('português 2'), 'não voltou ao Ciclo');
  });

  // ── Executar sprint ──
  group('Executar sprint');
  await check('inicia o sprint e mostra o cronômetro', async () => {
    await click('Montar sprint');
    await waitText('Sprint vazio');
    await click('rápida');
    await click('Pausa', { exact: true });
    await click('rápida');
    await click('Estudo', { exact: true }); // 1º bloco vira Revisão
    await click('Iniciar ·');
    await waitText('restantes');
    assert(await hasText('1 / 2'), 'contador 1 / 2 ausente');
  });
  await check('voltar no PRIMEIRO bloco pede confirmação (não fecha o sprint)', async () => {
    await target.pressBack();
    await waitText('Encerrar sprint?');
    assert(await hasText('continuar estudando'), 'diálogo sem opção de continuar');
    await target.pressBack(); // voltar de novo = cancelar
    await waitGone('Encerrar sprint?');
    assert((await hasText('pausar')) || (await hasText('retomar')), 'saiu do cronômetro');
  });
  await check('ao zerar, mostra "Bloco concluído!" e abre o registro', async () => {
    await waitText('Bloco concluído', 10000);
    await waitText('Como você se saiu?', 6000);
  });
  await check('preenche e salva o registro pós-bloco (3 questões, 2 certas)', async () => {
    for (let i = 0; i < 3; i++) await click('Mais uma resolvida');
    for (let i = 0; i < 2; i++) await click('Mais uma correta');
    await waitText('67% de acerto');
    await typeInto('Ex.: Funções', 'Funções');
    await click('5', { exact: true });
    await click('Salvar registro');
    await waitText('de descanso');
  });
  await check('voltar na pausa pula para o próximo bloco', async () => {
    await waitText('Pular pausa');
    await target.pressBack();
    await waitText('restantes');
    assert(await hasText('2 / 2'), 'contador 2 / 2 ausente');
  });
  await check('voltar no registro do último bloco pula o registro e encerra o sprint', async () => {
    await waitText('Como você se saiu?', 10000);
    await target.pressBack();
    await waitGone('Como você se saiu?');
    await waitText('Montar sprint');
    assert(!(await hasText('restantes')), 'ainda no cronômetro');
    assert(await hasText('2 / 5'), 'os 2 blocos deveriam constar como concluídos');
  });
  await check('"Encerrar sprint" não contabiliza o bloco em andamento', async () => {
    await click('Montar sprint');
    await waitText('Sprint vazio');
    await click('rápida');
    await click('Iniciar ·');
    await waitText('restantes');
    await click('Encerrar sprint', { exact: true });
    await waitText('Encerrar sprint?');
    await click('Sim, encerrar');
    await waitText('Montar sprint');
    assert(await hasText('2 / 5'), 'o bloco encerrado foi contabilizado');
  });

  await check('pular etapas nunca deixa a tela inicial aparecer por baixo (sem "piscar")', async () => {
    await click('Montar sprint');
    await waitText('Sprint vazio');
    await click('rápida');
    await click('Pausa', { exact: true });
    await click('rápida');
    await click('rápida');
    await startFrameSampler();
    let frames = [];
    try {
      await click('Iniciar ·'); // entrada: Montar sprint → 1º bloco
      await waitText('restantes');
      await click('Pular → próximo'); // bloco → pausa
      await waitText('Pular pausa');
      await click('Pular pausa'); // pausa → bloco
      await waitText('restantes');
      await click('Pular → próximo'); // bloco → bloco (o último fica de fora: ao acabar o sprint a tela inicial deve voltar)
      await waitText('restantes');
      await sleep(300);
    } finally {
      frames = await stopFrameSampler();
      // Deixa o estado limpo mesmo se algo falhou: um sprint esquecido aberto derrubaria os testes seguintes em cascata.
      if (await page.$('[data-testid="sprint-runner"]')) {
        await click('Encerrar sprint', { exact: true }).catch(() => {});
        await click('Sim, encerrar').catch(() => {});
        await waitText('Montar sprint').catch(() => {});
      }
    }
    const first = frames.findIndex(f => f.runner);
    assert(first !== -1, 'o amostrador nunca viu a tela do sprint');
    const exposed = frames.slice(first).filter(f => !f.runner || f.opacity < 1);
    assert(exposed.length === 0, `${exposed.length} quadro(s) com a tela do sprint ausente ou translúcida (opacidade mínima ${Math.min(...exposed.map(f => f.opacity ?? 0)).toFixed(2)}): a tela inicial apareceu`);
    // o fundo opaco não pode ser só do contêiner: ele precisa cobrir a tela toda
    assert(frames.slice(first).every(f => f.covers), 'a tela do sprint não cobria o centro da tela em algum quadro');
    assert(await hasText('2 / 5'), 'pular etapas fora do modo dev não deveria contabilizar blocos');
  });

  // ── Progresso ──
  group('Progresso');
  await check('anel geral e métricas do dia', async () => {
    await click('Progresso', { nth: 0 });
    await waitText('Progresso geral');
    await waitText('2 de 25 blocos');
    assert(await hasText('67%'), 'taxa de acerto (67%) ausente');
    assert(await hasText('distribuição') && await hasText('revisão'), 'distribuição por tipo ausente');
  });
  await check('troca de período (Semana, Mês)', async () => {
    await click('Semana');
    await click('Mês');
    assert(await hasText('rápida'), 'detalhe por matéria ausente');
  });

  // ── Ajustes ──
  group('Ajustes');
  await check('nome aparece na saudação do Ciclo', async () => {
    await click('Ajustes');
    await typeInto('Como devemos te chamar', 'Eric');
    await click('Ciclo');
    await waitText('Eric');
  });
  await check('tema escuro persiste após recarregar', async () => {
    await click('Ajustes');
    await click('Escuro');
    assert(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'classe dark ausente');
    await reload();
    assert(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'tema não persistiu');
  });
  await check('modo desenvolvedor: pular bloco conta como concluído', async () => {
    await click('Ajustes');
    await typeInto('Como devemos te chamar', 'DevInfo');
    await waitText('Modo desenvolvedor ativo');
    await click('Ciclo');
    await click('Montar sprint');
    await waitText('Sprint vazio');
    await click('rápida');
    await click('Iniciar ·');
    await waitText('restantes');
    await click('Pular → finalizar sprint');
    await waitText('Montar sprint');
    assert(await hasText('3 / 5'), 'bloco pulado em modo dev não contou');
  });

  // ── Ofensiva e calendário ──
  group('Ofensiva e calendário');
  await check('chip da ofensiva no Ciclo mostra 1 dia (estudou hoje)', async () => {
    await click('Ciclo');
    await waitFor(async () => (await chipText()).includes('1d'), 'chip com "1d"');
  });
  await check('Progresso mostra o cartão da ofensiva e o detalhe expande', async () => {
    await click('Progresso');
    await waitText('1 dia seguido');
    assert(await hasText('Você está construindo o hábito'), 'subtítulo acolhedor ausente');
    await click('1 dia seguido');
    await waitText('Recorde');
    assert(await hasText('Total') && await hasText('dias bônus'), 'detalhe da ofensiva incompleto');
  });
  await check('calendário destaca hoje e mostra o nível da meta (3 blocos = parcial)', async () => {
    const expected = await localKey();
    const cell = await waitFor(todayCell, 'célula de hoje');
    assert(cell.date === expected, `hoje destacado = ${cell.date}, esperado ${expected}`);
    assert(cell.level === 'partial', `nível ${cell.level}, esperado partial`);
    assert(cell.label.includes('3 blocos'), `rótulo: ${cell.label}`);
  });
  await check('tocar no dia abre o detalhe (blocos, questões, acerto, meta)', async () => {
    await click('3 blocos');
    await waitFor(() => page.$('[data-testid="day-detail"]'), 'painel do dia');
    assert(await hasText('Meta parcial'), 'faltou o texto de meta parcial');
    assert(await hasText('67%'), 'acerto do dia (67%) ausente');
    assert(await hasText('2 de 3 corretas'), 'contagem de corretas ausente');
  });
  await check('anotação do dia é salva e sobrevive a recarregar', async () => {
    await click('Adicionar anotação');
    await typeInto('Anote algo', 'Revisar funções');
    await click('Salvar', { exact: true });
    await waitFor(async () => (await page.$eval('[data-testid="day-note"]', e => e.textContent).catch(() => '')) === 'Revisar funções', 'texto da anotação');
    await reload();
    await click('Progresso');
    await click('3 blocos');
    await waitFor(async () => (await page.$eval('[data-testid="day-note"]', e => e.textContent).catch(() => '')) === 'Revisar funções', 'anotação após recarregar');
  });
  await check('meta do calendário: salvar muda a cor do dia e persiste', async () => {
    await click('Meta de blocos do calendário');
    await waitText('Mínimo diário');
    await setRange('goal-min', 1);
    await setRange('goal-max', 2);
    await click('Salvar meta');
    await waitGone('Mínimo diário');
    assert((await todayCell()).level === 'full', 'com meta 1–2, 3 blocos deveriam ser "full"');
    await reload();
    await click('Progresso');
    assert((await waitFor(todayCell, 'célula de hoje')).level === 'full', 'meta não persistiu');
  });
  await check('botão voltar fecha o modal de meta sem salvar', async () => {
    await click('Meta de blocos do calendário');
    await waitText('Mínimo diário');
    await setRange('goal-min', 3);
    await target.pressBack();
    await waitGone('Mínimo diário');
    assert((await todayCell()).level === 'full', 'a meta mudou sem salvar');
  });

  // ── Persistência ──
  group('Persistência');
  await check('dados e nome sobrevivem a recarregar', async () => {
    await reload();
    await waitText('3 / 5');
    assert(await hasText('devinfo'), 'nome não persistiu');
  });
  if (isAndroid) {
    await check('dados sobrevivem a matar o processo do app', async () => {
      await android.relaunch();
      await waitFor(async () => !(await page.$('.animate-spin')), 'fim do carregamento', 15000);
      await waitText('3 / 5');
    });
  }

  // ── Backup (web: o seletor de arquivos e a folha de compartilhar do Android são nativos e ficam no checklist manual) ──
  if (!isAndroid) {
    group('Backup (exportar / importar)');
    const dlDir = mkdtempSync(join(tmpdir(), 'sprint-dl-'));
    const client = await page.createCDPSession();
    await client.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dlDir }).catch(async () => {
      await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dlDir });
    });
    // Ajustes é uma tela carregada sob demanda: espera o campo existir em vez de supor que já está lá.
    const upload = async file => (await waitFor(() => page.$('input[type="file"]'), 'campo de arquivo do backup')).uploadFile(file);
    let backupFile;

    await check('exporta um arquivo .json com todos os dados', async () => {
      await click('Ajustes');
      await click('Exportar');
      const name = await waitFor(() => readdirSync(dlDir).find(f => /^sprint-backup-\d{4}-\d{2}-\d{2}\.json$/.test(f)), 'arquivo de backup baixado', 8000);
      backupFile = join(dlDir, name);
      const data = JSON.parse(readFileSync(backupFile, 'utf-8'));
      assert(data.format === 'sprint-backup' && data.version === 1, 'cabeçalho do backup incorreto');
      assert(data.tables.subjects.length === 2, `esperava 2 matérias, veio ${data.tables.subjects.length}`);
      assert(data.tables.blockLogs.length >= 1, 'sem registros de bloco');
      assert(data.tables.settings.some(s => s.key === 'user_name' && s.value === 'DevInfo'), 'nome ausente no backup');
      assert('reviewItems' in data.tables && 'simuladoRecords' in data.tables, 'tabelas dos módulos futuros ausentes');
      await waitText('Backup gerado: 2 matérias');
    });
    await check('importar substitui os dados atuais e restaura tudo', async () => {
      await click('Ciclo');
      await click('Excluir matéria', { nth: 1 });
      await click('Sim, excluir matéria');
      await waitGone('3 / 5');
      await click('Ajustes');
      await upload(backupFile);
      await waitText('Substituir seus dados?');
      assert(await hasText('2 matérias'), 'resumo do backup ausente no diálogo');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'load' }),
        click('Sim, restaurar backup'),
      ]);
      await waitFor(async () => !(await page.$('.animate-spin')), 'fim do carregamento', 10000);
      await waitText('3 / 5');
      assert(await hasText('devinfo'), 'nome não voltou');
      assert(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'tema não voltou');
    });
    await check('arquivo inválido é recusado sem mexer nos dados', async () => {
      const bad = join(dlDir, 'qualquer.json');
      writeFileSync(bad, '{"foo": 1}');
      await click('Ajustes');
      await upload(bad);
      await waitText('não é um backup do Sprint');
      assert(!(await hasText('Substituir seus dados?')), 'abriu confirmação para arquivo inválido');
      await click('Ciclo');
      assert(await hasText('3 / 5'), 'os dados mudaram');
    });
    await check('cancelar a importação não altera nada', async () => {
      await click('Ajustes');
      await upload(backupFile);
      await waitText('Substituir seus dados?');
      await click('Cancelar');
      await waitGone('Substituir seus dados?');
      await click('Ciclo');
      assert(await hasText('3 / 5'), 'os dados mudaram');
    });
  }

  // ── Reset e exclusão ──
  group('Reset e exclusão');
  await check('reseta os blocos de uma matéria (com confirmação)', async () => {
    await click('Resetar blocos', { nth: 1 });
    await waitText('Resetar blocos?');
    await click('Sim, resetar blocos');
    await waitText('0 / 5');
  });
  await check('exclui uma matéria (com confirmação)', async () => {
    await click('Excluir matéria', { nth: 1 });
    await waitText('Excluir matéria?');
    await click('Sim, excluir matéria');
    await waitGone('rápida');
  });

  // ── Ofensiva: situações semeadas no banco (apaga matérias e registros!) ──
  group('Ofensiva: ausência, bônus e virada do dia');
  await check('ausente há 5 dias (com recorde de 5): mostra "bem-vindo de volta" sem culpa', async () => {
    await seedDb({ logDaysAgo: [9, 8, 7, 6, 5], deleteSettings: ['welcome_back_shown'] });
    await reload();
    await waitText('Bem-vindo de volta');
    assert(await hasText('Faz 5 dias'), 'tempo de ausência incorreto');
    assert(await hasText('Seu recorde: 5 dias seguidos'), 'recorde ausente');
    assert(!/perdeu|falhou|culpa|quebrou/.test(await bodyText()), 'texto com tom de cobrança');
  });
  await check('voltar do aparelho dispensa o aviso e ele não reaparece no mesmo dia', async () => {
    await target.pressBack();
    await waitGone('Bem-vindo de volta');
    await reload();
    await sleep(600);
    assert(!(await hasText('Bem-vindo de volta')), 'o aviso reapareceu no mesmo dia');
    await waitFor(async () => (await chipText()).includes('—'), 'chip sem sequência');
  });
  await check('7 dias seguidos até anteontem: sequência viva com bônus em uso', async () => {
    await seedDb({ logDaysAgo: [8, 7, 6, 5, 4, 3, 2] });
    await reload();
    await waitFor(async () => (await chipText()).includes('7d'), 'chip com "7d"');
    await click('Progresso');
    await waitText('7 dias seguidos');
    await waitText('Usamos um dia bônus');
  });
  await check('desligar a ofensiva esconde chip e cartão, mas o calendário continua', async () => {
    await click('Ajustes');
    await click('Mostrar ofensiva');
    assert(await page.$eval('[aria-label="Mostrar ofensiva"]', e => e.getAttribute('aria-checked')) === 'false', 'interruptor não desligou');
    await click('Ciclo');
    assert(!(await page.$('[data-testid="streak-chip"]')), 'chip ainda visível');
    await click('Progresso');
    assert(!(await page.$('[data-testid="streak-widget"]')), 'cartão ainda visível');
    assert(!!(await page.$('[data-testid="calendar"]')), 'calendário sumiu');
    await reload();
    await click('Ajustes');
    assert(await page.$eval('[aria-label="Mostrar ofensiva"]', e => e.getAttribute('aria-checked')) === 'false', 'preferência não persistiu');
    await click('Mostrar ofensiva');
    await click('Ciclo');
    await waitFor(async () => (await chipText()).includes('7d'), 'chip de volta');
  });
  await check('virada do dia com o app aberto: "hoje" e a ofensiva se atualizam sozinhos', async () => {
    await click('Progresso');
    const before = (await waitFor(todayCell, 'célula de hoje')).date;
    await page.evaluate(() => {
      const RealDate = Date;
      const shift = 86_400_000; // relógio avança 1 dia
      class ShiftedDate extends RealDate {
        constructor(...args) { super(...(args.length ? args : [RealDate.now() + shift])); }
        static now() { return RealDate.now() + shift; }
      }
      window.Date = ShiftedDate;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(async () => (await todayCell())?.date !== before, 'hoje avançar um dia');
    const after = (await todayCell()).date;
    assert(after > before, `hoje não avançou (${before} → ${after})`);
    // Antes: último estudo anteontem com bônus. Agora faz 3 dias: a sequência já não vale.
    await waitText('Vamos começar!');
    await reload(); // restaura o relógio real
  });

  // ── Simulado ── (no APK o sistema abre a janela de permissão de notificações e cobre o app: lá o roteiro é manual)
  if (!isAndroid) {
    const typeAria = async (label, value) => {
      const point = await waitFor(() => page.evaluate(l => {
        const el = document.querySelector(`input[aria-label="${l}"]`);
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, label), `campo "${label}"`);
      await page.mouse.click(point.x, point.y);
      await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
      await page.keyboard.type(String(value), { delay: 10 });
      await page.keyboard.press('Enter');
      await sleep(100);
    };
    const openSimulado = async () => { await click('Simulado', { nth: 0 }); await sleep(250); };

    group('Simulado');
    await check('a aba Simulado oferece ENEM Dia 1, ENEM Dia 2 e Customizado, e o modo dev oferece a velocidade', async () => {
      await click('Ciclo');
      await openSimulado();
      await waitText('Começar · 5h 30min');
      for (const t of ['ENEM — Dia 1', 'ENEM — Dia 2', 'Customizado']) assert(await hasText(t), `modelo ausente: ${t}`);
      assert(await hasText('Modo desenvolvedor · velocidade'), 'velocidade do modo dev ausente');
      assert(await hasText('só aparecem com o app aberto'), 'aviso de que no navegador os avisos só valem com o app aberto');
      assert(await noHorizontalScroll(), 'rolagem horizontal na aba Simulado');
    });
    await check('Customizado: duração em passos e modo estrito', async () => {
      await click('Customizado');
      await waitText('Começar · 3h');
      await click('Aumentar duração');
      await waitText('Começar · 3h 30min');
      await click('Diminuir duração'); await click('Diminuir duração');
      await waitText('Começar · 2h 30min');
      await click('Modo estrito');
      assert(await page.$eval('[role="switch"]', e => e.getAttribute('aria-checked')) === 'true', 'modo estrito não ligou');
      await click('ENEM — Dia 1');
      await waitText('Começar · 5h 30min');
    });

    await check('começar o ENEM Dia 1 (estrito, ×60): cronômetro de 5h30 sem botão de pausa, gravado no banco', async () => {
      await click('×60');
      await click('Começar ·');
      await waitFor(async () => (await clockText()) !== '', 'cronômetro');
      assert(await hasText('Estrito') && await hasText('Dev ×60'), 'selos Estrito / Dev ×60 ausentes');
      assert(!(await hasText('Pausar')), 'modo estrito não deve ter pausa');
      const s = await clockSeconds();
      assert(s > 5 * 3600 && s <= 5.5 * 3600, `cronômetro fora de 5h–5h30 (${await clockText()})`);
      const saved = await getSimSession();
      assert(saved && saved.template.id === 'enem-dia1' && saved.speed === 60 && saved.endedAt === null, 'sessão não foi gravada');
      assert(await noHorizontalScroll(), 'rolagem horizontal no cronômetro');
    });
    await check('o relógio corre pelo horário real: ×60 faz 1 s real descontar 1 min de prova', async () => {
      const a = await clockSeconds();
      await sleep(2200);
      const b = await clockSeconds();
      const spent = a - b;
      assert(spent >= 100 && spent <= 160, `em ~2,2 s reais descontou ${spent} s de prova (esperado ~132)`);
    });
    await check('trocar de aba com o simulado correndo pede confirmação (e ficar mantém tudo)', async () => {
      await click('Progresso');
      await waitText('Sair desta tela?');
      assert(await hasText('O cronômetro continua correndo'), 'a confirmação não explica o que acontece');
      await click('Ficar no simulado');
      await waitGone('Sair desta tela?');
      assert((await clockText()) !== '', 'saiu da tela mesmo escolhendo ficar');
      assert(!(await hasText('Progresso geral')), 'a aba mudou mesmo escolhendo ficar');
    });
    await check('sair da tela deixa o simulado correndo e a aba sinaliza "em andamento"', async () => {
      await click('Progresso');
      await click('Sair da tela');
      await waitText('Progresso geral');
      assert(await page.evaluate(() => [...document.querySelectorAll('nav button')].some(b => b.innerText.toLowerCase().includes('em andamento'))),
        'a aba Simulado não mostra que há simulado em andamento');
      assert((await getSimSession())?.endedAt === null, 'o simulado deveria seguir em andamento');
    });
    await check('ao voltar, e mesmo depois de recarregar o app, o cronômetro continua do ponto certo', async () => {
      await openSimulado();
      await waitFor(async () => (await clockText()) !== '', 'cronômetro ao voltar');
      const before = await clockSeconds();
      await reload();
      await openSimulado();
      await waitFor(async () => (await clockText()) !== '', 'cronômetro depois de recarregar');
      const after = await clockSeconds();
      assert(after < before && before - after < 600, `cronômetro saltou (${before} → ${after})`);
    });
    await check('botão voltar do aparelho pergunta antes de encerrar (e voltar de novo fecha a pergunta)', async () => {
      await target.pressBack();
      await waitText('Encerrar simulado?');
      await target.pressBack();
      await waitGone('Encerrar simulado?');
      assert((await clockText()) !== '', 'o simulado fechou com o botão voltar');
    });
    await check('encerrar (modo dev) abre o registro como concluído, com a prova toda', async () => {
      await click('Encerrar simulado');
      await waitText('Encerrar simulado?');
      await click('Sim, encerrar');
      await waitText('Registrar simulado');
      assert(await hasText('ENEM — Dia 1 · 5h 30min'), 'duração do registro incorreta');
      assert(!(await hasText('interrompido')), 'em modo dev o simulado conta como concluído');
      assert((await getSimSession())?.endedAt !== null, 'o fim não foi gravado');
    });
    await check('registro: digitar acertos por área, redação e controle do tempo, e ver o aproveitamento', async () => {
      await typeAria('Corretas em Linguagens e Códigos', 30);
      await typeAria('Corretas em Ciências Humanas', 27);
      await waitText('63%'); // 57 de 90 questões (a redação não conta como questão)
      assert(await hasText('57 de 90 questões'), 'a redação não deve entrar como questão errada');
      await typeAria('Corretas em Linguagens e Códigos', 99); // não passa do total
      assert(await page.$eval('input[aria-label="Corretas em Linguagens e Códigos"]', e => e.value) === '40', 'acertos passaram do total de questões');
      await typeAria('Corretas em Linguagens e Códigos', 30);
      await page.evaluate(() => { document.getElementById('redacao-score').scrollIntoView({ block: 'center' }); });
      await page.type('#redacao-score', '800');
      await click('4', { exact: true });
      await click('Salvar registro');
      await waitGone('Registrar simulado');
      assert((await getSimSession()) === null, 'o simulado em andamento deveria ter sido limpo');
      const all = await idb('simuladoRecords', 'all');
      assert(all.length === 1 && all[0].redacaoScore === 800 && all[0].timeControlScore === 4 && all[0].completed, 'registro gravado incorreto');
    });

    await check('histórico: registro com nota, detalhe por área e redação', async () => {
      await click('Histórico de simulados');
      await waitText('Histórico de simulados');
      await waitText('63%');
      await click('ENEM — Dia 1', { nth: 0 });
      await waitText('30/40');
      assert(await hasText('Redação: 800/1000') && await hasText('Controle do tempo: 4/5'), 'detalhe do registro incompleto');
    });
    await check('histórico com vários simulados: média, gráfico de evolução e linha do tempo', async () => {
      await target.pressBack(); // fecha o histórico
      await idb('simuladoRecords', 'put', simRecord({ id: 'e2e-a', daysAgo: 6, areas: [['Matemática', 40, 50], ['Português', 30, 50]] }));
      await idb('simuladoRecords', 'put', simRecord({ id: 'e2e-b', daysAgo: 3, areas: [['Matemática', 35, 50], ['Português', 32, 50]] }));
      await idb('simuladoRecords', 'put', simRecord({ id: 'e2e-c', daysAgo: 1, areas: [['Matemática', 20, 50], ['Português', 33, 50]] }));
      await reload();
      await openSimulado();
      await click('Histórico de simulados');
      await waitText('Média (últimos 3)');
      assert(await page.$('svg[aria-label="Evolução do aproveitamento nos simulados"]'), 'gráfico de evolução ausente');
      const dots = await page.$$eval('svg[aria-label="Evolução do aproveitamento nos simulados"] [role="button"]', els => els.length);
      assert(dots === 4, `esperava 4 pontos no gráfico, veio ${dots}`);
      assert((await page.$$('[data-testid="simulado-record"]')).length === 4, 'linha do tempo sem os 4 simulados');
      assert(await noHorizontalScroll(), 'rolagem horizontal no histórico');
      // tocar num ponto do gráfico mostra a data e o valor dele
      const first = await page.$('svg[aria-label="Evolução do aproveitamento nos simulados"] [role="button"]');
      const box = await first.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await sleep(150);
      assert(await page.$eval('svg[aria-label="Evolução do aproveitamento nos simulados"] [role="button"]', e => e.getAttribute('aria-pressed')) === 'true',
        'o ponto tocado não ficou selecionado');
    });
    await check('excluir pede confirmação e dá para DESFAZER; sem desfazer, a exclusão fica', async () => {
      await click('Excluir simulado', { nth: 0 });
      await waitText('Excluir simulado?');
      await click('Sim, excluir');
      await waitText('Simulado excluído');
      assert((await page.$$('[data-testid="simulado-record"]')).length === 3, 'o registro não saiu da lista');
      await click('Desfazer');
      await waitFor(async () => (await page.$$('[data-testid="simulado-record"]')).length === 4, 'registro de volta');
      assert((await idb('simuladoRecords', 'all')).length === 4, 'o desfazer não gravou no banco');
      await click('Excluir simulado', { nth: 0 });
      await click('Sim, excluir');
      await waitText('Simulado excluído');
      await sleep(7600); // o "Desfazer" some e a exclusão vira definitiva
      assert(!(await hasText('Desfazer')), 'o aviso de desfazer não sumiu sozinho');
      assert((await idb('simuladoRecords', 'all')).length === 3, 'a exclusão não ficou');
    });
    await check('Progresso: desempenho por área mostra a maior queda', async () => {
      await target.pressBack();
      await click('Progresso');
      await waitText('desempenho por área');
      assert(await hasText('Sua maior queda foi em Matemática'), 'recomendação da maior queda ausente');
      assert(await page.evaluate(() => !!document.querySelector('[data-testid="simulado-area-card"]')), 'cartão ausente');
    });

    await check('o tempo acaba com o app aberto: o registro abre sozinho e "Pular" guarda o simulado sem gabarito', async () => {
      await putSimSession(simSession({ minutes: 0.05, ago: 1000 })); // 3 s de prova
      await reload();
      await openSimulado();
      await waitText('Registrar simulado', 8000);
      assert(await hasText('Pular guarda só o tempo'), 'texto sobre o "Pular" ausente');
      await click('Pular', { exact: true });
      await waitGone('Registrar simulado');
      assert((await getSimSession()) === null, 'a sessão deveria ter sido limpa');
      const all = (await idb('simuladoRecords', 'all')).filter(r => r.templateName === 'Customizado' && r.areaResults.length === 0 && r.completed);
      assert(all.length >= 1, 'o simulado pulado não foi guardado');
    });
    await check('o tempo acabou com o app FECHADO: ao reabrir o registro já está lá, concluído', async () => {
      await putSimSession(simSession({ minutes: 60, ago: 4 * 3_600_000 })); // começou há 4 h, durava 1 h
      await reload();
      assert(await page.evaluate(() => [...document.querySelectorAll('nav button')].some(b => b.innerText.toLowerCase().includes('em andamento'))),
        'sem sinal de simulado pendente na aba');
      await openSimulado();
      await waitText('Registrar simulado', 8000);
      assert(await hasText('Customizado · 1h') && !(await hasText('interrompido')), 'devia constar como concluído, com 1h');
      await click('Pular', { exact: true });
      await waitGone('Registrar simulado');
    });
    await check('aviso na tela quando o tempo cruza 30 minutos', async () => {
      // 40 min de prova a ×60 começou há 5 s reais: os 30 min restantes são cruzados daqui a ~5 s, com o app já aberto.
      await putSimSession(simSession({ minutes: 40, speed: 60, ago: 5000 }));
      await reload();
      await openSimulado();
      assert(!(await hasText('Faltam 30 minutos')), 'avisou antes da hora');
      await waitText('Faltam 30 minutos', 9000);
      await waitGone('Faltam 30 minutos', 6000); // o aviso some sozinho
      assert(!(await hasText('Faltam 10 minutos')), 'avisou antes da hora');
    });
    await check('pausar congela o relógio e retomar solta; a pausa fica gravada', async () => {
      await putSimSession(simSession({ minutes: 120 }));
      await reload();
      await openSimulado();
      await waitFor(async () => (await clockText()) !== '', 'cronômetro');
      await click('Pausar');
      await waitText('Pausado');
      const a = await clockSeconds();
      await sleep(1600);
      assert(await clockSeconds() === a, 'o relógio andou com o simulado pausado');
      assert((await getSimSession()).pausedAt !== null, 'a pausa não foi gravada');
      await click('Retomar');
      await waitGone('Pausado');
      const s = await getSimSession();
      assert(s.pausedAt === null && s.pausedMs >= 1500, 'a retomada não somou o tempo parado');
      await waitFor(async () => (await clockSeconds()) < a, 'relógio voltar a andar', 4000);
    });
    await check('encerrar antes do tempo (fora do modo dev): registro "interrompido" com os minutos usados', async () => {
      await idb('settings', 'put', { key: 'user_name', value: 'Eric' }); // sai do modo desenvolvedor
      await putSimSession(simSession({ minutes: 120, ago: 20 * 60_000 })); // 20 min depois de começar
      await reload();
      await openSimulado();
      await click('Encerrar simulado');
      await waitText('registrada como a duração real'.replace('registrada', 'registrado'));
      await click('Sim, encerrar');
      await waitText('Registrar simulado');
      assert(await hasText('Customizado · 20min (interrompido)'), 'o registro deveria dizer 20min e interrompido');
      await click('Salvar registro');
      await waitGone('Registrar simulado');
      const rec = (await idb('simuladoRecords', 'all')).find(r => !r.completed);
      assert(rec && rec.actualDurationMinutes === 20, 'minutos usados incorretos no registro interrompido');
      await idb('settings', 'put', { key: 'user_name', value: 'DevInfo' });
      await reload();
    });
    await check('telas do Simulado sem rolagem lateral e sem texto estourando em 320, 360, 390, 768 e 1280', async () => {
      await putSimSession(simSession({ minutes: 120 }));
      await reload();
      await openSimulado();
      for (const [w, h] of [[320, 568], [360, 640], [390, 844], [768, 1024], [1280, 800]]) {
        await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 768, hasTouch: w < 768 });
        await sleep(300);
        // (mudar isMobile/hasTouch recarrega a página no Puppeteer, e o app volta ao Ciclo)
        if ((await clockText()) === '') await openSimulado();
        await waitFor(async () => (await clockText()) !== '', `cronômetro em ${w}`);
        assert(await noHorizontalScroll(), `rolagem horizontal no cronômetro a ${w}px`);
        const fits = await page.evaluate(() => {
          const main = document.querySelector('main');
          return main.scrollHeight <= main.clientHeight + 1;
        });
        assert(fits, `o cronômetro precisa de rolagem vertical a ${w}x${h}`);
      }
      await page.setViewport(MOBILE);
      await sleep(500);
      if ((await clockText()) === '') await openSimulado();
      await click('Encerrar simulado');
      await click('Sim, encerrar');
      await click('Pular', { exact: true });
      await waitGone('Registrar simulado');
    });
  }

  // ── Redação ── (a escrita é testada aqui; a ponte nativa do app pausado é testada em simulado-nativo.mjs)
  if (!isAndroid) {
    const redacaoRows = () => idb('redacaoSessions', 'all');
    const draftNow = async () => (await redacaoRows()).find(r => r.completedAt === null);
    const writerOpen = () => page.evaluate(() => !!document.querySelector('[data-testid="redacao-writer"]'));
    const rClock = () => page.evaluate(() => document.querySelector('[data-testid="redacao-clock"]')?.textContent ?? '');
    const rSeconds = async () => { const [m, s] = (await rClock()).split(':').map(Number); return m * 60 + s; };
    const openRedacao = async () => { await click('Redação', { exact: true }); await sleep(300); };
    const TEXT = 'A valorização das comunidades tradicionais exige ação coordenada do Estado e da sociedade, '
      + 'porque a ausência de políticas públicas perpetua a exclusão. Além disso, é preciso garantir educação, saúde e '
      + 'proteção territorial, de modo que a cultura desses povos seja preservada para as próximas gerações.';
    const typeText = async (text) => {
      const p = await waitFor(() => page.evaluate(() => {
        const el = document.getElementById('redacao-text');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: Math.min(r.top + 40, window.innerHeight - 40) };
      }), 'campo de texto da redação');
      await page.mouse.click(p.x, p.y);
      await page.keyboard.down('Control'); await page.keyboard.press('End'); await page.keyboard.up('Control'); // o cursor vai para o fim do texto
      await page.keyboard.type(text, { delay: 2 });
      await sleep(150);
    };
    const hidePage = async () => page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    });

    group('Redação');
    await check('a aba Redação lista os temas, com busca, filtro por eixo e o aviso "A conferir" nos do ENEM', async () => {
      await idb('redacaoSessions', 'clear');
      await idb('settings', 'delete', 'completed_redacao_themes');
      await reload();
      await openRedacao();
      await waitText('Todos · 43');
      assert(await hasText('Desafios para a valorização de comunidades e povos tradicionais'), 'tema ENEM 2022 ausente');
      assert(await hasText('a conferir'), 'os temas do ENEM não verificados deviam mostrar "A conferir"');
      assert(await noHorizontalScroll(), 'rolagem horizontal na aba Redação');
      await typeInto('Buscar tema', 'cinema');
      await waitFor(async () => (await page.$$('[data-testid="redacao-themes"] > button')).length === 1, 'busca "cinema" com 1 tema');
      await typeInto('Buscar tema', '');
      await click('Educação ·');
      assert((await page.$$('[data-testid="redacao-themes"] > button')).length >= 2, 'filtro de eixo sem temas');
      await click('Todos ·');
    });
    await check('tocar num tema abre a escolha do modo (no app ou no papel), com o texto de apoio', async () => {
      await click('Desafios para a valorização');
      await waitText('Como vai fazer a redação?');
      assert(await hasText('Escrever aqui') && await hasText('Escrever no papel'), 'opções de modo ausentes');
      assert(await hasText('povos tradicionais'), 'texto de apoio ausente na escolha do modo');
    });
    await check('escrever aqui: tela cheia com cronômetro de 90 min já correndo e contador de palavras', async () => {
      await click('Escrever aqui');
      await waitFor(writerOpen, 'tela de escrita');
      const s = await rSeconds();
      assert(s > 89 * 60 && s <= 90 * 60, `cronômetro fora de 89–90 min (${await rClock()})`);
      await typeText(TEXT);
      const words = await page.$eval('[data-testid="redacao-words"]', e => e.textContent);
      assert(/^4\d palavras$|^3\d palavras$/.test(words ?? ''), `contador de palavras estranho: ${words}`);
      assert(await noHorizontalScroll(), 'rolagem horizontal na escrita');
    });
    await check('app vai para segundo plano: o rascunho é gravado na hora (não espera o salvamento de 5 s)', async () => {
      await hidePage();
      const d = await waitFor(draftNow, 'rascunho no banco', 2000);
      assert(d.text === TEXT, 'o texto gravado não é o digitado (acentos ou espaços perdidos)');
      assert(d.completedAt === null && d.elapsedMs > 0 && d.themeId === 'enem-2022', 'rascunho incompleto');
    });
    await check('o Android mata o app: ao reabrir, o rascunho está lá e continua do ponto onde parou', async () => {
      await reload();
      await openRedacao();
      await waitText('Rascunho em andamento');
      assert(await hasText('povos tradicionais'), 'o rascunho não mostra o tema');
      await click('Continuar', { exact: true });
      await waitFor(writerOpen, 'tela de escrita');
      const text = await page.$eval('#redacao-text', e => e.value);
      assert(text === TEXT, 'o texto restaurado é diferente do escrito');
      assert(await hasText('Pausado'), 'o cronômetro devia voltar PARADO');
      const s = await rSeconds();
      assert(s < 90 * 60 && s > 85 * 60, `o tempo restante devia refletir o já usado (${await rClock()})`);
      await click('Continuar cronômetro');
      await waitFor(async () => !(await hasText('Pausado')), 'cronômetro voltar a correr');
    });
    await check('continuar escrevendo acrescenta ao texto restaurado e o rascunho é atualizado', async () => {
      await typeText(' Por fim, a escola deve incluir saberes tradicionais no currículo.');
      await hidePage();
      await waitFor(async () => (await draftNow())?.text.endsWith('no currículo.'), 'rascunho atualizado');
    });
    await check('voltar do aparelho pergunta antes de sair, e sair guarda o rascunho', async () => {
      await target.pressBack();
      await waitText('Sair da redação?');
      await target.pressBack();
      await waitGone('Sair da redação?');
      assert(await writerOpen(), 'o botão voltar fechou a escrita sem perguntar');
      await target.pressBack();
      await click('Sair e guardar rascunho');
      await waitFor(async () => !(await writerOpen()), 'sair da escrita');
      await waitText('Rascunho em andamento');
      assert((await draftNow())?.text.endsWith('no currículo.'), 'o rascunho não ficou guardado ao sair');
    });
    await check('concluir: avaliação das 5 competências soma a nota e salva; o tema vai para "Feitas"', async () => {
      await click('Continuar', { exact: true });
      await waitFor(writerOpen, 'tela de escrita');
      await click('Concluir redação');
      await waitText('Autoavaliação');
      for (const label of ['C1: 160', 'C2: 120', 'C3: 120', 'C4: 160', 'C5: 80']) await click(label, { exact: true });
      assert(await page.$eval('[data-testid="redacao-total"]', e => e.textContent) === '640', 'a nota devia somar 640');
      await typeInto('O que melhorar', 'Faltou detalhar o agente da proposta.');
      await click('Salvar redação');
      await waitFor(async () => !(await writerOpen()), 'fechar a escrita');
      const rows = await redacaoRows();
      const done = rows.find(r => r.completedAt !== null);
      assert(done && done.estimatedScore === 640 && done.competencyScores.c5 === 80 && done.text.endsWith('no currículo.'), 'redação concluída gravada incorretamente');
      assert(!rows.some(r => r.completedAt === null), 'sobrou rascunho depois de concluir');
      assert(!(await hasText('Rascunho em andamento')), 'o aviso de rascunho devia sumir');
      await waitText('Feitas · 1');
      assert(await hasText('Todos · 42'), 'o tema feito devia sair da lista geral');
    });
    await check('"Feitas": mostra o tema e resetar pede confirmação, não apaga o histórico e dá para desfazer', async () => {
      await click('Feitas ·');
      await waitText('Estas redações já foram feitas');
      assert(await hasText('desafios para a valorização'), 'tema feito ausente em "Feitas"');
      await click('resetar todas');
      await waitText('Resetar as feitas?');
      await click('Sim, resetar');
      await waitText('Lista de feitas zerada');
      await waitText('Todos · 43');
      assert((await redacaoRows()).length === 1, 'resetar as feitas apagou redações do histórico');
      await click('Desfazer');
      await waitText('Feitas · 1');
    });

    await check('modo papel: mostra o texto de apoio, o cronômetro só corre ao iniciar, e vira rascunho', async () => {
      await click('Todos ·');
      await click('Democratização do acesso ao cinema');
      await click('Escrever no papel');
      await waitFor(writerOpen, 'tela do papel');
      await waitText('Texto de apoio');
      assert(await hasText('Pronto para começar') && (await rClock()) === '90:00', 'o cronômetro do papel devia esperar o toque em iniciar');
      assert(!(await draftNow()), 'não devia haver rascunho antes de iniciar');
      await click('Iniciar cronômetro');
      await sleep(1300);
      const d = await waitFor(draftNow, 'rascunho do modo papel');
      assert(d.notes.startsWith('[Modo papel]') && d.text === '', 'rascunho do papel incorreto');
      await target.pressBack();
      await click('Sair e guardar');
      await waitText('Rascunho em andamento · papel');
    });
    await check('papel: o app morre e volta, o cronômetro retoma do tempo salvo, e "Salvar sem nota" conclui sem inventar nota', async () => {
      await reload();
      await openRedacao();
      await waitText('Rascunho em andamento · papel');
      await click('Continuar', { exact: true });
      await waitFor(writerOpen, 'tela do papel');
      assert(await hasText('Pausado'), 'o cronômetro do papel devia voltar parado');
      await click('Concluir redação');
      await waitText('Autoavaliação');
      await click('Salvar sem nota');
      await waitFor(async () => !(await writerOpen()), 'fechar o papel');
      const done = (await redacaoRows()).find(r => r.themeId === 'enem-2019');
      assert(done && done.completedAt !== null && done.estimatedScore === null && done.competencyScores === null, 'devia concluir sem nota');
      assert(done.notes.startsWith('[Modo papel]'), 'perdeu a marca do modo papel');
    });

    await check('acabou o tempo: a avaliação abre sozinha e a redação não se perde', async () => {
      await idb('redacaoSessions', 'put', {
        id: 'e2e-timeup', themeId: 'enem-2020', themeTitle: 'O estigma associado às doenças mentais na sociedade brasileira',
        startedAt: Date.now() - 3_600_000, lastSavedAt: Date.now() - 60_000, completedAt: null, durationMinutes: 90,
        text: 'texto quase pronto', wordCount: 3, competencyScores: null, estimatedScore: null, notes: '', elapsedMs: 90 * 60_000 - 3000,
      });
      await reload();
      await openRedacao();
      await click('Continuar', { exact: true });
      await waitFor(writerOpen, 'tela de escrita');
      await click('Continuar cronômetro');
      await waitText('Autoavaliação', 8000);
      await click('Voltar ao texto');
      await waitGone('Autoavaliação');
      assert(await hasText('Tempo esgotado'), 'devia mostrar "Tempo esgotado"');
      assert(await page.$eval('#redacao-text', e => e.value) === 'texto quase pronto', 'o texto se perdeu');
      await click('Concluir redação');
      await click('Salvar sem nota');
      await waitFor(async () => !(await writerOpen()), 'fechar a escrita');
    });

    await check('histórico: média, melhor nota, gráfico de evolução, detalhe por competência e rascunhos que dá para continuar', async () => {
      const mk = (id, daysAgo, score) => ({
        id, themeId: 'enem-2018', themeTitle: 'Manipulação do comportamento do usuário pelo controle de dados na internet',
        startedAt: Date.now() - daysAgo * 86_400_000 - 5_400_000, lastSavedAt: Date.now() - daysAgo * 86_400_000, completedAt: Date.now() - daysAgo * 86_400_000,
        durationMinutes: 88, text: 'texto de teste', wordCount: 3,
        competencyScores: { c1: score / 5, c2: score / 5, c3: score / 5, c4: score / 5, c5: score / 5 }, estimatedScore: score, notes: '',
      });
      await idb('redacaoSessions', 'put', mk('e2e-h1', 14, 400));
      await idb('redacaoSessions', 'put', mk('e2e-h2', 7, 600));
      await idb('redacaoSessions', 'put', mk('e2e-h3', 2, 800));
      await reload();
      await openRedacao();
      await click('Histórico de redações');
      await waitText('Média (últimas 3)');
      assert(await hasText('Melhor nota'), 'melhor nota ausente');
      assert(await page.$('svg[aria-label="Evolução da nota nas redações"]'), 'gráfico ausente');
      const dots = await page.$$eval('svg[aria-label="Evolução da nota nas redações"] [role="button"]', e => e.length);
      assert(dots === 4, `esperava 4 pontos (3 injetadas + a de 640), veio ${dots}`); // 640 do teste anterior
      assert(await noHorizontalScroll(), 'rolagem horizontal no histórico');
      await click('Manipulação do comportamento', { nth: 0 });
      await waitText('Autoavaliação · 5 competências');
      assert(await hasText('C5') && await hasText('Proposta'), 'detalhe por competência ausente');
    });
    await check('excluir uma redação pede confirmação e dá para DESFAZER (o texto volta inteiro)', async () => {
      const before = (await redacaoRows()).length;
      await click('Excluir redação', { nth: 0 });
      await waitText('Excluir redação?');
      await click('Sim, excluir');
      await waitText('Redação excluída');
      assert((await redacaoRows()).length === before - 1, 'a redação não foi excluída');
      await click('Desfazer');
      await waitFor(async () => (await redacaoRows()).length === before, 'redação de volta');
    });

    await check('telas da Redação sem rolagem lateral e com o cabeçalho da escrita inteiro em 320, 360, 390, 768 e 1280', async () => {
      await target.pressBack(); // fecha o histórico
      await idb('redacaoSessions', 'put', {
        id: 'e2e-layout', themeId: 'enem-2017', themeTitle: 'Desafios para a formação educacional de surdos no Brasil',
        startedAt: Date.now(), lastSavedAt: Date.now(), completedAt: null, durationMinutes: 5, text: TEXT, wordCount: 38,
        competencyScores: null, estimatedScore: null, notes: '', elapsedMs: 5 * 60_000,
      });
      await reload();
      for (const [w, h] of [[320, 568], [360, 640], [390, 844], [768, 1024], [1280, 800]]) {
        await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 768, hasTouch: w < 768 });
        await sleep(400);
        if (!(await writerOpen())) {
          await openRedacao();
          await click('Continuar', { exact: true });
        }
        await waitFor(writerOpen, `escrita em ${w}`);
        assert(await noHorizontalScroll(), `rolagem horizontal na escrita a ${w}px`);
        const inside = await page.evaluate(() => {
          const vw = window.innerWidth;
          return [...document.querySelectorAll('[data-testid="redacao-writer"] button')]
            .slice(0, 6).every(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= vw; });
        });
        assert(inside, `botões do cabeçalho fora da tela a ${w}px`);
        assert(await page.$('[data-testid="redacao-footer"]'), `rodapé "Concluir" ausente a ${w}px`);
      }
      await page.setViewport(MOBILE);
      await sleep(500);
      if (!(await writerOpen())) { await openRedacao(); await click('Continuar', { exact: true }); }
      await target.pressBack();
      await click('Sair e guardar rascunho');
      await waitFor(async () => !(await writerOpen()), 'sair da escrita');
    });
  }

  // ── Layout / plataforma ──
  if (!isAndroid) {
    group('Layout');
    await check('desktop: sidebar visível e barra inferior oculta', async () => {
      await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
      await sleep(300);
      const r = await page.evaluate(() => ({
        aside: getComputedStyle(document.querySelector('aside')).display,
        bottom: getComputedStyle(document.querySelector('nav.fixed')).display,
      }));
      assert(r.aside !== 'none', 'sidebar escondida no desktop');
      assert(r.bottom === 'none', 'barra inferior visível no desktop');
      await page.setViewport(MOBILE);
    });
  } else {
    group('Botão voltar na raiz');
    await check('voltar na aba Ciclo (sem telas abertas) fecha o app', async () => {
      await android.pressBack();
      await sleep(800);
      assert(!android.focusedApp().match(new RegExp(`mCurrentFocus=.*${APP_ID}`)), 'o app continua em primeiro plano');
    });
  }

  if (PREVIEW) {
    group('PWA (build de produção)');
    await check('manifest válido: nome, ícones 192/512 e maskable', async () => {
      const href = await page.evaluate(() => document.querySelector('link[rel="manifest"]')?.href);
      assert(href, 'sem <link rel="manifest">');
      const m = await (await fetch(href)).json();
      assert(m.name === 'Sprint' && m.display === 'standalone' && m.lang === 'pt-BR', 'nome/display/lang incorretos');
      const sizes = m.icons.map(i => `${i.sizes}${i.purpose ? `:${i.purpose}` : ''}`);
      assert(['192x192', '512x512', '512x512:maskable'].every(s => sizes.includes(s)), `ícones: ${sizes.join(', ')}`);
      for (const i of m.icons) assert((await fetch(new URL(i.src, href))).ok, `ícone ausente: ${i.src}`);
    });
    await check('service worker ativo e controlando a página', async () => {
      await page.evaluate(() => navigator.serviceWorker.ready);
      await reload();
      assert(await page.evaluate(() => !!navigator.serviceWorker.controller), 'página sem service worker controlando');
    });
    await check('Ajustes oferece verificar atualizações e conclui', async () => {
      await click('Ajustes');
      await click('Verificar atualizações');
      await waitText('versão mais recente', 6000);
    });
    await check('app abre e funciona sem rede (offline)', async () => {
      await page.setOfflineMode(true);
      try {
        await page.reload({ waitUntil: 'load' });
        await waitFor(async () => !(await page.$('.animate-spin')), 'fim do carregamento offline', 10000);
        await waitText('DevInfo'); // nome vindo do IndexedDB: prova que shell e dados carregaram
        // `navigator.onLine` demora a refletir a emulação depois do reload; o que vale é a rede de fato inacessível.
        const reachable = await page.evaluate(() =>
          fetch(`/__sem_rede__?${Date.now()}`, { cache: 'no-store' }).then(() => true, () => false));
        assert(!reachable, 'a rede ainda responde: o teste offline não está valendo');
      } finally {
        await page.setOfflineMode(false);
      }
    });
  }

  group('Saúde');
  await check('sem requisições a servidores externos (offline-first)', async () => {
    assert(externalRequests.length === 0, `requisições externas: ${externalRequests.slice(0, 3).join(', ')}`);
  });
  await check('sem erros no console', async () => {
    // A requisição de prova do teste offline falha de propósito e o Chrome a registra no console: aceita 1 só.
    let offlineProbeErrors = PREVIEW ? 1 : 0;
    const real = pageErrors.filter(e => {
      if (/favicon|DevTools|Download the React DevTools/i.test(e)) return false;
      if (/ERR_INTERNET_DISCONNECTED/.test(e) && offlineProbeErrors > 0) { offlineProbeErrors--; return false; }
      return true;
    });
    assert(real.length === 0, `${real.length} erro(s): ${real.slice(0, 2).join(' | ')}`);
  });
}

async function cleanup() {
  if (opt('keep')) return;
  try { isAndroid ? await browser?.disconnect() : await browser?.close(); } catch { /* ignorado */ }
  if (devServer?.pid) {
    if (isWin) spawnSync('taskkill', ['/pid', String(devServer.pid), '/T', '/F']);
    else devServer.kill();
  }
}

try {
  await main();
} catch (e) {
  results.push({ name: 'execução', ok: false, error: e.message });
  console.error(`\nErro fatal: ${e.message}`);
} finally {
  await cleanup();
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações passaram (${TARGET}).`);
if (failed.length) {
  console.log('Falhas:');
  failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
}
process.exit(failed.length ? 1 : 0);
