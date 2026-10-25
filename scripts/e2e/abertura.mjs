// Testes ponta a ponta da abertura (animação de 2 s do logo, index.html + services/abertura.ts), no Chrome.
//
//   npm run e2e:abertura                 constrói o app (build de produção), serve na porta 4177 e roda tudo
//   npm run e2e:abertura -- --no-build   usa o que já está em .abertura-dist
//   npm run e2e:abertura -- --dist <pasta> --no-build   serve outra pasta (para conferir que o teste reprova uma versão quebrada)
//   opções: --chrome <caminho>  --headful
//
// Diferente de scripts/e2e/run.mjs (que liga a chave sprint-abertura-ms em 0 para a abertura não atrapalhar), aqui a
// duração é a de verdade. O service worker fica desligado (assim as requisições do app podem ser seguradas/derrubadas).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
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
const DIST = typeof opt('dist') === 'string' ? opt('dist') : '.abertura-dist';
const PORT = 4177;
const URL_APP = `http://localhost:${PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const npx = isWin ? 'npx.cmd' : 'npx';

// ── servidor ─────────────────────────────────────────────────────────────────
function construir() {
  console.log('Build de produção…');
  const b = spawnSync(npx, ['vite', 'build', '--outDir', DIST, '--emptyOutDir'], { cwd: root, shell: isWin, stdio: 'ignore' });
  if (b.status !== 0) throw new Error('vite build falhou');
  // O build pode falhar sem aviso em outros caminhos e deixar um dist velho: confere que é o desta versão.
  const html = readFileSync(join(root, DIST, 'index.html'), 'utf-8');
  for (const marca of ['id="abertura"', 'ab-visto', 'sprint-abertura-ms']) {
    if (!html.includes(marca)) throw new Error(`o build não tem "${marca}" no index.html`);
  }
}
if (!opt('no-build', false)) construir();
if (!existsSync(join(root, DIST, 'index.html'))) throw new Error(`${DIST}/index.html não existe (rode sem --no-build)`);

// Uma porta ocupada por um servidor esquecido serviria OUTRO build e os testes passariam/reprovariam por engano.
if (await fetch(URL_APP).then(() => true, () => false)) throw new Error(`a porta ${PORT} já está em uso (um vite preview esquecido?): encerre-o e rode de novo`);
const servidor = spawn(npx, ['vite', 'preview', '--outDir', DIST, '--port', String(PORT), '--strictPort'], { cwd: root, shell: isWin, stdio: 'ignore' });
const encerrarServidor = () => { if (isWin) spawnSync('taskkill', ['/pid', String(servidor.pid), '/T', '/F'], { stdio: 'ignore' }); else servidor.kill(); };
process.on('exit', encerrarServidor);
for (let i = 0; i < 60 && !(await fetch(URL_APP).then(r => r.ok).catch(() => false)); i++) await sleep(300);
const servido = await fetch(URL_APP).then(r => r.text()).catch(() => '');
if (servido.replace(/\s+/g, '') !== readFileSync(join(root, DIST, 'index.html'), 'utf-8').replace(/\s+/g, '')) throw new Error(`o servidor não está servindo ${DIST}/index.html`);

const chrome = [
  typeof opt('chrome') === 'string' ? opt('chrome') : null,
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean).find(existsSync);
if (!chrome) throw new Error('Chrome não encontrado. Use --chrome <caminho> ou CHROME_PATH.');
const browser = await puppeteer.launch({ executablePath: chrome, headless: !opt('headful'), args: ['--no-first-run'] });

// ── páginas ──────────────────────────────────────────────────────────────────
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true };
const ehScriptPrincipal = url => /\/assets\/index-[^/]+\.js(\?|$)/.test(url);

/** Instalado antes de qualquer script da página: anota quando a abertura começou a sair e quando sumiu. */
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

/**
 * Abre o app numa janela anônima nova (localStorage limpo).
 *  - chave: valor de sprint-abertura-ms (omitido = duração de verdade)
 *  - bloquear: derruba o script principal do app; atrasarMs: segura o script principal por esse tempo
 *  - reduzido: prefers-reduced-motion: reduce
 *  - antes: função executada na página antes de tudo (evaluateOnNewDocument)
 */
async function abrir({ chave, bloquear = false, atrasarMs = 0, reduzido = false, antes, esperar = 'domcontentloaded' } = {}) {
  const contexto = await browser.createBrowserContext();
  const page = await contexto.newPage();
  await page.setViewport(MOBILE);
  await page.setBypassServiceWorker(true);
  if (reduzido) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(instalarRelogio);
  await page.evaluateOnNewDocument(auxiliaresDaPagina);
  if (chave !== undefined) await page.evaluateOnNewDocument(c => { try { localStorage.setItem('sprint-abertura-ms', c); } catch { /* ok */ } }, String(chave));
  if (antes) await page.evaluateOnNewDocument(antes);
  const controle = { liberar: false };
  if (bloquear || atrasarMs) {
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (!ehScriptPrincipal(req.url())) return void req.continue().catch(() => {});
      if (bloquear && !controle.liberar) return void req.abort('failed').catch(() => {});
      if (atrasarMs) setTimeout(() => req.continue().catch(() => {}), atrasarMs);
      else void req.continue().catch(() => {});
    });
  }
  // `goto` espera o DOMContentLoaded, que (com o script principal segurado) só chega depois: não espera aqui.
  const ida = page.goto(URL_APP, { waitUntil: esperar, timeout: 0 }).catch(() => {});
  return { page, contexto, controle, ida, fechar: () => contexto.close().catch(() => {}) };
}

// ── resultados ───────────────────────────────────────────────────────────────
const resultados = [];
async function check(nome, fn) {
  const t0 = Date.now();
  try {
    await fn();
    resultados.push({ nome, ok: true });
    console.log(`  ✓ ${nome} (${Date.now() - t0} ms)`);
  } catch (e) {
    resultados.push({ nome, ok: false, erro: e.message });
    console.log(`  ✗ ${nome}\n      ${e.message}`);
  }
}
const grupo = titulo => console.log(`\n${titulo}`);
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function perto(valor, esperado, tolerancia, o_que) {
  assert(Math.abs(valor - esperado) <= tolerancia, `${o_que}: ${Number(valor).toFixed(3)} (esperado ${Number(esperado).toFixed(3)} ± ${tolerancia})`);
}

/** Curva cubic-bezier(x1, y1, x2, y2) do CSS: progresso (0..1) no instante `x` (0..1). */
function bezier(x1, y1, x2, y2) {
  const eixo = (a, b, u) => 3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u * u * b + u ** 3;
  return x => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1;
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (eixo(x1, x2, m) < x) lo = m; else hi = m; }
    return eixo(y1, y2, (lo + hi) / 2);
  };
}
const CURVAS = {
  gira: bezier(0.65, 0, 0.35, 1), // o ponteiro (e o desenho do contorno como um todo): 800 ms
  nasce: bezier(0.3, 1.5, 0.5, 1), // visto (640 ms, 360 ms) e haste (250 ms, 240 ms)
  barra: bezier(0.2, 0.8, 0.2, 1), // barra do topo (60 ms, 300 ms)
};

// ── leitura das peças (roda dentro da página) ────────────────────────────────
/** Instalado em toda página (antes de tudo): funções que leem as peças do logo. */
function auxiliaresDaPagina() {
  /** Escala e ângulo de cada peça, lidos do `transform` calculado (é o valor que o navegador está animando). */
  const lerPecas = () => {
    const matriz = sel => {
      const t = getComputedStyle(document.querySelector(sel)).transform;
      const m = new DOMMatrixReadOnly(t === 'none' ? undefined : t);
      return { x: Math.hypot(m.a, m.b), y: Math.hypot(m.c, m.d), graus: (Math.atan2(m.b, m.a) * 180) / Math.PI };
    };
    const d = matriz('.ab-metade--d .ab-arco');
    const e = matriz('.ab-metade--e .ab-arco');
    return {
      barra: matriz('.ab-barra').x,
      haste: matriz('.ab-haste i').x,
      visto: matriz('.ab-visto').x,
      ponteiroAltura: matriz('.ab-ponteiro i').y,
      ponteiro: ((matriz('.ab-ponteiro').graus % 360) + 360) % 360, // 0..360 a favor do relógio
      arcoD: d.graus > 1 ? d.graus - 360 : d.graus, // -180 → 0
      arcoE: e.graus < -1 ? e.graus + 360 : e.graus, // 0 → 180
    };
  };
  window.__lerPecas = lerPecas;

  /** Congela todas as animações do logo no instante `t` (ms): quadro exato, sem depender de sorte com o relógio. */
  window.__irPara = t => {
    const el = document.getElementById('abertura');
    document.getAnimations().filter(a => el.contains(a.effect.target) && a.effect.target !== el).forEach(a => { a.pause(); a.currentTime = t; });
    return lerPecas();
  };

  /** Lê as peças no primeiro quadro em que o relógio da animação `ab-gira` passa de cada instante de `alvos` (ms). */
  window.__amostrar = alvos => new Promise(resolve => {
    const saida = [];
    const tick = () => {
      const gira = document.getAnimations().find(a => a.animationName === 'ab-gira');
      // depois de acabar, o `ab-gira` some da lista: o relógio passa a ser o da página
      const t = gira ? gira.currentTime : window.__aberturaInicio === undefined ? -1 : performance.now() - window.__aberturaInicio;
      if (t >= alvos[saida.length]) saida.push({ alvo: alvos[saida.length], t, pecas: lerPecas() });
      if (saida.length === alvos.length) resolve(saida);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Quanto do contorno já está desenhado, em graus a partir das 12 h, a favor do relógio (as metades em sequência). */
const desenhado = p => p.arcoD + 180 + p.arcoE;

/** Cor de um pixel de uma captura (PNG) nas coordenadas da página. */
async function pixels(png) {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  return (x, y) => {
    const i = (Math.round(y) * info.width + Math.round(x)) * info.channels;
    return { r: data[i], g: data[i + 1], b: data[i + 2] };
  };
}
const roxo = c => c.b > 200 && c.r > 70 && c.r < 140; // #6a5cff
const preto = c => c.r < 20 && c.g < 20 && c.b < 20;

/** Posição, na tela, de um ponto do quadro do logo (coordenadas do ícone de 1024 × 1024). */
async function pontoDoQuadro(page) {
  const q = await page.evaluate(() => { const r = document.querySelector('.ab-quadro').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
  return (ux, uy) => ({ x: q.x + (q.w / 1024) * ux, y: q.y + (q.w / 1024) * uy });
}

// ── os testes ────────────────────────────────────────────────────────────────
console.log(`Abertura · ${URL_APP} (${DIST})`);

grupo('Animação');
await check('quadros em ~60, 400, 730 e 1300 ms (escala/ângulo de cada peça lidos do transform)', async () => {
  // A amostragem começa antes da página (a cada quadro, a partir do primeiro): nada se perde na ida e volta do teste.
  const { page, ida, fechar } = await abrir({ chave: 60000, antes: () => { window.__amostragem = window.__amostrar([60, 400, 730, 1300]); } });
  try {
    await ida;
    const quadros = await page.evaluate(() => window.__amostragem);
    assert(quadros.length === 4, 'faltaram quadros');
    for (const { alvo, t, pecas: p } of quadros) {
      const nome = `${alvo} ms (relógio ${t.toFixed(0)})`;
      assert(t - alvo < 250, `${nome}: o quadro veio tarde demais`);
      const mao = 360 * CURVAS.gira(Math.min(t, 800) / 800);
      // o ponteiro anda pela curva e o contorno desenhado o acompanha (as duas metades em sequência)
      const dif = Math.abs(((p.ponteiro - mao + 540) % 360) - 180);
      assert(dif <= 2.5, `${nome}: ponteiro em ${p.ponteiro.toFixed(1)}° (esperado ${mao.toFixed(1)}°)`);
      if (t < 800) perto(desenhado(p), mao, 2.5, `${nome}: contorno desenhado (graus)`);
      else perto(desenhado(p), 360, 0.1, `${nome}: contorno completo`);
      if (t < 700) perto(p.visto, CURVAS.nasce(Math.max(0, t - 640) / 360), 0.06, `${nome}: escala do visto`);
      perto(p.haste, CURVAS.nasce(Math.max(0, t - 250) / 240), 0.06, `${nome}: escala da haste`);
      perto(p.barra, CURVAS.barra(Math.max(0, t - 60) / 300), 0.06, `${nome}: escala da barra do topo`);
    }
    // o quadro de 60 ms ainda mal começou; o de 1300 ms é o logo completo e parado
    const [q60, , q730, q1300] = quadros.map(q => q.pecas);
    assert(q60.visto === 0 && desenhado(q60) < 40, 'aos 60 ms o visto não pode existir e o contorno mal começou');
    assert(q730.visto > 0.05 && q730.ponteiroAltura < 1, 'aos 730 ms o visto está nascendo e o ponteiro encolhendo');
    perto(q1300.visto, 1, 0.001, '1300 ms: visto');
    perto(q1300.barra, 1, 0.001, '1300 ms: barra');
    perto(q1300.haste, 1, 0.001, '1300 ms: haste');
    perto(q1300.arcoD, 0, 0.01, '1300 ms: metade 1');
    perto(q1300.arcoE, 180, 0.01, '1300 ms: metade 2');
    perto(q1300.ponteiroAltura, 0, 0.001, '1300 ms: ponteiro sumiu');
  } finally { await fechar(); }
});

await check('ordem: o contorno se desenha em sequência, a partir das 12 h, a favor do relógio, e nunca anda para trás', async () => {
  const { page, fechar } = await abrir({ chave: 60000 });
  try {
    await page.waitForFunction(() => document.getElementById('abertura'), { timeout: 10000 });
    // começa no ponto certo: aos 319 ms o ponteiro está às 3 h; o contorno cobre das 12 h às 3 h e mais nada
    await page.evaluate(() => window.__irPara(319));
    const ponto = await pontoDoQuadro(page);
    const cor = await pixels(await page.screenshot({ type: 'png' }));
    const noAnel = graus => ponto(512 + 272.5 * Math.sin((graus * Math.PI) / 180), 574 - 272.5 * Math.cos((graus * Math.PI) / 180));
    for (const g of [5, 30, 60, 85]) { const { x, y } = noAnel(g); assert(roxo(cor(x, y)), `o anel devia estar desenhado a ${g}° (pixel ${JSON.stringify(cor(x, y))})`); }
    for (const g of [100, 150, 180, 270, 330, 355]) { const { x, y } = noAnel(g); assert(preto(cor(x, y)), `o anel não devia existir ainda a ${g}° (pixel ${JSON.stringify(cor(x, y))})`); }

    // e anda sempre para a frente, em sincronia com a curva (obs.: ao chegar ao fim cada animação sai da lista, por isso este laço vem por último)
    let anterior = -1;
    for (let t = 0; t <= 800; t += 20) {
      const p = await page.evaluate(t => window.__irPara(t), t);
      const d = desenhado(p);
      assert(d >= anterior - 0.01, `aos ${t} ms o contorno recuou (${d.toFixed(2)}° < ${anterior.toFixed(2)}°)`);
      anterior = d;
      perto(d, 360 * CURVAS.gira(t / 800), 1, `aos ${t} ms o contorno desenhado (graus)`);
      perto(p.ponteiro % 360, (360 * CURVAS.gira(t / 800)) % 360, 1, `aos ${t} ms o ponteiro (graus)`);
      assert(p.arcoD >= -180.01 && p.arcoD <= 0.01, `metade 1 fora do percurso (${p.arcoD})`);
      // a segunda metade só começa quando a primeira terminou
      if (p.arcoE > 0.5) assert(p.arcoD > -0.5, `aos ${t} ms a metade 2 começou antes de a metade 1 terminar`);
    }
    perto(anterior, 360, 0.1, 'o contorno chega a 360°');
  } finally { await fechar(); }
});

await check('centro: o logo está no centro da tela e o visto está no meio do contorno', async () => {
  const { page, fechar } = await abrir({ chave: 60000 });
  try {
    await page.waitForFunction(() => document.getElementById('abertura'), { timeout: 10000 });
    await page.evaluate(() => window.__irPara(1400));
    const g = await page.evaluate(() => {
      const r = sel => { const b = document.querySelector(sel).getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
      const uniao = rs => ({ l: Math.min(...rs.map(x => x.l)), t: Math.min(...rs.map(x => x.t)), r: Math.max(...rs.map(x => x.r)), b: Math.max(...rs.map(x => x.b)) });
      const anel = uniao([r('.ab-metade--d'), r('.ab-metade--e')]);
      const visto = uniao([r('.ab-visto i:nth-child(1)'), r('.ab-visto i:nth-child(2)')]);
      const pivo = document.querySelector('.ab-ponteiro').getBoundingClientRect();
      return { anel, visto, barra: r('.ab-barra'), pivo: { x: pivo.left, y: pivo.top }, tela: { w: innerWidth, h: innerHeight } };
    });
    const centroAnel = { x: (g.anel.l + g.anel.r) / 2, y: (g.anel.t + g.anel.b) / 2 };
    const D = g.anel.r - g.anel.l;
    // o logo todo (da barra do topo à base do anel) está no centro da tela
    perto((g.anel.l + g.anel.r) / 2, g.tela.w / 2, 1.5, 'centro horizontal do logo');
    perto((g.barra.t + g.anel.b) / 2, g.tela.h / 2, 1.5, 'centro vertical do logo');
    perto((g.barra.l + g.barra.r) / 2, g.tela.w / 2, 1.5, 'centro horizontal da barra do topo');
    // o ponteiro gira em torno do centro do anel
    perto(g.pivo.x, centroAnel.x, 1.5, 'pivô do ponteiro (x)');
    perto(g.pivo.y, centroAnel.y, 1.5, 'pivô do ponteiro (y)');
    // o visto está no meio do contorno (o desenho original o deixa 3% do diâmetro abaixo do centro, por equilíbrio óptico)
    const centroVisto = { x: (g.visto.l + g.visto.r) / 2, y: (g.visto.t + g.visto.b) / 2 };
    perto(centroVisto.x, centroAnel.x, 0.02 * D, 'centro do visto (x)');
    perto(centroVisto.y, centroAnel.y, 0.05 * D, 'centro do visto (y)');
    const raioInterno = (D * 248) / 594;
    for (const [x, y] of [[g.visto.l, g.visto.t], [g.visto.r, g.visto.t], [g.visto.l, g.visto.b], [g.visto.r, g.visto.b]]) {
      assert(Math.hypot(x - centroAnel.x, y - centroAnel.y) < raioInterno * 0.9, 'o visto não cabe dentro do anel');
    }
  } finally { await fechar(); }
});

await check('só transform: toda animação das peças anima apenas `transform` (nada de SVG, clip-path, largura...)', async () => {
  const { page, fechar } = await abrir({ chave: 60000 });
  try {
    await page.waitForFunction(() => document.getElementById('abertura'), { timeout: 10000 });
    const r = await page.evaluate(() => {
      const el = document.getElementById('abertura');
      const ignoradas = new Set(['offset', 'computedOffset', 'easing', 'composite']);
      const das = document.getAnimations().filter(a => a.effect.target !== el && el.contains(a.effect.target));
      return das.map(a => ({
        nome: a.animationName,
        chaves: [...new Set(a.effect.getKeyframes().flatMap(k => Object.keys(k)).filter(k => !ignoradas.has(k)))],
      }));
    });
    assert(r.length >= 7, `só ${r.length} animações nas peças (esperado ao menos 7: barra, haste, 2 metades, ponteiro, ponta do ponteiro, visto)`);
    for (const a of r) assert(JSON.stringify(a.chaves) === '["transform"]', `${a.nome} anima ${JSON.stringify(a.chaves)}; só transform é permitido`);
  } finally { await fechar(); }
});

await check('thread principal travada por 800 ms no meio do desenho: o desenho continua e termina (quadros vistos durante a trava)', async () => {
  // O app é segurado por 6 s para a thread ficar livre até a trava ser provocada por aqui.
  const { page, fechar } = await abrir({ atrasarMs: 6000 });
  const cdp = await page.createCDPSession();
  const quadros = [];
  cdp.on('Page.screencastFrame', f => {
    quadros.push({ em: Date.now(), dados: f.data });
    void cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  try {
    await page.waitForFunction(() => document.getAnimations().some(a => a.animationName === 'ab-gira' && a.currentTime > 150), { timeout: 10000 });
    const inicio = Date.now();
    await page.evaluate(() => { const t = performance.now(); while (performance.now() - t < 800); }); // trava a thread principal
    const fim = Date.now();
    const durante = quadros.filter(q => q.em >= inicio && q.em <= fim);
    assert(durante.length >= 10, `só ${durante.length} quadros chegaram à tela durante a trava (a animação não está na placa de vídeo?)`);
    // O último quadro mostrado ainda DENTRO da trava tem o contorno completo (às 9 h, às 6 h e às 3 h) e o primeiro não.
    const q = await page.evaluate(() => { const r = document.querySelector('.ab-quadro')?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, w: r.width } : null; });
    assert(q, 'a abertura sumiu');
    const noAnel = (cor, graus) => {
      const rad = (graus * Math.PI) / 180;
      return cor(q.x + (q.w / 1024) * (512 + 272.5 * Math.sin(rad)), q.y + (q.w / 1024) * (574 - 272.5 * Math.cos(rad)));
    };
    const ultimo = await pixels(Buffer.from(durante.at(-1).dados, 'base64'));
    for (const g of [90, 180, 270]) assert(roxo(noAnel(ultimo, g)), `no fim da trava o anel devia estar desenhado a ${g}°`);
    const primeiro = await pixels(Buffer.from(durante[0].dados, 'base64'));
    assert(!roxo(noAnel(primeiro, 270)), 'no começo da trava o anel ainda não devia chegar às 9 h (o teste não estaria medindo nada)');
    // depois da trava o relógio da animação seguiu (o desenho acabou)
    const depois = await page.evaluate(() => performance.now() - window.__aberturaInicio);
    assert(depois >= 950, `o relógio só chegou a ${depois.toFixed(0)} ms`);
  } finally { await cdp.send('Page.stopScreencast').catch(() => {}); await fechar(); }
});

grupo('Duração e saída');
await check('app pronto cedo: começa a sair entre 1630 e 2200 ms, some em seguida, o app está por baixo e a abertura pega o toque', async () => {
  const { page, fechar } = await abrir();
  try {
    await page.waitForFunction(() => document.getElementById('abertura'), { timeout: 10000 });
    await sleep(300);
    const toque = await page.evaluate(() => {
      const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      return { naAbertura: !!el?.closest('#abertura'), eventos: getComputedStyle(document.getElementById('abertura')).pointerEvents };
    });
    assert(toque.naAbertura && toque.eventos !== 'none', 'enquanto cobre a tela, a abertura tem que pegar o toque');
    await page.waitForFunction(() => window.__ab.saiu !== null, { timeout: 5000 });
    const durante = await page.evaluate(() => ({
      saiu: window.__ab.saiu,
      pronto: performance.getEntriesByName('sprint:ready')[0]?.startTime - window.__aberturaInicio,
      eventos: getComputedStyle(document.getElementById('abertura')).pointerEvents,
      toqueAbaixo: !document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('#abertura'),
    }));
    assert(durante.saiu >= 1630 && durante.saiu <= 2200, `começou a sair aos ${durante.saiu.toFixed(0)} ms (esperado 1630–2200)`);
    assert(durante.pronto < 1500, `o app só ficou pronto aos ${durante.pronto?.toFixed(0)} ms (o teste precisa de app pronto cedo)`);
    assert(durante.eventos === 'none' && durante.toqueAbaixo, 'ao começar a sair, a abertura não pode mais pegar o toque');
    await page.waitForFunction(() => window.__ab.removida !== null, { timeout: 3000 });
    const fim = await page.evaluate(() => ({ removida: window.__ab.removida, app: !!document.querySelector('main.scroll-container'), sem: !document.getElementById('abertura') }));
    assert(fim.removida >= 1900 && fim.removida <= 2700, `sumiu aos ${fim.removida.toFixed(0)} ms (esperado ~2000)`);
    assert(fim.app && fim.sem, 'o app (tela inicial) devia estar por baixo e a abertura removida');
  } finally { await fechar(); }
});

await check('chave sprint-abertura-ms = 0: a abertura nem entra e não pega o toque', async () => {
  const { page, fechar } = await abrir({ chave: 0 });
  try {
    await page.waitForFunction(() => document.querySelector('main.scroll-container'), { timeout: 10000 });
    const r = await page.evaluate(() => ({ abertura: !!document.getElementById('abertura'), naAbertura: !!document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('#abertura') }));
    assert(!r.abertura && !r.naAbertura, 'com a chave em 0 a abertura não devia existir');
  } finally { await fechar(); }
});

await check('app lento (script principal atrasado em 4 s): aos 3 s nada saiu; quando o app abre, sai na hora', async () => {
  const { page, fechar } = await abrir({ atrasarMs: 4000 });
  try {
    await page.waitForFunction(() => document.getElementById('abertura'), { timeout: 10000 });
    await page.waitForFunction(() => performance.now() - window.__aberturaInicio > 3000, { timeout: 5000 });
    const aos3s = await page.evaluate(() => ({ saindo: document.getElementById('abertura')?.hasAttribute('data-saindo'), saiu: window.__ab.saiu }));
    const parado = await page.evaluate(() => window.__lerPecas());
    assert(aos3s.saindo === false && aos3s.saiu === null, 'aos 3 s a abertura não pode ter saído');
    assert(Math.abs(parado.visto - 1) < 0.001 && Math.abs(desenhado(parado) - 360) < 0.1, 'esperando, o logo completo fica parado');
    await page.waitForFunction(() => window.__ab.saiu !== null, { timeout: 10000 });
    const r = await page.evaluate(() => ({ saiu: window.__ab.saiu, pronto: performance.getEntriesByName('sprint:ready')[0].startTime - window.__aberturaInicio }));
    assert(r.pronto > 3500, `o app ficou pronto aos ${r.pronto.toFixed(0)} ms (o teste queria um app lento)`);
    assert(r.saiu - r.pronto < 300, `o app ficou pronto aos ${r.pronto.toFixed(0)} ms e a abertura só saiu aos ${r.saiu.toFixed(0)} ms (devia ser na hora)`);
    await page.waitForFunction(() => window.__ab.removida !== null, { timeout: 3000 });
  } finally { await fechar(); }
});

await check('movimento reduzido: logo completo e parado, e sai assim que o app está pronto', async () => {
  const { page, fechar } = await abrir({ reduzido: true });
  try {
    await page.waitForFunction(() => document.getElementById('abertura'), { timeout: 10000 });
    const r = await page.evaluate(() => {
      const el = document.getElementById('abertura');
      return {
        animacoes: document.getAnimations().filter(a => a.effect.target !== el && el.contains(a.effect.target)).length,
        pecas: window.__lerPecas(),
      };
    });
    assert(r.animacoes === 0, `com movimento reduzido há ${r.animacoes} animações rodando nas peças`);
    assert(Math.abs(r.pecas.visto - 1) < 0.001 && Math.abs(desenhado(r.pecas) - 360) < 0.1 && r.pecas.ponteiroAltura === 0, 'o logo devia estar completo (sem o ponteiro) desde o início');
    await page.waitForFunction(() => window.__ab.saiu !== null, { timeout: 5000 });
    const t = await page.evaluate(() => ({ saiu: window.__ab.saiu, pronto: performance.getEntriesByName('sprint:ready')[0].startTime - window.__aberturaInicio }));
    assert(t.saiu - t.pronto < 300, `pronto aos ${t.pronto.toFixed(0)} ms, saiu aos ${t.saiu.toFixed(0)} ms (devia ser na hora)`);
    assert(t.saiu < 1500, `com movimento reduzido não espera os 2 s (saiu aos ${t.saiu.toFixed(0)} ms)`);
  } finally { await fechar(); }
});

grupo('Rede de segurança (app que não abre)');
/** Fake de caches e service workers: anota o que o botão "Tentar de novo" apagou (sobrevive ao reload via sessionStorage). */
function simularArmazenamento() {
  const anota = (tipo, nome) => {
    const lista = JSON.parse(sessionStorage.getItem('__apagou') ?? '[]');
    lista.push(`${tipo}:${nome}`);
    sessionStorage.setItem('__apagou', JSON.stringify(lista));
  };
  Object.defineProperty(window, 'caches', {
    configurable: true,
    value: {
      keys: async () => ['workbox-precache-v2-http://localhost/', 'sprint-runtime', 'modelo-grande-v1'],
      delete: async nome => { anota('cache', nome); return true; },
    },
  });
  if (navigator.serviceWorker) navigator.serviceWorker.getRegistrations = async () => [{ unregister: async () => { anota('sw', 'registro'); return true; } }];
  try {
    if (!sessionStorage.getItem('__semeado')) { localStorage.setItem('sprint_dados_da_pessoa', 'guardado'); sessionStorage.setItem('__semeado', '1'); } // só na 1ª carga: se o botão apagasse, não voltaria
  } catch { /* ok */ }
}

await Promise.all([
  check('script principal bloqueado: em até 12 s aparece "demorando para abrir", com "não carregou" nas linhas; "Tentar de novo" reabre o app sem apagar dados', async () => {
    const { page, controle, fechar } = await abrir({ bloquear: true, antes: simularArmazenamento });
    try {
      await page.waitForFunction(() => document.querySelector('.ab-erro') && !document.querySelector('.ab-erro').hidden, { timeout: 12000 });
      const msg = await page.evaluate(() => ({
        titulo: document.querySelector('.ab-erro h2').textContent,
        texto: document.querySelector('.ab-erro').innerText,
        linhas: [...document.querySelectorAll('.ab-erro li')].map(li => li.textContent),
        botao: document.querySelector('.ab-erro button').textContent,
      }));
      assert(/demorando para abrir/i.test(msg.titulo), `título inesperado: ${msg.titulo}`);
      assert(/nada foi apagado/i.test(msg.texto), 'a mensagem tem que dizer que nada foi apagado');
      assert(msg.linhas.length >= 1 && msg.linhas.length <= 3, `esperava de 1 a 3 linhas de erro, vieram ${msg.linhas.length}`);
      assert(msg.linhas.some(l => /não carregou/i.test(l)), `nenhuma linha diz "não carregou": ${JSON.stringify(msg.linhas)}`);
      assert(/tentar de novo/i.test(msg.botao), 'botão "Tentar de novo" ausente');

      controle.liberar = true; // a rede "voltou"
      await page.click('.ab-erro button');
      await page.waitForFunction(() => document.querySelector('main.scroll-container') && !document.getElementById('abertura'), { timeout: 15000 });
      const depois = await page.evaluate(() => ({
        guardado: localStorage.getItem('sprint_dados_da_pessoa'),
        apagou: JSON.parse(sessionStorage.getItem('__apagou') ?? '[]'),
      }));
      assert(depois.guardado === 'guardado', 'o localStorage não pode ser apagado');
      assert(depois.apagou.includes('sw:registro'), 'o service worker devia ter sido desregistrado');
      assert(depois.apagou.includes('cache:workbox-precache-v2-http://localhost/') && depois.apagou.includes('cache:sprint-runtime'), 'os caches do app devem ser apagados');
      assert(!depois.apagou.some(a => a.includes('modelo-grande')), 'caches grandes (modelos) não podem ser apagados');
    } finally { await fechar(); }
  }),
  check('app lento que abre depois de 8 s: a mensagem some junto com a abertura', async () => {
    const { page, fechar } = await abrir({ atrasarMs: 10500 });
    try {
      await page.waitForFunction(() => document.querySelector('.ab-erro') && !document.querySelector('.ab-erro').hidden, { timeout: 12000 });
      await page.waitForFunction(() => window.__ab.removida !== null, { timeout: 15000 });
      const r = await page.evaluate(() => ({ abertura: !!document.getElementById('abertura'), erro: !!document.querySelector('.ab-erro'), app: !!document.querySelector('main.scroll-container') }));
      assert(!r.abertura && !r.erro && r.app, 'a abertura e a mensagem deviam ter sumido e o app aparecido');
    } finally { await fechar(); }
  }),
  check('abertura normal nunca mostra a mensagem (nem passados os 8 s)', async () => {
    const { page, fechar } = await abrir();
    try {
      await page.waitForFunction(() => window.__ab.removida !== null, { timeout: 5000 });
      let apareceu = false;
      for (let i = 0; i < 18; i++) { // observa até ~9 s
        apareceu ||= await page.evaluate(() => !!document.querySelector('.ab-erro'));
        await sleep(500);
      }
      assert(!apareceu, 'a mensagem de demora apareceu numa abertura normal');
    } finally { await fechar(); }
  }),
]);

// ── fim ──────────────────────────────────────────────────────────────────────
await browser.close();
encerrarServidor();
const falhas = resultados.filter(r => !r.ok);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} testes passaram.`);
process.exit(falhas.length ? 1 : 0);
