// Mede a inicialização do app (do carregamento até a tela inicial pintada com os dados).
//
//   npm run perf                         constrói (modo android = o mesmo bundle do APK), mede e mostra a mediana
//   npm run perf -- --label antes        também salva o resultado como "antes"
//   npm run perf -- --compare antes      mostra a diferença para um resultado salvo
//   opções: --runs 7  --cpu 4 (CPU N× mais lenta, para lembrar um celular)  --logs 1500  --subjects 8  --blocks 60  --no-build
//
// É o Chrome no PC, não o WebView do celular: serve para comparar versões entre si (e achar o que é pesado),
// não para dizer quantos milissegundos o seu aparelho leva. Para o aparelho real, use as marcas
// `sprint:*` (utils/perf.ts) no chrome://inspect.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = fileURLToPath(new URL('../..', import.meta.url));
const outDir = join(root, '.perf-dist');
const resultsDir = join(root, 'scripts', 'perf', '.results');
const isWin = process.platform === 'win32';
const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};
const RUNS = Number(opt('runs', 7));
const CPU = Number(opt('cpu', 4));
const LOGS = Number(opt('logs', 1500));
const SUBJECTS = Number(opt('subjects', 8));
const BLOCKS = Number(opt('blocks', 60)); // meta de blocos por matéria (cada um vira um quadradinho no cartão)
const PORT = 4176;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const median = a => { if (a.length === 0) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const npx = isWin ? 'npx.cmd' : 'npx';

if (!opt('no-build', false)) {
  console.log('Build (modo android, sem service worker)…');
  const b = spawnSync(npx, ['vite', 'build', '--mode', 'android', '--outDir', '.perf-dist', '--emptyOutDir'], { cwd: root, shell: isWin, stdio: 'ignore' });
  if (b.status !== 0) { console.error('vite build falhou'); process.exit(1); }
}

const server = spawn(npx, ['vite', 'preview', '--outDir', '.perf-dist', '--port', String(PORT), '--strictPort'], { cwd: root, shell: isWin, stdio: 'ignore' });
const url = `http://localhost:${PORT}/`;
for (let i = 0; i < 60 && !(await fetch(url).then(r => r.ok).catch(() => false)); i++) await sleep(500);

const chrome = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(existsSync);
if (!chrome) { console.error('Chrome não encontrado.'); process.exit(1); }

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, userDataDir: mkdtempSync(join(tmpdir(), 'sprint-perf-')) });
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

async function newPage({ throttle }) {
  const page = await browser.newPage();
  await page.setViewport(MOBILE);
  await page.setCacheEnabled(false);
  if (throttle) await (await page.createCDPSession()).send('Emulation.setCPUThrottlingRate', { rate: CPU });
  return page;
}

// 1) Cria o banco (o app abre uma vez) e o enche com dados realistas.
{
  const page = await newPage({ throttle: false });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => performance.getEntriesByName('sprint:ready').length > 0, { timeout: 20000 });
  await page.evaluate(({ LOGS, SUBJECTS, BLOCKS }) => new Promise((resolve, reject) => {
    const req = indexedDB.open('SprintDB');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(['subjects', 'blockLogs', 'settings'], 'readwrite');
      const now = Date.now();
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16'];
      for (let s = 0; s < SUBJECTS; s++) {
        tx.objectStore('subjects').put({
          id: `s${s}`, title: `Matéria ${s + 1}`, color: colors[s % 8], duration: 25, blockCount: BLOCKS, createdAt: s,
          completedBlocks: Array.from({ length: 40 }, (_, i) => ({ timestamp: now - (i * 3 + s) * 86_400_000 / 2, type: 'study' })),
        });
      }
      for (let i = 0; i < LOGS; i++) {
        tx.objectStore('blockLogs').put({
          id: `l${i}`, subjectId: `s${i % Math.max(SUBJECTS, 1)}`, subjectTitle: `Matéria ${(i % 8) + 1}`, subjectColor: colors[i % 8],
          timestamp: now - Math.floor(i / 12) * 86_400_000 - (i % 12) * 3_600_000, questionsTotal: 10, questionsCorrect: 7,
          subtopic: `Tópico ${i % 25}`, selfScore: 4, flaggedForReview: false, blockType: 'study',
        });
      }
      tx.objectStore('settings').put({ key: 'user_name', value: 'Estudante' });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  }), { LOGS, SUBJECTS, BLOCKS });
  await page.close();
}

