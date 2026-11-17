import { describe, expect, it } from 'vitest';
import { BlockLog } from '../types';
import { bancaQuestionCount, bancaStats, strongAndWeak, subtopicStats } from './performance';

let n = 0;
const log = (over: Partial<BlockLog> = {}): BlockLog => ({
  id: `l${++n}`, subjectId: 's1', subjectTitle: 'Matemática', subjectColor: '#3b82f6', timestamp: 1, questionsTotal: 10,
  questionsCorrect: 7, subtopic: 'Funções', selfScore: 3, flaggedForReview: false, blockType: 'study', ...over,
});

describe('desempenho por subtópico', () => {
  it('soma os registros do mesmo subtópico (sem diferenciar maiúsculas e espaços) dentro da matéria', () => {
    const [s] = subtopicStats([log(), log({ subtopic: '  funções ', questionsTotal: 10, questionsCorrect: 3 })]);
    expect(s).toMatchObject({ subtopic: 'Funções', totalQuestions: 20, totalCorrect: 10, accuracy: 50, blocks: 2 });
  });

  it('o mesmo nome em matérias diferentes são subtópicos diferentes', () => {
    expect(subtopicStats([log(), log({ subjectId: 's2', subjectTitle: 'Física' })])).toHaveLength(2);
  });

  it('ignora registros sem subtópico e sem questões', () => {
    expect(subtopicStats([log({ subtopic: '' }), log({ subtopic: '   ' }), log({ questionsTotal: 0, questionsCorrect: 0 })])).toEqual([]);
  });
});

describe('pontos fortes e fracos', () => {
  const logs = [
    log({ subtopic: 'A', questionsTotal: 10, questionsCorrect: 9 }),
    log({ subtopic: 'B', questionsTotal: 10, questionsCorrect: 2 }),
    log({ subtopic: 'C', questionsTotal: 10, questionsCorrect: 6 }),
    log({ subtopic: 'poucas', questionsTotal: 2, questionsCorrect: 0 }), // < 3 questões: não entra
  ];

  it('fortes (≥ 70%) do melhor ao pior e fracos (< 70%) do pior ao melhor, com mínimo de 3 questões, sem repetir subtópico nas duas listas', () => {
    const { strong, weak } = strongAndWeak(logs);
    expect(strong.map(s => s.subtopic)).toEqual(['A']);
    expect(weak.map(s => s.subtopic)).toEqual(['B', 'C']);
  });

  it('70% exatos já é ponto forte', () => {
    const { strong, weak } = strongAndWeak([log({ subtopic: 'X', questionsTotal: 10, questionsCorrect: 7 })]);
    expect(strong.map(s => s.subtopic)).toEqual(['X']);
    expect(weak).toEqual([]);
  });

  it('mostra no máximo 5 de cada', () => {
    const many = [
      ...Array.from({ length: 8 }, (_, i) => log({ subtopic: `F${i}`, questionsTotal: 10, questionsCorrect: 7 + (i % 4) })),
      ...Array.from({ length: 8 }, (_, i) => log({ subtopic: `W${i}`, questionsTotal: 10, questionsCorrect: i % 7 })),
    ];
    const { strong, weak } = strongAndWeak(many);
    expect(strong).toHaveLength(5);
    expect(weak).toHaveLength(5);
    expect(strong.every(s => s.accuracy >= 70) && weak.every(s => s.accuracy < 70)).toBe(true);
    expect(strong[0].accuracy).toBeGreaterThanOrEqual(strong[4].accuracy);
    expect(weak[0].accuracy).toBeLessThanOrEqual(weak[4].accuracy);
  });

  it('empate: o que tem mais questões vem primeiro', () => {
    const { weak } = strongAndWeak([
      log({ subtopic: 'pouco', questionsTotal: 4, questionsCorrect: 2 }),
      log({ subtopic: 'muito', questionsTotal: 20, questionsCorrect: 10 }),
    ]);
    expect(weak.map(s => s.subtopic)).toEqual(['muito', 'pouco']);
  });

  it('sem dados suficientes, listas vazias', () => {
    expect(strongAndWeak([])).toEqual({ strong: [], weak: [] });
  });
});

describe('desempenho por banca', () => {
  const logs = [
    log({ banca: 'FGV', questionsTotal: 40, questionsCorrect: 30 }),
    log({ banca: 'FGV', questionsTotal: 20, questionsCorrect: 10 }),
    log({ banca: 'FCC', questionsTotal: 30, questionsCorrect: 20 }), // < 50: não aparece
    log({ banca: 'VUNESP', questionsTotal: 50, questionsCorrect: 25 }),
    log({ questionsTotal: 100 }), // sem banca: ignorado
  ];

  it('só bancas com pelo menos 50 questões, da que tem mais questões para a que tem menos', () => {
    const stats = bancaStats(logs);
    expect(stats.map(s => s.banca)).toEqual(['FGV', 'VUNESP']);
    expect(stats[0]).toMatchObject({ totalQuestions: 60, totalCorrect: 40, accuracy: 67, blockCount: 2 });
  });

  it('conta as questões de uma banca mesmo abaixo do mínimo (para dizer quanto falta)', () => {
    expect(bancaQuestionCount(logs, 'FCC')).toBe(30);
    expect(bancaQuestionCount(logs, 'IBFC')).toBe(0);
  });
});
