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
import { existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = fileURLToPath(new URL('../..', import.meta.url));
const artifacts = join(root, 'scripts', 'e2e', '.artifacts');
const APP_ID = 'com.workeric08.sprint';
const isWin = process.platform === 'win32';

// ── argumentos ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};
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
      if (top && (el === top || el.contains(top))) hits.push({ x, y });
    }
    return hits[nth] ?? null;
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
        assert(await page.evaluate(() => navigator.onLine === false), 'o navegador não está offline');
        await waitText('DevInfo'); // nome vindo do IndexedDB: prova que shell e dados carregaram sem rede
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
    const real = pageErrors.filter(e => !/favicon|DevTools|Download the React DevTools/i.test(e));
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
