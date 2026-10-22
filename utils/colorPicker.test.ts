import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** O seletor de cor livre ocupa a largura toda (retângulo de lado a lado) e o código da cor pode ser digitado. */
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');

describe('seletor de cor livre', () => {
  it('o CSS faz o seletor ocupar a largura toda, em vez dos 200×200 px fixos da biblioteca', () => {
    const css = read('index.css');
    expect(css).toMatch(/\.sprint-color-picker\.react-colorful\s*\{[^}]*width:\s*100%/);
    expect(css).toMatch(/\.sprint-color-picker\.react-colorful\s*\{[^}]*height:\s*\d+px/);
  });

  it('a barra de matiz é grossa o bastante para o dedo (≥ 28 px)', () => {
    const hue = read('index.css').match(/\.sprint-color-picker \.react-colorful__hue\s*\{[^}]*height:\s*(\d+)px/);
    expect(Number(hue?.[1])).toBeGreaterThanOrEqual(28);
  });

  it('o formulário usa a classe do seletor largo e oferece o campo do código da cor', () => {
    const form = read('components/SubjectFormView.tsx');
    expect(form).toContain('className="sprint-color-picker"');
    expect(form).toContain('<HexColorInput');
  });

  it('o campo do código seleciona tudo ao tocar (com 6 dígitos ele recusa mais caracteres) e não usa corretor', () => {
    const form = read('components/SubjectFormView.tsx');
    expect(form).toMatch(/onFocus=\{e => \{[^}]*select\(\)/);
    expect(form).toContain('autoCorrect="off"');
    expect(form).toContain('spellCheck={false}');
  });
});
