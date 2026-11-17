import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AXIS_COLORS, AXIS_LABELS, REDACAO_THEMES } from '../data/redacaoThemes';

/**
 * Guardas da Redação: o que protege o texto de quem escreve e a curadoria dos temas. Cada regra é fácil de desfazer sem
 * querer ao mexer em outra coisa (por isso o teste lê o código-fonte).
 */
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');

describe('banco de temas (curadoria manual)', () => {
  it('os temas do ENEM seguem NÃO conferidos (verified: false) até alguém conferir no INEP; a tela avisa "A conferir"', () => {
    const enem = REDACAO_THEMES.filter(t => t.source === 'enem');
    expect(enem.length).toBeGreaterThan(0);
    expect(enem.every(t => t.verified === false)).toBe(true);
    for (const file of ['components/RedacaoThemeBadges.tsx', 'components/RedacaoSetupModal.tsx']) {
      expect(read(file), file).toMatch(/!theme\.verified/);
      expect(read(file), file).toContain('A conferir');
    }
  });

  it('o arquivo de temas continua com o aviso de curadoria manual e sem IA', () => {
    expect(read('data/redacaoThemes.ts')).toMatch(/NÃO confie em AI para preencher anos e títulos de temas ENEM/);
  });

  it('dados consistentes: ids únicos, eixo com nome e cor, tema do ENEM com ano', () => {
    const ids = REDACAO_THEMES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of REDACAO_THEMES) {
      expect(AXIS_LABELS[t.axis], t.id).toBeTruthy();
      expect(AXIS_COLORS[t.axis], t.id).toBeTruthy();
      expect(t.title.trim(), t.id).not.toBe('');
      if (t.source === 'enem') expect(t.year, t.id).toBeGreaterThan(2000);
    }
  });
});

describe('o texto de quem escreve', () => {
  it('o campo de texto é NÃO controlado: o texto vive no campo, então teclado, autocorreção e IME não brigam com a interface', () => {
    const editor = read('components/RedacaoEditorView.tsx');
    expect(editor).toMatch(/<textarea[\s\S]*?defaultValue=\{w\.initialText\}/);
    expect(editor).not.toMatch(/<textarea[\s\S]*?\svalue=\{/);
    expect(editor).toContain('lang="pt-BR"');
  });

  it('o rascunho é gravado ao ir para segundo plano (appStateChange no APK), além do salvamento de 5 s', () => {
    const writer = read('hooks/useRedacaoWriter.ts');
    expect(writer).toMatch(/useAppPause\(/);
    expect(writer).toMatch(/AUTOSAVE_MS = 5000/);
    const pause = read('hooks/useAppPause.ts');
    expect(pause).toContain("addListener('appStateChange'");
    expect(pause).toContain('visibilitychange');
    expect(pause).toContain('pagehide');
  });

  it('depois de concluída, nenhum rascunho pode sobrescrever a redação (doneRef)', () => {
    const writer = read('hooks/useRedacaoWriter.ts');
    expect(writer).toMatch(/if \(doneRef\.current\) return;/);
    expect(writer).toMatch(/doneRef\.current = true;\s*\n\s*const at = Date\.now\(\);\s*\n\s*callbacks\.current\.onFinish/);
  });

  it('a escrita é uma tela cheia opaca com o fundo do app, e o botão voltar pergunta antes de sair', () => {
    for (const file of ['components/RedacaoEditorView.tsx', 'components/RedacaoPaperView.tsx']) {
      const src = read(file);
      expect(src, file).toMatch(/data-testid="redacao-writer" className="fixed inset-0 z-\[60\] bg-gray-50 dark:bg-gray-950/);
      expect(src, file).toMatch(/useBackButton\(\(\) => w\.setShowExit\(true\)\)/);
    }
  });

  it('o rodapé com o botão sai da frente do teclado', () => {
    expect(read('components/RedacaoEditorView.tsx')).toMatch(/useKeyboardVisible\(\)[\s\S]*\{!keyboardOpen && \(/);
  });

  it('excluir redação e descartar rascunho têm confirmação e desfazer', () => {
    expect(read('components/RedacaoHistoryView.tsx')).toMatch(/<ConfirmDialog[\s\S]*<UndoBar|<UndoBar[\s\S]*<ConfirmDialog/);
    const view = read('components/RedacaoView.tsx');
    expect(view).toContain('Rascunho descartado');
    expect(view).toContain('restore: () => saveRedacao(draft)');
  });

  it('as redações e os rascunhos chegam depois da primeira pintura, como os simulados', () => {
    const ctx = read('contexts/AppDataContext.tsx');
    const critical = ctx.slice(ctx.indexOf('function loadCritical'), ctx.indexOf('function loadLogs'));
    expect(critical).not.toMatch(/redacaoSessions|simuladoRecords/);
    expect(ctx).toMatch(/await db\.redacaoSessions\.toArray\(\)/);
  });

  it('os passos da carga em segundo plano não se pulam uns aos outros: nada de `return` por "não há dados" (bug real: sem simulados, as redações nunca carregavam)', () => {
    expect(read('contexts/AppDataContext.tsx')).not.toMatch(/rows\.length === 0[^\n]*\) return/);
  });
});
