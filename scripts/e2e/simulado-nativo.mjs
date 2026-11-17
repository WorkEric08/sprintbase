// Contrato do Simulado com o lado nativo (avisos agendados e tela ligada), num Chrome comum com a ponte do Capacitor SIMULADA.
//
//   npm run e2e:simulado-nativo           sobe o servidor de dev (porta 3012) e roda tudo
//   opções: --chrome <caminho>  --headful
//
// O que isto prova: que o app chama os plugins certos, na hora certa e com os dados certos (permissão, canal, horários dos
// 3 avisos, cancelar ao pausar/encerrar, reagendar ao retomar e ao reabrir, manter/liberar a tela). NÃO prova o código
// Java nem que o Android entrega a notificação com a tela bloqueada: isso é o teste no aparelho (docs/releases).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = fileURLToPath(new URL('../..', import.meta.url));
const isWin = process.platform === 'win32';
const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
const URL_APP = 'http://localhost:3012';
const MIN = 60_000;

const results = [];
const consoleErrors = [];
let page; let browser; let server;

async function check(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`  ✓ ${name}`); }
  catch (e) {
    results.push({ name, ok: false, error: e.message });
    console.log(`  ✗ ${name}\n      ${e.message}`);
    // Ajuda a achar a causa: o que o app chamou na ponte e o que apareceu na tela.
    try {
      const seen = await page.evaluate(() => (window.__calls ?? []).map(c => `${c.plugin}.${c.method}`).join(', '));
      console.log(`      chamadas à ponte: ${seen || '(nenhuma)'}\n      tela: ${(await bodyText()).slice(0, 140)}
      erros no console: ${consoleErrors.filter(e => !/SystemBars|SplashScreen/.test(e)).slice(-3).join(' | ') || '(nenhum)'}`);
    } catch { /* sem página */ }
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

async function waitFor(fn, what, timeout = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { const v = await fn(); if (v) return v; } catch { /* tenta de novo */ }
    await sleep(100);
  }
  throw new Error(`tempo esgotado esperando: ${what}`);
}
const bodyText = async () => norm(await page.evaluate(() => document.body.innerText));
const waitText = (t, timeout) => waitFor(async () => (await bodyText()).includes(norm(t)), `texto "${t}"`, timeout);
const hasText = async t => (await bodyText()).includes(norm(t));

