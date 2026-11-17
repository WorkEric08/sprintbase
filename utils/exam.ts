import { daysBetween } from './dateUtils';

/** Contagem regressiva para a prova (datas em chave local "YYYY-MM-DD", como o resto do app). */

export type Urgency = 'far' | 'mid' | 'near' | 'urgent';

/** Dias até a prova (negativo = já passou, 0 = hoje). */
export const daysUntilExam = (examKey: string, todayKeyValue: string): number => daysBetween(todayKeyValue, examKey);

export function urgencyOf(days: number): Urgency {
  if (days > 180) return 'far';
  if (days > 90) return 'mid';
  if (days > 30) return 'near';
  return 'urgent';
}

/** Marcos sugeridos para cada fase da preparação. */
export const MILESTONES: Record<Urgency, string[]> = {
  far: ['Mapear o edital completo', 'Criar ciclo de estudos base', 'Construir fundamentos teóricos'],
  mid: ['Equilibrar teoria e questões', 'Resolver provas dos últimos anos', 'Intensificar revisão espaçada'],
  near: ['Intensificar resolução de questões', 'Simular condições de prova', 'Focar nos pontos fracos'],
  urgent: ['Revisão dos pontos críticos', 'Simulado completo diário', 'Cuidar do sono e alimentação'],
};

/** Uma chave "YYYY-MM-DD" válida (e que existe no calendário). */
export function isDateKey(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** "17 de novembro de 2026" */
export function formatExamDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}
