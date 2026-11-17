import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Guardas da Fase 6 (edital, revisão espaçada e banca): decisões fáceis de desfazer sem querer ao mexer em outra tela. */
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');
const components = readdirSync(new URL('../components/', import.meta.url)).filter(f => f.endsWith('.tsx'));

describe('seletores próprios', () => {
  it('nenhuma tela usa <input type="date"> nem type="time" (o do navegador muda de um aparelho para outro)', () => {
    const offenders = components.filter(f => /type="(date|time|datetime-local)"/.test(read(`components/${f}`)));
    expect(offenders).toEqual([]);
  });
});

describe('revisão espaçada', () => {
  it('a pausa de revisão é o MESMO componente da pausa (BreakTimerView), sem uma cópia', () => {
    expect(existsSync(new URL('../components/ReviewBreakTimerView.tsx', import.meta.url))).toBe(false);
    expect(read('components/BreakTimerView.tsx')).toContain('review?:');
    expect(read('components/SprintRunnerView.tsx')).toMatch(/current\?\.type === 'break' \|\| current\?\.type === 'review-break'/);
  });

  it('o banner do Montar sprint é o único lembrete: nada de notificação de revisão', () => {
    expect(read('components/SprintBuilderView.tsx')).toContain('data-testid="review-banner"');
    // as revisões não agendam nada no sistema (só Simulado e Redação usam notificações)
    expect(read('contexts/AppDataContext.tsx')).not.toMatch(/services\/(notify|simuladoAlerts|redacaoAlert)/);
    expect(read('utils/reviewAlgorithm.ts')).not.toMatch(/notif/i);
  });

  it('apagar uma matéria apaga as revisões dela', () => {
    const ctx = read('contexts/AppDataContext.tsx');
    expect(ctx).toMatch(/db\.reviewItems\.bulkDelete\(/);
  });

  it('o registro do bloco grava a banca e cria a revisão quando marcado', () => {
    const ctx = read('contexts/AppDataContext.tsx');
    expect(ctx).toMatch(/flaggedForReview: data\.flaggedForReview === true/);
    expect(ctx).toMatch(/\.\.\.\(data\.banca \? \{ banca: data\.banca \} : \{\}\)/);
    expect(ctx).toMatch(/flagForReview\(reviewItemsRef\.current, subject, data\.subtopic\)/);
  });
});

describe('edital', () => {
  it('a cobertura cruza por editalKey (renomear a matéria não quebra), com o nome só para matérias antigas', () => {
    const src = read('utils/edital.ts');
    expect(src).toMatch(/s\.editalKey !== undefined && same\(s\.editalKey, editalSubjectName\)/);
    expect(src).toMatch(/s\.editalKey === undefined && same\(s\.title, editalSubjectName\)/);
    expect(read('components/EditalCoverageCard.tsx')).toContain('computeCoverage(');
  });

  it('o schema do banco NÃO mudou: editalKey é só um campo opcional da matéria', () => {
    const db = read('db.ts');
    expect(db).not.toMatch(/version\((8|9|10)\)/);
    expect(db).not.toMatch(/editalKey/);
    expect(read('types.ts')).toMatch(/editalKey\?: string;/);
  });

  it('só ENEM e Personalizado são oferecidos', () => {
    const data = read('data/editais.ts');
    expect(data).toMatch(/export const EDITAIS: Edital\[\] = \[ENEM\];/);
  });

  it('as telas do edital carregam sob demanda (não entram no primeiro arquivo)', () => {
    expect(read('components/screens.tsx')).toContain("DatePickerModal = lazyScreen(() => withIcons(import('./DatePickerModal')))");
    expect(read('App.tsx')).not.toMatch(/EditalPickerModal|DatePickerModal/);
  });
});