async function click(text, { exact = false, nth = 0 } = {}) {
  const needle = norm(text);
  const point = await waitFor(() => page.evaluate(({ needle, exact, nth }) => {
    const n = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const hits = [];
    for (const el of document.querySelectorAll('button, [role="button"]')) {
      if (el.disabled) continue;
      const label = n(el.getAttribute('aria-label') ?? '');
      const own = n(el.innerText ?? '');
      if (!(exact ? own === needle || label === needle : own.includes(needle) || label.includes(needle))) continue;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (top && (el === top || el.contains(top))) hits.push({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
    return hits[nth] ?? null;
  }, { needle, exact, nth }), `botão "${text}"`);
  await page.mouse.click(point.x, point.y);
  await sleep(150);
}

const idb = (store, action, value) => page.evaluate(({ store, action, value }) => new Promise((resolve, reject) => {
  const req = indexedDB.open('SprintDB');
  req.onerror = () => reject(req.error);
  req.onsuccess = () => {
    const database = req.result;
    const tx = database.transaction(store, action === 'get' || action === 'all' ? 'readonly' : 'readwrite');
    const os = tx.objectStore(store);
    let out;
    if (action === 'put') os.put(value); else if (action === 'get') out = os.get(value); else if (action === 'all') out = os.getAll(); else if (action === 'clear') os.clear();
    tx.oncomplete = () => { database.close(); resolve(out ? out.result : undefined); };
    tx.onerror = () => reject(tx.error);
  };
}), { store, action, value });

/** Ponte do Capacitor simulada (mesma ideia de scripts/ponte-nativa-simulada.mjs do padrão de desenvolvimento). */
const PLUGINS = {
  App: { exitApp: {}, getInfo: { name: 'app', id: 'app', build: '1', version: '1' } },
  LocalNotifications: {
    checkPermissions: { display: 'prompt' }, requestPermissions: { display: 'granted' },
    createChannel: {}, cancel: {}, schedule: { notifications: [] },
    checkExactNotificationSetting: { exact_alarm: 'granted' }, changeExactNotificationSetting: { exact_alarm: 'granted' },
  },
  KeepAwake: { keepAwake: {}, allowSleep: {} },
};
const installBridge = () => page.evaluateOnNewDocument(plugins => {
  try { localStorage.setItem('sprint-abertura-ms', '0'); } catch { /* sem localStorage */ }
  // O registro de chamadas sobrevive a recarregar a página (o app recarrega sozinho ao restaurar um backup).
  try { window.__calls = JSON.parse(sessionStorage.getItem('__calls') ?? '[]'); } catch { window.__calls = []; }
  window.__answers = plugins;
  window.androidBridge = {};
  const header = (name, methods) => ({
    name,
    methods: [...methods.map(n => ({ name: n, rtype: 'promise' })), { name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }],
  });
  window.Capacitor = {
    PluginHeaders: Object.entries(plugins).map(([name, m]) => header(name, Object.keys(m))),
    nativeCallback: (plugin, method, options, callback) => {
      if (method === 'addListener') (window.__listeners ??= {})[`${plugin}.${options.eventName}`] = callback;
      return 'cb';
    },
    nativePromise: async (plugin, method, options) => {
      window.__calls.push({ plugin, method, options: JSON.parse(JSON.stringify(options ?? {})), at: Date.now() });
      try { sessionStorage.setItem('__calls', JSON.stringify(window.__calls)); } catch { /* sem sessionStorage */ }
      const answer = window.__answers?.[plugin]?.[method];
      return answer === undefined ? {} : answer;
    },
  };
}, PLUGINS);
const setAnswer = (plugin, method, value) => page.evaluate(([p, m, v]) => { window.__answers[p][m] = v; }, [plugin, method, value]);
const calls = (plugin) => page.evaluate(p => window.__calls.filter(c => !p || c.plugin === p), plugin ?? null);
const clearCalls = () => page.evaluate(() => { window.__calls = []; sessionStorage.removeItem('__calls'); });
const openSimulado = async () => { await click('Simulado', { nth: 0 }); await sleep(250); };
const lastCall = async (plugin, method) => (await calls(plugin)).filter(c => c.method === method).pop();

const session = ({ minutes = 180, strict = false, ago = 0, extra = {} } = {}) => ({
  template: { id: 'custom', name: 'Customizado', durationMinutes: minutes, strictMode: strict, hasRedacao: false, areas: [] },
  startedAt: Date.now() - ago, pausedAt: null, pausedMs: 0, endedAt: null, speed: 1, ...extra,
});

async function main() {
  const npx = isWin ? 'npx.cmd' : 'npx';
  if (await fetch(URL_APP).then(() => true, () => false)) throw new Error('a porta 3012 já está em uso: encerre o servidor esquecido');
  server = spawn(npx, ['vite', '--port', '3012', '--strictPort'], { cwd: root, shell: isWin, stdio: 'ignore' });
  await waitFor(() => fetch(URL_APP).then(r => r.ok).catch(() => false), 'servidor de dev', 30000);

  const chrome = [typeof opt('chrome') === 'string' ? opt('chrome') : null, process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(existsSync);
  if (!chrome) throw new Error('Chrome não encontrado (--chrome <caminho>)');
  browser = await puppeteer.launch({ executablePath: chrome, headless: !opt('headful'), userDataDir: mkdtempSync(join(tmpdir(), 'sprint-nativo-')), args: ['--no-first-run'] });
  page = (await browser.pages())[0];
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  await installBridge();
  await page.goto(URL_APP, { waitUntil: 'load' });
  await waitFor(async () => !(await page.$('.animate-spin')), 'fim do carregamento', 15000);
  await sleep(400);

  console.log('E2E Simulado · ponte nativa simulada');
  await check('roda como nativo e a tela de começar fala dos avisos com a tela bloqueada', async () => {
    assert(await page.evaluate(() => window.Capacitor.isNativePlatform() === true), 'não está no modo nativo');
    await click('Simulado', { nth: 0 });
    await waitText('Começar · 5h 30min');
    assert(await hasText('mesmo com a tela bloqueada') && !(await hasText('só aparecem com o app aberto')), 'texto de avisos incorreto no modo nativo');
  });

  await check('começar: pede a permissão, cria o canal e agenda 4 avisos (1 h, 30 min, 10 min antes do fim e o fim), e liga a tela', async () => {
    await clearCalls();
    const t0 = Date.now();
    await click('Começar ·');
    await waitFor(async () => (await calls('LocalNotifications')).some(c => c.method === 'schedule'), 'agendamento');
    const lc = (await calls('LocalNotifications')).map(c => c.method);
    assert(lc.includes('checkPermissions') && lc.includes('requestPermissions'), `não pediu a permissão (${lc.join(', ')})`);
    assert(lc.indexOf('requestPermissions') < lc.indexOf('schedule'), 'agendou antes de pedir a permissão');
    const channel = await lastCall('LocalNotifications', 'createChannel');
    assert(channel.options.id === 'simulado' && channel.options.importance >= 4, 'canal de avisos incorreto');
    const sched = await lastCall('LocalNotifications', 'schedule');
    const list = sched.options.notifications;
    assert(list.length === 4, `esperava 4 avisos, veio ${list.length}`);
    const expected = [270, 300, 320, 330].map(m => t0 + m * MIN);
    list.forEach((n, i) => {
      const at = new Date(n.schedule.at).getTime();
      assert(Math.abs(at - expected[i]) < 8000, `aviso ${i + 1} fora do horário (${Math.round((at - expected[i]) / 1000)} s)`);
      assert(n.schedule.allowWhileIdle === true && n.channelId === 'simulado' && n.title === 'ENEM — Dia 1', `aviso ${i + 1} sem allowWhileIdle/canal/título`);
    });
    assert(list.map(n => n.body).join('|') === 'Falta 1 hora para o fim do simulado.|Faltam 30 minutos para o fim do simulado.|Faltam 10 minutos para o fim do simulado.|O tempo do simulado acabou.', 'textos dos avisos incorretos');
    assert(new Set(list.map(n => n.id)).size === 4, 'ids repetidos');
    assert(list.every(n => n.isExactNotification === true), 'com a permissão de alarmes exatos os avisos deviam ser exatos');
    assert((await calls('KeepAwake')).some(c => c.method === 'keepAwake'), 'não pediu para manter a tela ligada');
  });

  await check('reabrir o app com o simulado rodando reagenda os avisos sem duplicar (mesmos ids)', async () => {
    const before = await lastCall('LocalNotifications', 'schedule');
    await clearCalls();
    await page.reload({ waitUntil: 'load' }); // o simulado continua gravado; o app abre no Ciclo
    await waitFor(async () => !(await page.$('.animate-spin')), 'carregamento', 10000);
    await openSimulado();
    await waitFor(async () => (await calls('LocalNotifications')).some(c => c.method === 'schedule'), 'reagendamento ao reabrir');
    const after = await lastCall('LocalNotifications', 'schedule');
    assert(after.options.notifications.map(n => n.id).join() === before.options.notifications.map(n => n.id).join(), 'os ids mudaram');
    const cancels = (await calls('LocalNotifications')).filter(c => c.method === 'cancel');
    assert(cancels.length >= 1 && cancels[0].options.notifications.length === 4, 'não limpou os avisos antigos antes de reagendar');
  });

  await check('encerrar cancela os avisos e solta a tela', async () => {
    await waitFor(async () => (await page.$('[data-testid="simulado-clock"]')) !== null, 'cronômetro'); // (segue na aba do teste anterior)
    await clearCalls();
    await click('Encerrar simulado');
    await click('Sim, encerrar');
    await waitText('Registrar simulado');
    const c = await calls();
    assert(c.some(x => x.plugin === 'LocalNotifications' && x.method === 'cancel' && x.options.notifications.length === 4), 'não cancelou os avisos');
    assert(c.some(x => x.plugin === 'KeepAwake' && x.method === 'allowSleep'), 'não soltou a tela');
    await click('Pular', { exact: true });
  });

  await check('pausar cancela os avisos e solta a tela; retomar agenda de novo com os horários deslocados', async () => {
    await idb('settings', 'put', { key: 'simulado_active', value: JSON.stringify(session({ minutes: 180 })) });
    await page.reload({ waitUntil: 'load' });
    await click('Simulado', { nth: 0 });
    await waitFor(async () => (await page.$('[data-testid="simulado-clock"]')) !== null, 'cronômetro');
    const first = await waitFor(() => lastCall('LocalNotifications', 'schedule'), 'agendamento inicial');
    const firstAt = Math.min(...first.options.notifications.map(n => new Date(n.schedule.at).getTime()));
    await clearCalls();
    await click('Pausar');
    await waitText('Pausado');
    await waitFor(async () => (await calls('LocalNotifications')).some(c => c.method === 'cancel'), 'cancelamento ao pausar');
    assert((await calls('KeepAwake')).some(c => c.method === 'allowSleep'), 'não soltou a tela na pausa');
    assert(!(await calls('LocalNotifications')).some(c => c.method === 'schedule'), 'agendou algo com o simulado pausado');
    await sleep(2500);
    await clearCalls();
    await click('Retomar');
    await waitFor(async () => (await calls('LocalNotifications')).some(c => c.method === 'schedule'), 'reagendamento ao retomar');
    const again = await lastCall('LocalNotifications', 'schedule');
    const againAt = Math.min(...again.options.notifications.map(n => new Date(n.schedule.at).getTime()));
    assert(againAt - firstAt >= 2000, `os horários não deslocaram pelo tempo parado (${againAt - firstAt} ms)`);
    assert((await calls('KeepAwake')).some(c => c.method === 'keepAwake'), 'não religou a tela ao retomar');
  });

  await check('com o tempo quase no fim só agenda os avisos que ainda cabem', async () => {
    await idb('settings', 'put', { key: 'simulado_active', value: JSON.stringify(session({ minutes: 180, ago: 155 * MIN })) }); // faltam 25 min
    await clearCalls();
    await page.reload({ waitUntil: 'load' });
    await openSimulado();
    await waitFor(async () => (await calls('LocalNotifications')).some(c => c.method === 'schedule'), 'agendamento');
    const sched = await lastCall('LocalNotifications', 'schedule');
    assert(sched.options.notifications.map(n => n.body).join('|') === 'Faltam 10 minutos para o fim do simulado.|O tempo do simulado acabou.', 'devia restar só o aviso de 10 minutos e o do fim');
  });

  await check('permissão de notificações negada: o simulado funciona e o app avisa que os avisos com a tela bloqueada estão desligados', async () => {
    await idb('settings', 'put', { key: 'simulado_active', value: JSON.stringify(session({ minutes: 180 })) });
    await clearCalls();
    await page.reload({ waitUntil: 'load' }); // a ponte volta ao padrão a cada carga: muda a resposta depois
    await setAnswer('LocalNotifications', 'checkPermissions', { display: 'denied' });
    await setAnswer('LocalNotifications', 'requestPermissions', { display: 'denied' });
    await openSimulado();
    await waitText('Avisos com a tela bloqueada desligados');
    assert(!(await calls('LocalNotifications')).some(c => c.method === 'schedule'), 'agendou sem permissão');
    assert(await page.$('[data-testid="simulado-clock"]'), 'o cronômetro deveria funcionar mesmo sem a permissão');
  });

  await check('sem a permissão de alarmes exatos: avisos inexatos (sem abrir a tela do sistema sozinho), com um botão para permitir; ao voltar, reagenda exato', async () => {
    await idb('settings', 'put', { key: 'simulado_active', value: JSON.stringify(session({ minutes: 180 })) });
    await clearCalls();
    await page.reload({ waitUntil: 'load' });
    await setAnswer('LocalNotifications', 'checkExactNotificationSetting', { exact_alarm: 'denied' });
    await openSimulado();
    await waitText('Permitir alarmes exatos');
    const sched = await lastCall('LocalNotifications', 'schedule');
    assert(sched.options.notifications.every(n => n.isExactNotification === false), 'devia pedir alarme inexato sem a permissão');
    assert(!(await calls('LocalNotifications')).some(c => c.method === 'changeExactNotificationSetting'), 'abriu a tela de alarmes sem a pessoa pedir');
    await click('Permitir alarmes exatos');
    await waitFor(async () => (await calls('LocalNotifications')).some(c => c.method === 'changeExactNotificationSetting'), 'abrir a tela de alarmes');
    // a pessoa liga a permissão e volta para o app
    await setAnswer('LocalNotifications', 'checkExactNotificationSetting', { exact_alarm: 'granted' });
    await clearCalls();
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await waitFor(async () => (await calls('LocalNotifications')).some(c => c.method === 'schedule'), 'reagendamento ao voltar');
    const again = await lastCall('LocalNotifications', 'schedule');
    assert(again.options.notifications.every(n => n.isExactNotification === true), 'devia reagendar como exato');
    await waitFor(async () => !(await hasText('Permitir alarmes exatos')), 'o aviso de alarmes sumir');
  });

  await check('restaurar um backup cancela os avisos que já estavam agendados', async () => {
    await idb('settings', 'clear');
    await page.reload({ waitUntil: 'load' });
    await waitFor(async () => !(await page.$('.animate-spin')), 'carregamento', 10000);
    await click('Ajustes');
    await waitText('Seus dados');
    // O arquivo é de um backup vazio e válido.
    const input = await page.$('input[type="file"]');
    const file = join(mkdtempSync(join(tmpdir(), 'sprint-bk-')), 'backup.json');
    (await import('node:fs')).writeFileSync(file, JSON.stringify({ format: 'sprint-backup', version: 1, exportedAt: new Date().toISOString(), appVersion: 't', tables: { subjects: [], settings: [] } }));
    await clearCalls();
    await input.uploadFile(file);
    await click('Sim, restaurar backup');
    await waitFor(async () => (await calls('LocalNotifications')).some(c => c.method === 'cancel'), 'cancelamento ao restaurar');
  });

  // ── Redação: o app vai para segundo plano ────────────────────────────────────
  const RTEXT = 'A valorização das comunidades tradicionais exige ação coordenada do Estado e da sociedade, com educação e proteção territorial.';
  await check('Redação: ao ir para segundo plano (evento nativo appStateChange) o rascunho é gravado na hora, sem esperar os 5 s', async () => {
    await idb('redacaoSessions', 'clear');
    await clearCalls();
    await page.reload({ waitUntil: 'load' });
    await waitFor(async () => !(await page.$('.animate-spin')), 'carregamento', 10000);
    await click('Redação', { exact: true });
    await click('Desafios para a valorização');
    await click('Escrever aqui');
    await waitFor(() => page.$('#redacao-text'), 'campo de texto');
    await page.click('#redacao-text');
    await page.keyboard.type(RTEXT, { delay: 1 });
    assert((await idb('redacaoSessions', 'all')).length === 0, 'gravou antes da hora (o salvamento automático é de 5 s)');
    const listening = await page.evaluate(() => typeof window.__listeners?.['App.appStateChange'] === 'function');
    assert(listening, 'o app não está ouvindo o evento appStateChange do Capacitor');
    await page.evaluate(() => window.__listeners['App.appStateChange']({ isActive: false }));
    const rows = await waitFor(async () => { const r = await idb('redacaoSessions', 'all'); return r.length ? r : null; }, 'rascunho gravado', 2000);
    assert(rows[0].completedAt === null && rows[0].text === RTEXT, 'o rascunho gravado não tem o texto digitado');
  });
  await check('Redação: ao começar a escrever agenda o aviso de FIM do cronômetro (daqui a 90 min), com o canal próprio', async () => {
    const sched = await lastCall('LocalNotifications', 'schedule');
    assert(sched, 'não agendou o aviso de fim da redação');
    const [n] = sched.options.notifications;
    assert(sched.options.notifications.length === 1 && n.id === 72001 && n.channelId === 'redacao', 'aviso da redação incorreto');
    const left = new Date(n.schedule.at).getTime() - Date.now();
    assert(left > 89 * 60_000 && left <= 90 * 60_000, `o aviso devia ser para daqui a ~90 min (${Math.round(left / 60_000)} min)`);
    assert(n.schedule.allowWhileIdle === true && n.isExactNotification === true, 'aviso sem allowWhileIdle ou fora do padrão de alarme');
    const channel = (await calls('LocalNotifications')).filter(c => c.method === 'createChannel').pop();
    assert(channel.options.id === 'redacao', 'canal da redação não criado');
  });
  await check('Redação: a tela fica ligada enquanto o cronômetro corre e solta ao pausar (e o aviso de fim é cancelado)', async () => {
    assert((await calls('KeepAwake')).some(c => c.method === 'keepAwake'), 'não pediu para manter a tela ligada ao escrever');
    await clearCalls();
    await click('Pausar cronômetro');
    await waitFor(async () => (await calls('KeepAwake')).some(c => c.method === 'allowSleep'), 'soltar a tela na pausa');
    await waitFor(async () => (await calls('LocalNotifications')).some(c => c.method === 'cancel' && c.options.notifications.some(x => x.id === 72001)), 'cancelar o aviso de fim ao pausar');
  });
  await check('Redação: retomar um rascunho (cronômetro parado) cancela um aviso antigo que ficou agendado de antes de o app morrer', async () => {
    await page.evaluate(() => window.__listeners['App.appStateChange']({ isActive: true }));
    await click('Voltar', { exact: true });
    await click('Sair e guardar rascunho');
    await waitFor(async () => (await page.$('[data-testid="redacao-writer"]')) === null, 'sair da escrita');
    const before = await idb('redacaoSessions', 'all');
    assert(before.length === 1 && before[0].completedAt === null, `devia haver 1 rascunho no banco antes de recarregar (${before.length})`);
    await page.reload({ waitUntil: 'load' });
    await waitFor(async () => !(await page.$('.animate-spin')), 'carregamento', 10000);
    await clearCalls();
    await click('Redação', { exact: true });
    await click('Continuar', { exact: true });
    await waitFor(() => page.$('#redacao-text'), 'campo de texto');
    await waitFor(async () => (await calls('LocalNotifications')).some(c => c.method === 'cancel' && c.options.notifications.some(x => x.id === 72001)), 'cancelar o aviso antigo');
    assert(!(await calls('LocalNotifications')).some(c => c.method === 'schedule'), 'não devia agendar nada com o cronômetro parado');
  });
  await check('Redação: voltar ao app ativo (isActive) não grava nada de novo e sair guarda o rascunho', async () => {
    await page.evaluate(() => window.__listeners['App.appStateChange']({ isActive: true }));
    await click('Voltar', { exact: true });
    await click('Sair e guardar rascunho');
    await waitFor(async () => (await page.$('[data-testid="redacao-writer"]')) === null, 'sair da escrita');
    const rows = await idb('redacaoSessions', 'all');
    assert(rows.length === 1 && rows[0].text === RTEXT, 'devia haver 1 rascunho com o texto');
  });
}

try {
  await main();
} catch (e) {
  results.push({ name: 'execução', ok: false, error: e.message });
  console.error(`\nErro fatal: ${e.message}`);
} finally {
  try { await browser?.close(); } catch { /* ignorado */ }
  if (server?.pid) {
    if (isWin) spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F']);
    else server.kill();
  }
}
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações passaram.`);
failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
process.exit(failed.length ? 1 : 0);
