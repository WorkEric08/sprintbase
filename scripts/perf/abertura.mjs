// Mede a abertura animada (index.html + services/abertura.ts): quando a tela inicial fica pronta, contando a partir do
// primeiro quadro da abertura (`window.__aberturaInicio`), com a CPU 1×, 6×, 10× e 20× mais lenta.
//
//   npm run perf:abertura                       constrói, mede (5 cargas por velocidade) e mostra a mediana
//   npm run perf:abertura -- --quadros          também conta os quadros mostrados nos primeiros 1,3 s (CPU 6×), com o desenho
//                                               por `transform` (o do app) e com um contorno em SVG (`stroke-dashoffset`, na thread principal)
//   opções: --runs 5  --cpu 1,6,10,20  --taxa-quadros 6  --no-build  --logs 1500  --subjects 8  --blocks 60  --chrome <caminho>
//
// É o Chrome do PC, não o WebView do celular: serve para comparar versões e velocidades entre si. Mostra o limite em
// que o app deixa de ficar pronto antes de a abertura começar a sair (1680 ms).
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../..', import.meta.url));
const isWin = process.platform === 'win32';
const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};
const RUNS = Number(opt('runs', 5));
const RATES = String(opt('cpu', '1,6,10,20')).split(',').map(Number);
const LOGS = Number(opt('logs', 1500));
const SUBJECTS = Number(opt('subjects', 8));
const BLOCKS = Number(opt('blocks', 60));
const DIST = '.abertura-dist';
const DIST_SVG = '.perf-abertura-svg';
const PORT = 4178;
const PORT_SVG = 4179;
const INICIO_DA_SAIDA_MS = 1680; // 2000 − 320 de fade
const sleep = ms => new Promise(r => setTimeout(r, ms));
const median = a => { const s = a.filter(v => v !== null && v !== undefined).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const npx = isWin ? 'npx.cmd' : 'npx';

if (!opt('no-build', false)) {
  console.log('Build de produção…');
  const b = spawnSync(npx, ['vite', 'build', '--outDir', DIST, '--emptyOutDir'], { cwd: root, shell: isWin, stdio: 'ignore' });
  if (b.status !== 0) { console.error('vite build falhou'); process.exit(1); }
}
const html = readFileSync(join(root, DIST, 'index.html'), 'utf-8');
if (!html.includes('id="abertura"')) { console.error(`${DIST}/index.html não tem a abertura: rode sem --no-build`); process.exit(1); }

const servidores = [];
function servir(dir, porta) {
  const s = spawn(npx, ['vite', 'preview', '--outDir', dir, '--port', String(porta), '--strictPort'], { cwd: root, shell: isWin, stdio: 'ignore' });
  servidores.push(s);
  return s;
}
const encerrar = () => { for (const s of servidores) { if (isWin) spawnSync('taskkill', ['/pid', String(s.pid), '/T', '/F'], { stdio: 'ignore' }); else s.kill(); } };
process.on('exit', encerrar);
const aguardar = async url => { for (let i = 0; i < 60 && !(await fetch(url).then(r => r.ok).catch(() => false)); i++) await sleep(300); };

// Variante "antes": o contorno é um círculo SVG desenhado com `stroke-dashoffset`, que só anda na thread principal
// (é o erro que a abertura evita). Serve só para comparar quadros: o resto é igual.
function variantePorSvg() {
  rmSync(join(root, DIST_SVG), { recursive: true, force: true });
  cpSync(join(root, DIST), join(root, DIST_SVG), { recursive: true });
  const meias = /<div class="ab-metade ab-metade--d">[\s\S]*?<\/div>\s*<div class="ab-metade ab-metade--e">[\s\S]*?<\/div>/;
  const svg = '<svg viewBox="0 0 1024 1024" style="position:absolute;inset:0;width:100%;height:100%"><circle cx="512" cy="574" r="272.5" fill="none" stroke="#6a5cff" stroke-width="49" pathLength="1" stroke-dasharray="1" transform="rotate(-90 512 574)" style="animation:ab-traco 800ms cubic-bezier(.65,0,.35,1) backwards"/></svg>';
  if (!meias.test(html)) throw new Error('não achei as metades do anel no index.html');
  const mudado = html.replace(meias, svg).replace('@keyframes ab-x', '@keyframes ab-traco { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }\n    @keyframes ab-x');
  writeFileSync(join(root, DIST_SVG, 'index.html'), mudado);
}

const chrome = [
  typeof opt('chrome') === 'string' ? opt('chrome') : null,
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter(Boolean).find(existsSync);
if (!chrome) { console.error('Chrome não encontrado.'); process.exit(1); }

servir(DIST, PORT);
await aguardar(`http://localhost:${PORT}/`);
const url = `http://localhost:${PORT}/`;
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, userDataDir: mkdtempSync(join(tmpdir(), 'sprint-perf-abertura-')) });
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

