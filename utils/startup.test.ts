import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Guardas das decisões que deixam a abertura do app rápida (medidas com `npm run perf`). Cada uma é fácil de
 * desfazer sem querer ao mexer em outra coisa; o orçamento de tamanho em si é conferido pelo e2e (--preview).
 */
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');
const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string> };

describe('abertura rápida', () => {
  it('os ícones são SVG embutido, sem a fonte do Font Awesome', () => {
    expect(pkg.dependencies['@fortawesome/fontawesome-free']).toBeUndefined();
    expect(read('index.tsx')).not.toMatch(/fontawesome/);
    expect(read('App.tsx') + read('components/CicloView.tsx')).not.toMatch(/<i className="fas /);
  });

  it('só o Ciclo vai no primeiro arquivo: as outras telas são carregadas sob demanda', () => {
    const screens = read('components/screens.tsx');
    for (const name of ['ProgressView', 'SettingsPanel', 'SubjectFormView', 'SprintBuilderView', 'SprintRunnerView']) {
      expect(screens, name).toMatch(new RegExp(`export const ${name} = lazyScreen\\(\\(\\) => import\\('./${name}'\\)\\)`));
    }
    // ninguém importa essas telas direto (isso as traria de volta para o primeiro arquivo)
    const importers = read('App.tsx') + read('components/CicloView.tsx');
    expect(importers).not.toMatch(/from '\.\/(components\/)?(ProgressView|SettingsPanel|SubjectFormView|SprintBuilderView|SprintRunnerView)'/);
    expect(read('App.tsx')).toMatch(/import CicloView from '\.\/components\/CicloView'/);
  });

  it('as telas pesadas são pré-carregadas em segundo plano depois da primeira pintura', () => {
    expect(read('App.tsx')).toMatch(/preloadScreens\(\)/);
    expect(read('components/screens.tsx')).toMatch(/requestIdleCallback/);
  });

  it('enquanto uma tela cheia carrega, um fundo opaco cobre a tela inicial (sem piscar)', () => {
    expect(read('components/screens.tsx')).toMatch(/fixed inset-0[^"]*bg-gray-50 dark:bg-gray-950/);
    expect(read('components/CicloView.tsx')).toMatch(/<Suspense fallback=\{<OverlayFallback \/>\}>/);
  });

  it('o banco começa a ser lido ao carregar o módulo e o React só monta com os dados prontos (limite de espera)', () => {
    const ctx = read('contexts/AppDataContext.tsx');
    expect(ctx).toMatch(/^void loadCritical\(\)/m);
    expect(read('index.tsx')).toMatch(/whenFirstDataReady\(150\)\.then\(/);
  });

  it('os registros de bloco (milhares) não seguram a primeira tela', () => {
    const ctx = read('contexts/AppDataContext.tsx');
    // a leitura crítica não inclui blockLogs; eles vêm depois da primeira pintura
    const critical = ctx.slice(ctx.indexOf('function loadCritical'), ctx.indexOf('function loadLogs'));
    expect(critical).not.toMatch(/blockLogs/);
    expect(ctx).toMatch(/await afterNextPaint\(\);\s*\n\s*const rows = await loadLogs\(\)/);
  });

  it('o build usa o Preact no lugar do React (o dev continua com o React)', () => {
    const vite = read('vite.config.ts');
    expect(vite).toMatch(/command === 'build' \? \{ alias: PREACT_ALIAS \} : undefined/);
    expect(vite).toMatch(/react: 'preact\/compat'/);
    expect(pkg.dependencies.preact).toBeDefined();
  });

  it('cartões fora da tela não pagam layout na abertura', () => {
    expect(read('components/SubjectCard.tsx')).toContain('defer-offscreen');
    expect(read('index.css')).toMatch(/\.defer-offscreen\s*\{[^}]*content-visibility:\s*auto/);
  });

  it('o WebView do Android não inicializa a Navegação Segura (o app só carrega arquivos locais)', () => {
    expect(read('android/app/src/main/AndroidManifest.xml')).toMatch(
      /android\.webkit\.WebView\.EnableSafeBrowsing"\s+android:value="false"/);
  });
});
