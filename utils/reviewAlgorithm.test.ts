import { describe, expect, it } from 'vitest';
import { REVIEW_INTERVALS, ReviewItem } from '../types';
import {
  applyReviewResult, createReviewItem, currentIntervalLabel, daysUntilDue, flagForReview, isOverdue, isPendingNow,
  nextIntervalLabel, normalizeSubtopic, pendingItems, reviewDateAfterDays, todayMidnight,
} from './reviewAlgorithm';

const subject = { id: 's1', title: 'Matemática', color: '#3b82f6' };
// 10/03/2026, 15h42 no fuso local
const NOW = new Date(2026, 2, 10, 15, 42, 7).getTime();
const midnight = (y: number, m: number, d: number) => new Date(y, m, d).getTime();
const DAY = 86_400_000;

describe('datas da revisão', () => {
  it('sempre meia-noite local do dia devido, nunca no meio do dia', () => {
    expect(reviewDateAfterDays(NOW, 1)).toBe(midnight(2026, 2, 11));
    expect(reviewDateAfterDays(NOW, 7)).toBe(midnight(2026, 2, 17));
    expect(todayMidnight(NOW)).toBe(midnight(2026, 2, 10));
  });

  it('atravessa a virada do mês e do ano', () => {
    expect(reviewDateAfterDays(new Date(2026, 11, 20, 9).getTime(), 15)).toBe(midnight(2027, 0, 4));
    expect(reviewDateAfterDays(new Date(2026, 0, 30, 9).getTime(), 3)).toBe(midnight(2026, 1, 2));
  });

  it('subtópico em branco vira "(geral)"', () => {
    expect(normalizeSubtopic('   ')).toBe('(geral)');
    expect(normalizeSubtopic('  Funções ')).toBe('Funções');
  });
});

describe('ciclo completo: marcar, revisar e avançar D+1 → 3 → 7 → 15 → 30 → 60 → consolidar', () => {
  it('cada acerto avança um intervalo, na data certa, até consolidar', () => {
    let item = createReviewItem(subject, 'Funções', NOW);
    expect([item.intervalIndex, currentIntervalLabel(item), item.consolidated]).toEqual([0, 'D+1', false]);
    expect(item.nextReviewAt).toBe(reviewDateAfterDays(NOW, 1));

    let today = NOW;
    const seen: string[] = [currentIntervalLabel(item)];
    for (let step = 1; step <= REVIEW_INTERVALS.length; step++) {
      // o dia da revisão chega
      today = item.nextReviewAt + 9 * 3_600_000; // 9h do dia devido
      expect(isPendingNow(item, today), `D+${REVIEW_INTERVALS[step - 1]} devia estar pendente`).toBe(true);
      item = applyReviewResult(item, true, today);
      seen.push(currentIntervalLabel(item));
      if (step < REVIEW_INTERVALS.length) {
        expect(item.nextReviewAt).toBe(reviewDateAfterDays(today, REVIEW_INTERVALS[step]));
        expect(isPendingNow(item, today)).toBe(false); // revisado hoje: some da fila
      }
    }
    expect(seen).toEqual(['D+1', 'D+3', 'D+7', 'D+15', 'D+30', 'D+60', 'Consolidado']);
    expect(item.consolidated).toBe(true);
    expect(item.reviewCount).toBe(6);
    expect(isPendingNow(item, today + 400 * DAY)).toBe(false); // consolidado nunca volta à fila
    expect(nextIntervalLabel(item)).toBe('—');
  });

  it('o rótulo do próximo passo mostra o que acontece ao acertar', () => {
    let item = createReviewItem(subject, 'a', NOW);
    const labels: string[] = [];
    while (!item.consolidated) {
      labels.push(nextIntervalLabel(item));
      item = applyReviewResult(item, true, NOW);
    }
    expect(labels).toEqual(['D+3', 'D+7', 'D+15', 'D+30', 'D+60', 'Consolidar']);
  });

  it('errar volta ao D+1 (de qualquer ponto) e conta a revisão', () => {
    let item = createReviewItem(subject, 'a', NOW);
    for (let i = 0; i < 3; i++) item = applyReviewResult(item, true, NOW);
    expect(currentIntervalLabel(item)).toBe('D+15');
    item = applyReviewResult(item, false, NOW);
    expect(item).toMatchObject({ intervalIndex: 0, consolidated: false, reviewCount: 4 });
    expect(item.nextReviewAt).toBe(reviewDateAfterDays(NOW, 1));
  });
});