function instalarRelogio() {
  const ab = (window.__ab = { saiu: null, removida: null, vista: false });
  new MutationObserver(() => {
    const el = document.getElementById('abertura');
    const inicio = window.__aberturaInicio ?? 0;
    if (el) ab.vista = true;
    if (el?.hasAttribute('data-saindo') && ab.saiu === null) ab.saiu = performance.now() - inicio;
    if (!el && ab.vista && ab.removida === null) ab.removida = performance.now() - inicio;
  }).observe(document, { subtree: true, childList: true, attributes: true });
}

async function novaPagina(taxa, endereco = url) {
  const page = await browser.newPage();
  await page.setViewport(MOBILE);
  await page.setBypassServiceWorker(true);
  await page.setCacheEnabled(false);
  await page.evaluateOnNewDocument(instalarRelogio);
  if (taxa > 1) await (await page.createCDPSession()).send('Emulation.setCPUThrottlingRate', { rate: taxa });
  return page;
}

// 1) Enche o banco com dados realistas (o mesmo de `npm run perf`).
{
  const page = await novaPagina(1);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => performance.getEntriesByName('sprint:ready').length > 0, { timeout: 30000 });
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

// 2) Tempo até a tela inicial pronta, contado do primeiro quadro da abertura.
console.log(`\nAbertura × velocidade da CPU (mediana de ${RUNS} cargas; ${SUBJECTS} matérias, ${LOGS} registros no banco)`);
console.log('  CPU   tela inicial pronta   abertura começa a sair   abertura some     app pronto antes de 1680 ms?');
for (const taxa of RATES) {
  const amostras = [];
  for (let i = 0; i < RUNS + 1; i++) { // a 1ª carga esquenta o disco e não conta
    const page = await novaPagina(taxa);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => performance.getEntriesByName('sprint:ready').length > 0 && window.__ab.removida !== null, { timeout: 120000 });
    const m = await page.evaluate(() => ({
      pronto: performance.getEntriesByName('sprint:ready')[0].startTime - window.__aberturaInicio,
      saiu: window.__ab.saiu,
      removida: window.__ab.removida,
    }));
    await page.close();
    if (i > 0) amostras.push(m);
  }
  const pronto = median(amostras.map(a => a.pronto));
  const saiu = median(amostras.map(a => a.saiu));
  const removida = median(amostras.map(a => a.removida));
  const antes = amostras.filter(a => a.pronto < INICIO_DA_SAIDA_MS).length;
  console.log(`  ${(taxa + '×').padEnd(5)} ${(pronto.toFixed(0) + ' ms').padStart(12)} ${(saiu.toFixed(0) + ' ms').padStart(24)} ${(removida.toFixed(0) + ' ms').padStart(15)}     ${antes}/${amostras.length}${antes === amostras.length ? '' : '  (a abertura espera o app: o logo fica parado até ele abrir)'}`);
}

