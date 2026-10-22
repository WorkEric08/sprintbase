import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Guardas dos controles de formulário com o visual do app: controle deslizante próprio, barra do botão escura e
 * teclado que não deixa a barra flutuando. Cada um é fácil de desfazer sem querer ao mexer em outra tela.
 */
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');
const components = readdirSync(new URL('../components/', import.meta.url)).filter(f => f.endsWith('.tsx'));

describe('controle deslizante', () => {
  it('toda tela usa o RangeSlider: nenhum <input type="range"> cru (ele ficaria com o visual branco do navegador)', () => {
    const offenders = components.filter(f => f !== 'RangeSlider.tsx' && /type="range"/.test(read(`components/${f}`)));
    expect(offenders).toEqual([]);
  });

  it('a trilha é uma linha só da cor do app, com pontas arredondadas, e o botão fica centralizado nela', () => {
    const css = read('index.css');
    const track = css.match(/\.sprint-range::-webkit-slider-runnable-track\s*\{[^}]*\}/)?.[0] ?? '';
    expect(track).toMatch(/border-radius:\s*9999px/);
    expect(track).toMatch(/linear-gradient\(to right, var\(--range-color\)/);
    expect(css).toMatch(/\.sprint-range::-webkit-slider-thumb\s*\{[^}]*margin-top:\s*calc\(\(var\(--track\) - var\(--thumb\)\) \/ 2\)/);
  });

  it('a área de toque é bem mais alta que a linha (≥ 24 px)', () => {
    const height = read('index.css').match(/\.sprint-range\s*\{[^}]*?[^-]height:\s*(\d+)px/)?.[1];
    expect(Number(height)).toBeGreaterThanOrEqual(24);
  });

  it('o preenchimento acompanha o botão (--p é a posição de 0 a 1)', () => {
    expect(read('components/RangeSlider.tsx')).toMatch(/'--p': fraction/);
    expect(read('index.css')).toMatch(/--fill-end:\s*calc\(var\(--thumb\) \/ 2 \+ \(100% - var\(--thumb\)\) \* var\(--p/);
  });
});

describe('barra do botão e teclado', () => {
  it('as barras inferiores usam o mesmo fundo do app (gray-50 / gray-950), sem emenda com a barra do sistema', () => {
    expect(read('components/SubjectFormView.tsx')).toMatch(/data-testid="form-footer"[\s\S]*?bg-gray-50 dark:bg-gray-950/);
    expect(read('components/SprintBuilderView.tsx')).toMatch(/border-t [^"]*bg-gray-50 dark:bg-gray-950 shrink-0/);
  });

  it('o formulário esconde a barra do botão enquanto o teclado está aberto', () => {
    const form = read('components/SubjectFormView.tsx');
    expect(form).toContain('useKeyboardVisible()');
    expect(form).toMatch(/\{!keyboardOpen && \(/);
  });

  it('no APK o teclado é detectado pelo plugin oficial (o campo continua focado depois de recolher o teclado)', () => {
    const hook = read('hooks/useKeyboardVisible.ts');
    expect(hook).toContain("addListener('keyboardWillShow'");
    expect(hook).toContain("addListener('keyboardWillHide'");
    expect(hook).toContain('visualViewport'); // fallback do navegador
  });

  it('a tecla de ação do teclado recolhe o teclado', () => {
    const form = read('components/SubjectFormView.tsx');
    expect(form).toContain('enterKeyHint="done"');
    expect(form).toMatch(/e\.key === 'Enter'\) e\.currentTarget\.blur\(\)/);
  });
});
