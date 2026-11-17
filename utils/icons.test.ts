import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CORE_ICON_NAMES } from '../components/Icon';
import { EXTRA_ICONS } from '../components/iconsExtra';

/**
 * Os ícones estão em dois grupos (components/Icon.tsx): o CORE, no arquivo principal, e os EXTRA, que chegam junto
 * com as telas carregadas sob demanda. Se o primeiro quadro pedir um ícone EXTRA ele não aparece (e o console avisa),
 * então este teste confere isso no código-fonte.
 */
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');
const core = new Set(CORE_ICON_NAMES);
const extra = new Set(Object.keys(EXTRA_ICONS));

/** Arquivos que fazem parte do primeiro arquivo do app (nada é carregado sob demanda aqui). */
const FIRST_PAINT_FILES = [
  'App.tsx', 'components/CicloView.tsx', 'components/SubjectCard.tsx', 'components/StreakWidget.tsx',
  'components/WelcomeBackCard.tsx', 'components/ConfirmDialog.tsx', 'components/CountdownWidget.tsx',
  'components/ErrorBoundary.tsx', 'contexts/NavigationGuardContext.tsx',
];

const literals = (src: string) => [...src.matchAll(/['"]([a-z]+(?:-[a-z]+)*)['"]/g)].map(m => m[1]);

describe('ícones do primeiro quadro', () => {
  it('nenhum ícone EXTRA é usado por código do primeiro arquivo do app', () => {
    for (const file of FIRST_PAINT_FILES) {
      const offenders = literals(read(file)).filter(n => extra.has(n));
      expect(offenders, `${file} usa ícone(s) extra: mova para o CORE em Icon.tsx`).toEqual([]);
    }
  });

  it('um ícone não está nos dois grupos', () => {
    expect([...core].filter(n => extra.has(n))).toEqual([]);
  });

  it('todo ícone usado em alguma tela existe em um dos grupos', () => {
    const known = new Set([...core, ...extra]);
    const used = new Set<string>();
    const files = readdirSync(new URL('../components/', import.meta.url)).filter(f => f.endsWith('.tsx'));
    for (const f of files) {
      const src = read(`components/${f}`);
      for (const m of src.matchAll(/<Icon name=(?:"([a-z-]+)"|\{[^}]*\})/g)) if (m[1]) used.add(m[1]);
      for (const m of src.matchAll(/\bicon(?:=|: )['"]([a-z-]+)['"]/g)) used.add(m[1]);
    }
    expect([...used].filter(n => !known.has(n))).toEqual([]);
  });

  it('toda tela sob demanda carrega os ícones extras junto (withIcons)', () => {
    const screens = read('components/screens.tsx');
    const lazy = screens.match(/lazyScreen\(/g) ?? [];
    const withIcons = screens.match(/lazyScreen\(\(\) => withIcons\(/g) ?? [];
    expect(lazy.length).toBeGreaterThan(0);
    expect(withIcons.length).toBe(lazy.length);
    expect(screens).toContain("import('./iconsExtra')");
  });

  it('o primeiro arquivo não importa o módulo dos ícones extras (ele é carregado só com as telas)', () => {
    for (const file of FIRST_PAINT_FILES) expect(read(file), file).not.toMatch(/from '\.\/iconsExtra'|from '\.\/components\/iconsExtra'/);
    expect(read('components/Icon.tsx')).toMatch(/import type \{ EXTRA_ICONS \} from '\.\/iconsExtra'/);
  });
});
