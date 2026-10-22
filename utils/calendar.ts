import { BlockLog, Subject } from '../types';
import { toLocalDateKey } from './dateUtils';

/** Lógica pura do calendário de estudos (sem React): níveis de meta, meses e contagem por dia. */

export const MONTHS_COUNT = 4;
export const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ── Meta diária ──────────────────────────────────────────────────────────

export interface GoalSettings {
  min: number;
  max: number;
}

export const DEFAULT_GOAL: GoalSettings = { min: 2, max: 5 };
/** Limites dos controles deslizantes da meta. */
export const MIN_GOAL_LIMIT = 60;
export const MAX_GOAL_LIMIT = 120;

export function isValidGoal(v: unknown): v is GoalSettings {
  if (typeof v !== 'object' || v === null) return false;
  const { min, max } = v as Record<string, unknown>;
  return Number.isInteger(min) && Number.isInteger(max) && (min as number) >= 1 && (max as number) > (min as number)
    && (min as number) <= MIN_GOAL_LIMIT && (max as number) <= MAX_GOAL_LIMIT;
}

export type GoalLevel = 'none' | 'below' | 'partial' | 'full';

/** Dia sem estudo (ou futuro) = none; abaixo do mínimo = below; até o máximo = partial; bateu o máximo = full. */
export function getGoalLevel(blocks: number, isFuture: boolean, goal: GoalSettings): GoalLevel {
  if (isFuture || blocks === 0) return 'none';
  if (blocks < goal.min) return 'below';
  if (blocks < goal.max) return 'partial';
  return 'full';
}

export function levelColor(level: GoalLevel): string {
  switch (level) {
    case 'none': return '#e5e7eb';
    case 'below': return '#c4b5fd';
    case 'partial': return '#a855f7';
    case 'full': return '#7c3aed';
  }
}

// ── Meses e células ──────────────────────────────────────────────────────

export interface MonthRef {
  year: number;
  month: number; // 0–11
}

/** Os últimos `count` meses, do mais recente para o mais antigo, a partir do dia `today`. */
export function getMonthsToShow(today: string, count: number = MONTHS_COUNT): MonthRef[] {
  const [y, m] = today.split('-').map(Number);
  const result: MonthRef[] = [];
  for (let i = 0; i < count; i++) {
    let month = m - 1 - i;
    let year = y;
    while (month < 0) { month += 12; year--; }
    result.push({ year, month });
  }
  return result;
}

/** Células do mês em semanas de segunda a domingo; `null` completa as pontas. */
export function buildMonthCells(year: number, month: number): (string | null)[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = (new Date(year, month, 1).getDay() + 6) % 7; // segunda = 0
  const cells: (string | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ── Dias ─────────────────────────────────────────────────────────────────

export interface DayData {
  dateKey: string;
  blocks: number;
  questions: number;
  correct: number;
  isToday: boolean;
  isFuture: boolean;
}

/** Um registro por dia dos meses exibidos, somando os blocos (registros) de cada dia. */
export function buildDayMap(logs: BlockLog[], months: MonthRef[], today: string): Map<string, DayData> {
  const map = new Map<string, DayData>();
  for (const { year, month } of months) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      map.set(key, { dateKey: key, blocks: 0, questions: 0, correct: 0, isToday: key === today, isFuture: key > today });
    }
  }
  for (const log of logs) {
    const day = map.get(toLocalDateKey(log.timestamp));
    if (!day) continue;
    day.blocks++;
    day.questions += log.questionsTotal;
    day.correct += log.questionsCorrect;
  }
  return map;
}

/**
 * Dias em que houve estudo: união dos blocos concluídos das matérias com os registros de bloco.
 * Só os `completedBlocks` não bastam: resetar ou excluir uma matéria apagaria esses dias (e a
 * ofensiva com eles), enquanto os registros de bloco guardam o histórico por conta própria.
 */
export function collectActiveDays(subjects: Subject[], logs: BlockLog[]): Set<string> {
  const days = new Set<string>();
  for (const s of subjects) for (const b of s.completedBlocks) days.add(toLocalDateKey(b.timestamp));
  for (const l of logs) days.add(toLocalDateKey(l.timestamp));
  return days;
}

// ── Formatação ───────────────────────────────────────────────────────────

/** "21/10" */
export function formatShortDate(dateKey: string): string {
  const [, m, d] = dateKey.split('-');
  return `${d}/${m}`;
}

/** "quarta-feira, 21 de outubro" */
export function formatDetailDate(dateKey: string): string {
  return new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}
