import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEME_BACKGROUND } from './theme';

/**
 * A cor de fundo do app aparece em vários arquivos (TypeScript, Java, XML, HTML, manifest) porque cada
 * camada precisa dela. Estes testes impedem que uma delas fique para trás e reapareça a faixa cinza.
 */
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');
const hex = (s: string) => s.toLowerCase();

describe('cor de fundo do tema', () => {
  it('claro = gray-50 e escuro = gray-950 do Tailwind', () => {
    expect(THEME_BACKGROUND).toEqual({ light: '#f9fafb', dark: '#030712' });
  });

  it('o plugin Java usa as mesmas cores', () => {
    const java = hex(read('android/app/src/main/java/com/workeric08/sprint/SystemBarColorsPlugin.java'));
    expect(java).toContain(`color.parsecolor("${THEME_BACKGROUND.dark}")`);
    expect(java).toContain(`color.parsecolor("${THEME_BACKGROUND.light}")`);
  });

  it('o tema Android (claro e escuro) usa as mesmas cores', () => {
    expect(hex(read('android/app/src/main/res/values/sprint_colors.xml'))).toContain(`>${THEME_BACKGROUND.light}<`);
    expect(hex(read('android/app/src/main/res/values-night/sprint_colors.xml'))).toContain(`>${THEME_BACKGROUND.dark}<`);
  });

  it('o tema Android aponta o windowBackground para essa cor', () => {
    expect(read('android/app/src/main/res/values/styles.xml')).toContain('@color/sprint_window_background');
  });

  it('o index.html aplica as mesmas cores antes do React montar', () => {
    const html = hex(read('index.html'));
    expect(html).toContain(THEME_BACKGROUND.light);
    expect(html).toContain(THEME_BACKGROUND.dark);
  });

  it('o manifest do PWA usa a cor do tema claro', () => {
    const vite = hex(read('vite.config.ts'));
    expect(vite).toContain(`background_color: '${THEME_BACKGROUND.light}'`);
    expect(vite).toContain(`theme_color: '${THEME_BACKGROUND.light}'`);
  });

  it('a barra inferior do app e as telas de cronômetro usam o mesmo fundo (gray-50 / gray-950)', () => {
    expect(read('App.tsx')).toMatch(/<nav className="md:hidden[^"]*bg-gray-50 dark:bg-gray-950/);
    expect(read('components/BlockTimerView.tsx')).toContain('bg-gray-50 dark:bg-gray-950');
    expect(read('components/BreakTimerView.tsx')).toContain('bg-gray-50 dark:bg-gray-950');
  });
});