// 3) Quadros mostrados nos primeiros 1,3 s: desenho por transform (o do app) × contorno em SVG com stroke-dashoffset.
if (opt('quadros', false)) {
  const TAXA = Number(opt('taxa-quadros', 6));
  variantePorSvg();
  servir(DIST_SVG, PORT_SVG);
  await aguardar(`http://localhost:${PORT_SVG}/`);

  // Quanto do contorno está desenhado em cada quadro (36 pontos sobre o anel, de 10 em 10°): é o que mostra se o
  // desenho anda de verdade ou fica parado enquanto a thread principal está ocupada.
  const q = Math.min(0.586 * Math.min(MOBILE.width, MOBILE.height), 380);
  const u = q / 1024;
  const x0 = MOBILE.width / 2 - q / 2;
  const y0 = MOBILE.height / 2 - q / 2;
  const pontos = Array.from({ length: 36 }, (_, i) => {
    const rad = (i * 10 * Math.PI) / 180;
    return [Math.round(x0 + u * (512 + 272.5 * Math.sin(rad))), Math.round(y0 + u * (574 - 272.5 * Math.cos(rad)))];
  });
  const roxo = (d, i) => d[i + 2] > 150 && d[i] > 50 && d[i] < 170 && d[i + 1] < 140;

  async function contarQuadros(endereco) {
    const page = await novaPagina(TAXA);
    const cdp = await page.createCDPSession();
    const quadros = [];
    cdp.on('Page.screencastFrame', f => {
      quadros.push({ t: f.metadata.timestamp, dados: f.data });
      void cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 40, everyNthFrame: 1, maxWidth: MOBILE.width, maxHeight: MOBILE.height });
    void page.goto(endereco, { waitUntil: 'load', timeout: 0 }).catch(() => {});
    await page.waitForFunction(() => window.__aberturaInicio !== undefined, { timeout: 60000 });
    const inicio = (await page.evaluate(() => performance.timeOrigin + window.__aberturaInicio)) / 1000; // mesma época dos quadros
    await sleep(1400 * Math.max(1, TAXA / 6));
    const ate13 = quadros.filter(f => f.t >= inicio && f.t - inicio <= 1.3);
    const desenhados = [];
    for (const f of ate13) {
      const { data, info } = await sharp(Buffer.from(f.dados, 'base64')).raw().toBuffer({ resolveWithObject: true });
      desenhados.push(pontos.filter(([x, y]) => roxo(data, (y * info.width + x) * info.channels)).length);
    }
    // instantes em que o contorno avançou, e a maior espera entre dois avanços
    const avancos = ate13.filter((f, i) => i > 0 && desenhados[i] > Math.max(...desenhados.slice(0, i))).map(f => f.t);
    let maior = 0;
    for (let i = 1; i < avancos.length; i++) maior = Math.max(maior, avancos[i] - avancos[i - 1]);
    await cdp.send('Page.stopScreencast').catch(() => {});
    await page.close();
    return { quadros: ate13.length, avancos: avancos.length, maiorEsperaMs: maior * 1000 };
  }

  console.log(`\nQuadros mostrados nos primeiros 1,3 s (CPU ${TAXA}× mais lenta, mediana de ${RUNS} cargas)`);
  for (const [nome, endereco] of [['só transform (o do app)', url], ['contorno SVG com stroke-dashoffset', `http://localhost:${PORT_SVG}/`]]) {
    const r = [];
    for (let i = 0; i < RUNS; i++) r.push(await contarQuadros(endereco));
    console.log(`  ${nome.padEnd(36)} ${String(median(r.map(x => x.quadros))).padStart(3)} quadros; o contorno avançou em ${String(median(r.map(x => x.avancos))).padStart(2)}; maior espera entre dois avanços: ${median(r.map(x => x.maiorEsperaMs)).toFixed(0)} ms`);
  }
  rmSync(join(root, DIST_SVG), { recursive: true, force: true });
}

await browser.close();
encerrar();