// 2) Mede.
const samples = [];
for (let i = 0; i < RUNS + 1; i++) { // a 1ª rodada esquenta o disco e não conta
  const page = await newPage({ throttle: true });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => performance.getEntriesByName('sprint:ready').length > 0, { timeout: 60000 });
  const m = await page.evaluate(async () => {
    const mk = n => performance.getEntriesByName(`sprint:${n}`)[0]?.startTime ?? null;
    const res = performance.getEntriesByType('resource');
    const kind = r => (/\.js(\?|$)/.test(r.name) ? 'js' : /\.css(\?|$)/.test(r.name) ? 'css' : /\.(woff2?|ttf)(\?|$)/.test(r.name) ? 'font' : 'other');
    const bytes = k => res.filter(r => kind(r) === k).reduce((a, r) => a + r.encodedBodySize, 0);
    await document.fonts.ready;
    return {
      fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
      boot: mk('boot'), dataStart: mk('data-start'), dataLoaded: mk('data-loaded'), render: mk('render'), commit: mk('commit'), ready: mk('ready'),
      fontsReady: performance.now(),
      jsKB: bytes('js') / 1024, cssKB: bytes('css') / 1024, fontKB: bytes('font') / 1024, requests: res.length,
    };
  });
  await page.close();
  if (i > 0) samples.push(m);
}

await browser.close();
if (isWin) spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' }); else server.kill();

const keys = ['fcp', 'boot', 'dataLoaded', 'render', 'commit', 'ready', 'fontsReady', 'jsKB', 'cssKB', 'fontKB', 'requests'];
const result = Object.fromEntries(keys.map(k => [k, median(samples.map(s => s[k]).filter(v => v !== null))]));
result.dbMs = median(samples.map(s => s.dataLoaded - s.dataStart));

const label = opt('label', null);
if (typeof label === 'string') {
  mkdirSync(resultsDir, { recursive: true });
  writeFileSync(join(resultsDir, `${label}.json`), JSON.stringify(result, null, 2));
}
const cmp = opt('compare', null);
const base = typeof cmp === 'string' && existsSync(join(resultsDir, `${cmp}.json`)) ? JSON.parse(readFileSync(join(resultsDir, `${cmp}.json`), 'utf-8')) : null;

const rows = [
  ['primeira pintura (FCP)', 'fcp', 'ms'], ['JS começou a rodar', 'boot', 'ms'], ['leitura do banco', 'dbMs', 'ms'],
  ['dados carregados', 'dataLoaded', 'ms'], ['React começou (render)', 'render', 'ms'], ['React montou (commit)', 'commit', 'ms'], ['TELA INICIAL PRONTA', 'ready', 'ms'], ['ícones (fonte) prontos', 'fontsReady', 'ms'],
  ['JS baixado', 'jsKB', 'KB'], ['CSS baixado', 'cssKB', 'KB'], ['fontes baixadas', 'fontKB', 'KB'], ['requisições', 'requests', ''],
];
console.log(`\nInicialização (mediana de ${RUNS} cargas, CPU ${CPU}× mais lenta, ${SUBJECTS} matérias, ${LOGS} registros no banco)`);
for (const [name, key, unit] of rows) {
  const v = result[key];
  const fmt = n => (n === null || n === undefined ? 'n/d' : unit === 'KB' || unit === 'ms' ? n.toFixed(0) : String(Math.round(n)));
  let line = `  ${name.padEnd(26)} ${fmt(v).padStart(6)} ${unit}`;
  if (base && base[key] !== undefined && base[key] !== null && v !== null) {
    const d = v - base[key];
    line += `   (antes ${fmt(base[key])}, ${d <= 0 ? '' : '+'}${fmt(d)})`;
  }
  console.log(line);
}
