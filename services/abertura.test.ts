import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Saída da abertura (services/abertura.ts), com relógio falso e um "documento" mínimo no lugar do navegador
 * (o vitest roda em Node). A animação em si (CSS) é conferida no navegador por `npm run e2e:abertura`.
 */
class Elemento extends EventTarget {
  atributos = new Set<string>();
  removido = false;
  hasAttribute = (nome: string) => this.atributos.has(nome);
  setAttribute = (nome: string) => void this.atributos.add(nome);
  remove = () => {
    this.removido = true;
  };
  get saindo() {
    return this.atributos.has('data-saindo');
  }
}

interface Cenario {
  el: Elemento;
  janela: { __aberturaInicio?: number; matchMedia: (q: string) => { matches: boolean } };
  armazenamento: Map<string, string>;
  fontes: { ready: Promise<unknown> } | undefined;
}

let c: Cenario;

async function carregar() {
  vi.resetModules(); // cada teste começa sem a "primeira chamada" do anterior
  return import('./abertura');
}

/** Avança o relógio falso (e as promessas pendentes) por `ms`. */
const avancar = (ms: number) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => {
  vi.useFakeTimers();
  c = {
    el: new Elemento(),
    janela: { __aberturaInicio: performance.now(), matchMedia: () => ({ matches: false }) },
    armazenamento: new Map(),
    fontes: { ready: Promise.resolve() },
  };
  vi.stubGlobal('window', c.janela);
  vi.stubGlobal('localStorage', { getItem: (k: string) => c.armazenamento.get(k) ?? null });
  vi.stubGlobal('document', {
    getElementById: (id: string) => (id === 'abertura' ? c.el : null),
    get fonts() {
      return c.fontes;
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('encerrarAbertura', () => {
  it('app pronto cedo: espera o fim da animação e o fade termina aos 2000 ms', async () => {
    const { encerrarAbertura } = await carregar();
    void encerrarAbertura();
    await avancar(1679);
    expect(c.el.saindo).toBe(false);
    await avancar(1);
    expect(c.el.saindo).toBe(true); // 1680 ms: começa a sair; os 320 ms de fade chegam a 2000
  });

  it('desconta o tempo que já passou desde o início da abertura', async () => {
    const { encerrarAbertura } = await carregar();
    await avancar(700); // o app ficou pronto aos 700 ms
    void encerrarAbertura();
    await avancar(979);
    expect(c.el.saindo).toBe(false);
    await avancar(1);
    expect(c.el.saindo).toBe(true);
  });

  it('app lento: não espera mais nada, sai na hora', async () => {
    const { encerrarAbertura } = await carregar();
    await avancar(5000);
    expect(c.el.saindo).toBe(false);
    void encerrarAbertura();
    await avancar(0);
    expect(c.el.saindo).toBe(true);
  });

  it('movimento reduzido: sai assim que o app está pronto, sem esperar os 2 s', async () => {
    c.janela.matchMedia = q => ({ matches: q.includes('prefers-reduced-motion') });
    const { encerrarAbertura } = await carregar();
    void encerrarAbertura();
    await avancar(0);
    expect(c.el.saindo).toBe(true);
  });

  it('a chave sprint-abertura-ms troca a duração', async () => {
    c.armazenamento.set('sprint-abertura-ms', '500');
    const { encerrarAbertura } = await carregar();
    void encerrarAbertura();
    await avancar(179);
    expect(c.el.saindo).toBe(false);
    await avancar(1);
    expect(c.el.saindo).toBe(true); // 500 − 320
  });

  it('a chave com 0 faz sair na hora', async () => {
    c.armazenamento.set('sprint-abertura-ms', '0');
    const { encerrarAbertura } = await carregar();
    void encerrarAbertura();
    await avancar(0);
    expect(c.el.saindo).toBe(true);
  });

  it.each(['abc', '-3', '', '   ', 'Infinity', 'NaN'])('valor inválido na chave (%j) cai na duração padrão', async valor => {
    c.armazenamento.set('sprint-abertura-ms', valor);
    const { encerrarAbertura, duracaoDaAbertura } = await carregar();
    expect(duracaoDaAbertura()).toBe(2000);
    void encerrarAbertura();
    await avancar(1679);
    expect(c.el.saindo).toBe(false);
    await avancar(1);
    expect(c.el.saindo).toBe(true);
  });

  it('chamar de novo não reinicia nada', async () => {
    const { encerrarAbertura } = await carregar();
    const primeira = encerrarAbertura();
    await avancar(1000);
    const segunda = encerrarAbertura(); // se reiniciasse, só sairia aos 2680 ms
    expect(segunda).toBe(primeira);
    await avancar(680);
    expect(c.el.saindo).toBe(true);

    // já saindo: chamar outra vez não adiciona outro ouvinte nem mexe no elemento
    const ouvinte = vi.spyOn(c.el, 'addEventListener');
    await encerrarAbertura();
    expect(ouvinte).not.toHaveBeenCalled();
  });

  it('o animationend de um filho não derruba a abertura; o do próprio elemento, sim', async () => {
    const ouvintes: Array<(e: { target: unknown }) => void> = [];
    c.el.addEventListener = ((tipo: string, fn: (e: { target: unknown }) => void) => {
      if (tipo === 'animationend') ouvintes.push(fn);
    }) as typeof c.el.addEventListener;
    const { encerrarAbertura } = await carregar();
    c.janela.__aberturaInicio = performance.now() - 5000;
    void encerrarAbertura();
    await avancar(0);
    expect(ouvintes).toHaveLength(1);

    ouvintes[0]({ target: new Elemento() }); // um filho (o fade do próprio elemento é que importa)
    expect(c.el.removido).toBe(false);
    ouvintes[0]({ target: c.el });
    expect(c.el.removido).toBe(true);
  });

  it('se o animationend nunca vier, um limite de tempo remove a camada', async () => {
    const { encerrarAbertura } = await carregar();
    c.janela.__aberturaInicio = performance.now() - 5000;
    void encerrarAbertura();
    await avancar(0);
    expect(c.el.removido).toBe(false);
    await avancar(720);
    expect(c.el.removido).toBe(true);
  });

  it('espera as fontes, mas no máximo 1,5 s', async () => {
    c.fontes = { ready: new Promise(() => {}) }; // nunca terminam de carregar
    c.armazenamento.set('sprint-abertura-ms', '0');
    const { encerrarAbertura } = await carregar();
    void encerrarAbertura();
    await avancar(1499);
    expect(c.el.saindo).toBe(false);
    await avancar(1);
    expect(c.el.saindo).toBe(true);
  });

  it('fontes prontas cedo não atrasam nada', async () => {
    c.fontes = { ready: Promise.resolve() };
    const { encerrarAbertura } = await carregar();
    void encerrarAbertura();
    await avancar(1680);
    expect(c.el.saindo).toBe(true);
  });

  it('sem a abertura na página (chave em 0 no index.html) não faz nada', async () => {
    vi.stubGlobal('document', { getElementById: () => null, fonts: undefined });
    const { encerrarAbertura } = await carregar();
    await expect(encerrarAbertura()).resolves.toBeUndefined();
  });
});

/**
 * Guardas do index.html (onde a abertura mora, inline). As regras que importam são conferidas no navegador por
 * `npm run e2e:abertura`; estas só impedem, mais cedo, que alguém as quebre sem querer.
 */
describe('index.html da abertura', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf-8');

  it('as animações das peças só mexem em transform (a saída, no próprio elemento, só em opacity)', async () => {
    const { FADE_DA_ABERTURA_MS } = await carregar();
    // cada @keyframes ab-*, com as chaves casadas (os de dentro são os passos 0%, 12%...)
    const keyframes = new Map<string, string>();
    for (const m of html.matchAll(/@keyframes (ab-[\w-]+) \{/g)) {
      let fundo = 1;
      let i = m.index + m[0].length;
      for (; fundo > 0 && i < html.length; i++) fundo += html[i] === '{' ? 1 : html[i] === '}' ? -1 : 0;
      keyframes.set(m[1], html.slice(m.index + m[0].length, i - 1));
    }
    expect([...keyframes.keys()].sort()).toEqual(['ab-arco-d', 'ab-arco-e', 'ab-gira', 'ab-nasce', 'ab-ponteiro', 'ab-sai', 'ab-x']);
    for (const [nome, corpo] of keyframes) {
      const props = [...corpo.replace(/animation-timing-function:[^;]+;/g, '').matchAll(/([a-z-]+)\s*:/g)].map(m => m[1]);
      expect(new Set(props), nome).toEqual(new Set([nome === 'ab-sai' ? 'opacity' : 'transform']));
    }
    expect(html).toContain(`animation: ab-sai ${FADE_DA_ABERTURA_MS}ms`); // o CSS e o módulo têm que concordar
  });

  it('o logo é feito de elementos HTML (nada de SVG, clip-path ou stroke-dashoffset na abertura)', () => {
    const abertura = html.slice(html.indexOf('<style>'), html.indexOf('<script>', html.indexOf('id="abertura"')));
    expect(abertura).not.toMatch(/<svg|clip-path|stroke-dash|<canvas/);
  });

  it('o registro de erros é o primeiro script e o início da abertura é marcado logo depois do elemento', () => {
    expect(html.indexOf('window.__errosDaAbertura = []')).toBeGreaterThan(0);
    expect(html.indexOf('window.__errosDaAbertura = []')).toBeLessThan(html.indexOf('<link rel="icon"'));
    expect(html.indexOf('window.__aberturaInicio = performance.now()')).toBeGreaterThan(html.indexOf('id="abertura"'));
    expect(html.indexOf('window.__aberturaInicio = performance.now()')).toBeLessThan(html.indexOf('id="root"'));
    expect(html).toMatch(/addEventListener\('error', function \(e\) \{[\s\S]*?\}, true\);/); // em captura: pega arquivos que não carregaram
  });

  it('a rede de segurança não toca em IndexedDB nem apaga localStorage', () => {
    const script = html.slice(html.indexOf('window.__aberturaInicio'));
    expect(script).not.toMatch(/indexedDB|localStorage\.(clear|removeItem|setItem)|sessionStorage\.clear/);
    expect(script).toContain('/workbox|sprint/i'); // só os caches do app: os grandes (modelos) ficam
  });
});
