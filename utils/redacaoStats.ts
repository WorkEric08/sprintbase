import { RedacaoSession } from '../types';
import { ChartPoint } from './chart';

/** Contas do histórico de redações. Só contam as concluídas COM nota (rascunho e "sem nota" ficam de fora). */

export const MAX_SCORE = 1000;

export const scored = (sessions: RedacaoSession[]): (RedacaoSession & { estimatedScore: number; completedAt: number })[] =>
  sessions.filter((s): s is RedacaoSession & { estimatedScore: number; completedAt: number } =>
    s.completedAt !== null && s.estimatedScore !== null);

/** Nota ≥ 600 é boa (verde), ≥ 400 mediana (âmbar), abaixo disso pede atenção (vermelho). */
export const scoreColor = (score: number): string => (score >= 600 ? '#16a34a' : score >= 400 ? '#d97706' : '#ef4444');
/** Competência (0–200): ≥ 120 boa, ≥ 80 mediana. */
export const competencyColor = (v: number): string => (v >= 120 ? '#16a34a' : v >= 80 ? '#d97706' : '#ef4444');

export interface ScoreAverages {
  /** Média das 3 mais recentes. */
  recent: number;
  /** Média das anteriores a essas 3 (se houver). */
  previous: number | null;
  best: number;
}

export function averages(sessions: RedacaoSession[]): ScoreAverages | null {
  const scores = scored(sessions).sort((a, b) => b.completedAt - a.completedAt).map(s => s.estimatedScore);
  if (scores.length === 0) return null;
  const mean = (xs: number[]) => Math.round(xs.reduce((a, s) => a + s, 0) / xs.length);
  const rest = scores.slice(3);
  return { recent: mean(scores.slice(0, 3)), previous: rest.length ? mean(rest) : null, best: Math.max(...scores) };
}

/** Pontos do gráfico de evolução, do mais antigo ao mais recente. */
export function chartPoints(sessions: RedacaoSession[]): ChartPoint[] {
  return scored(sessions)
    .sort((a, b) => a.completedAt - b.completedAt)
    .map(s => ({ id: s.id, at: s.completedAt, value: s.estimatedScore }));
}