describe('marcar pra revisar', () => {
  it('cria o item no D+1, que só vence amanhã', () => {
    const { items, item } = flagForReview([], subject, 'Funções', NOW);
    expect(items).toHaveLength(1);
    expect(isPendingNow(item, NOW)).toBe(false);
    expect(isPendingNow(item, midnight(2026, 2, 11))).toBe(true);
  });

  it('marcar de novo o mesmo subtópico não duplica: reinicia no D+1 (sem diferenciar maiúsculas nem espaços)', () => {
    const first = flagForReview([], subject, 'Funções', NOW);
    let advanced = applyReviewResult(first.item, true, NOW);
    advanced = applyReviewResult(advanced, true, NOW);
    expect(advanced.intervalIndex).toBe(2);
    const again = flagForReview([advanced], subject, '  funções ', NOW);
    expect(again.items).toHaveLength(1);
    expect(again.item.id).toBe(first.item.id);
    expect(again.item.intervalIndex).toBe(0);
  });

  it('um item consolidado volta a ser revisado se for marcado de novo', () => {
    let item = createReviewItem(subject, 'a', NOW);
    for (let i = 0; i < 6; i++) item = applyReviewResult(item, true, NOW);
    expect(item.consolidated).toBe(true);
    const again = flagForReview([item], subject, 'a', NOW);
    expect(again.item).toMatchObject({ consolidated: false, intervalIndex: 0 });
  });

  it('a mesma palavra em matérias diferentes são itens diferentes', () => {
    const a = flagForReview([], subject, 'Introdução', NOW);
    const b = flagForReview(a.items, { id: 's2', title: 'Física', color: '#000' }, 'Introdução', NOW);
    expect(b.items).toHaveLength(2);
  });

  it('subtópico em branco entra como "(geral)" e marcar de novo em branco reaproveita o mesmo', () => {
    const a = flagForReview([], subject, '', NOW);
    expect(a.item.subtopic).toBe('(geral)');
    expect(flagForReview(a.items, subject, '   ', NOW).items).toHaveLength(1);
  });
});

describe('a fila de pendentes', () => {
  const item = (over: Partial<ReviewItem>): ReviewItem => ({ ...createReviewItem(subject, 'x', NOW), ...over });

  it('atrasada continua na fila, com aviso, e vem primeiro', () => {
    const today = item({ id: 'hoje', nextReviewAt: midnight(2026, 2, 10) });
    const late = item({ id: 'atrasada', nextReviewAt: midnight(2026, 2, 7) });
    const future = item({ id: 'futura', nextReviewAt: midnight(2026, 2, 12) });
    expect(pendingItems([today, future, late], NOW).map(i => i.id)).toEqual(['atrasada', 'hoje']);
    expect(isOverdue(late, NOW)).toBe(true);
    expect(isOverdue(today, NOW)).toBe(false);
    expect(daysUntilDue(late, NOW)).toBe(-3);
    expect(daysUntilDue(today, NOW)).toBe(0);
    expect(daysUntilDue(future, NOW)).toBe(2);
  });

  it('itens de matérias que não existem mais ficam de fora', () => {
    const orphan = item({ id: 'orfao', subjectId: 'apagada', nextReviewAt: midnight(2026, 2, 1) });
    const ok = item({ id: 'ok', nextReviewAt: midnight(2026, 2, 1) });
    expect(pendingItems([orphan, ok], NOW, new Set(['s1'])).map(i => i.id)).toEqual(['ok']);
  });

  it('consolidado nunca é pendente nem atrasado', () => {
    const done = item({ consolidated: true, nextReviewAt: midnight(2020, 0, 1) });
    expect(isPendingNow(done, NOW)).toBe(false);
    expect(isOverdue(done, NOW)).toBe(false);
  });
});
