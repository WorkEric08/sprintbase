import { REVIEW_INTERVALS, ReviewItem } from '../types';
import { uid } from './id';

/**
 * Revisão espaçada. Funções puras (o `agora` é sempre injetável) sobre os itens; quem chama grava no banco.
 *
 * Intervalos: D+1 → D+3 → D+7 → D+15 → D+30 → D+60 → consolidado (`intervalIndex` 0 a 5; ao passar do D+60 o item é
 * marcado `consolidated`).
 *
 *  - Acertou: avança um intervalo; passando do último, consolida.
 *  - Errou: volta para o D+1.
 *  - Marcar de novo um subtópico que já existe (ativo ou consolidado) o reinicia no D+1, sem duplicar.
 *  - `nextReviewAt` é sempre a MEIA-NOITE local do dia devido, nunca uma hora no meio do dia.
 *  - Revisão atrasada continua na fila, com aviso; nada muda sozinho.
 */

export const MS_DAY = 86_400_000;

/** Meia-noite local do dia que fica `daysAhead` dias depois de `fromMs`. */
export function reviewDateAfterDays(fromMs: number, daysAhead: number): number {
  const d = new Date(fromMs);
  d.setDate(d.getDate() + daysAhead);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Meia-noite local de hoje. */
export function todayMidnight(now: number = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const GENERAL_SUBTOPIC = '(geral)';

/** Subtópico sem espaços nas pontas; em branco vira "(geral)". */
export function normalizeSubtopic(subtopic: string): string {
  const trimmed = subtopic.trim();
  return trimmed.length > 0 ? trimmed : GENERAL_SUBTOPIC;
}

const sameSubtopic = (a: string, b: string) => normalizeSubtopic(a).toLowerCase() === normalizeSubtopic(b).toLowerCase();

export interface SubjectRef {
  id: string;
  title: string;
  color: string;
}

/** Item novo no D+1. */
export function createReviewItem(subject: SubjectRef, subtopic: string, now: number = Date.now()): ReviewItem {
  return {
    id: uid(),
    subjectId: subject.id,
    subjectTitle: subject.title,
    subjectColor: subject.color,
    subtopic: normalizeSubtopic(subtopic),
    createdAt: now,
    lastReviewedAt: null,
    nextReviewAt: reviewDateAfterDays(now, REVIEW_INTERVALS[0]),
    intervalIndex: 0,
    consolidated: false,
    reviewCount: 0,
  };
}

/** Volta o item para o D+1 (marcado de novo, ou errou). */
export function resetReviewItem(item: ReviewItem, now: number = Date.now()): ReviewItem {
  return {
    ...item,
    intervalIndex: 0,
    lastReviewedAt: now,
    nextReviewAt: reviewDateAfterDays(now, REVIEW_INTERVALS[0]),
    consolidated: false,
    reviewCount: item.reviewCount + 1,
  };
}

/** Aplica o resultado de uma revisão: acertou avança, errou volta ao D+1. */
export function applyReviewResult(item: ReviewItem, correct: boolean, now: number = Date.now()): ReviewItem {
  if (!correct) return resetReviewItem(item, now);

  const nextIndex = item.intervalIndex + 1;
  if (nextIndex >= REVIEW_INTERVALS.length) {
    return { ...item, intervalIndex: nextIndex, lastReviewedAt: now, nextReviewAt: now, consolidated: true, reviewCount: item.reviewCount + 1 };
  }
  return {
    ...item,
    intervalIndex: nextIndex,
    lastReviewedAt: now,
    nextReviewAt: reviewDateAfterDays(now, REVIEW_INTERVALS[nextIndex]),
    consolidated: false,
    reviewCount: item.reviewCount + 1,
  };
}

/**
 * "Marcar pra revisar": cria o item ou, se já existe um para a mesma matéria e subtópico (sem diferenciar maiúsculas),
 * o reinicia no D+1. Devolve a lista nova e o item afetado.
 */
export function flagForReview(
  items: ReviewItem[], subject: SubjectRef, subtopic: string, now: number = Date.now(),
): { items: ReviewItem[]; item: ReviewItem } {
  const existing = items.find(i => i.subjectId === subject.id && sameSubtopic(i.subtopic, subtopic));
  if (existing) {
    const item = { ...resetReviewItem(existing, now), subjectTitle: subject.title, subjectColor: subject.color };
    return { items: items.map(i => (i.id === item.id ? item : i)), item };
  }
  const item = createReviewItem(subject, subtopic, now);
  return { items: [...items, item], item };
}

/** O dia da revisão chegou (ou passou) e o item não está consolidado. */
export const isPendingNow = (item: ReviewItem, now: number = Date.now()): boolean => !item.consolidated && item.nextReviewAt <= now;

/** Era devida em um dia ANTERIOR a hoje (revisão perdida). */
export const isOverdue = (item: ReviewItem, now: number = Date.now()): boolean =>
  !item.consolidated && item.nextReviewAt < todayMidnight(now);

/** "D+7", ou "Consolidado". */
export function currentIntervalLabel(item: ReviewItem): string {
  if (item.consolidated) return 'Consolidado';
  return `D+${REVIEW_INTERVALS[item.intervalIndex] ?? 1}`;
}

/** O que acontece se acertar: "D+15", "Consolidar", ou "—" se já consolidado. */
export function nextIntervalLabel(item: ReviewItem): string {
  if (item.consolidated) return '—';
  const next = item.intervalIndex + 1;
  return next >= REVIEW_INTERVALS.length ? 'Consolidar' : `D+${REVIEW_INTERVALS[next]}`;
}

/** Dias até a revisão (negativo = atrasada, 0 = hoje). */
export function daysUntilDue(item: ReviewItem, now: number = Date.now()): number {
  return Math.round((item.nextReviewAt - todayMidnight(now)) / MS_DAY);
}

/** Revisões que valem agora, as mais atrasadas primeiro. `subjectIds`: só as de matérias que ainda existem. */
export function pendingItems(items: ReviewItem[], now: number = Date.now(), subjectIds?: ReadonlySet<string>): ReviewItem[] {
  return items
    .filter(i => isPendingNow(i, now) && (!subjectIds || subjectIds.has(i.subjectId)))
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt);
}
