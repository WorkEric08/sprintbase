import { RedacaoCompetencyScores, RedacaoSession } from '../types';
import { COMPETENCIES } from './redacao';
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

// ── Por competência ──────────────────────────────────────────────────────

export interface CompetencyAverage {
  key: keyof RedacaoCompetencyScores;
  label: string;
  short: string;
  title: string;
  desc: string;
  /** Média (0–200) nas redações consideradas. */
  avg: number;
}

export interface CompetencySummary {
  /** Quantas redações entraram (as mais recentes com autoavaliação). */
  count: number;
  items: CompetencyAverage[];
  /** A competência de menor média, quando há pelo menos 2 redações e as médias não são todas iguais. */
  weakest: CompetencyAverage | null;
}

/** Quantas redações recentes entram na média por competência. */
export const COMPETENCY_WINDOW = 5;

/**
 * Média de cada competência nas últimas redações COM autoavaliação, e o ponto fraco (a menor média). Com uma redação só
 * ainda não há "ponto fraco": uma nota isolada não mostra tendência.
 */
export function competencySummary(sessions: RedacaoSession[], window = COMPETENCY_WINDOW): CompetencySummary | null {
  const recent = scored(sessions)
    .filter(s => s.competencyScores !== null)
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, window);
  if (recent.length === 0) return null;
  const items = COMPETENCIES.map(c => ({
    key: c.key, label: c.label, short: c.short, title: c.title, desc: c.desc,
    avg: Math.round(recent.reduce((a, s) => a + (s.competencyScores as RedacaoCompetencyScores)[c.key], 0) / recent.length),
  }));
  const lowest = Math.min(...items.map(i => i.avg));
  const highest = Math.max(...items.map(i => i.avg));
  const weakest = recent.length >= 2 && lowest < highest ? items.find(i => i.avg === lowest) ?? null : null;
  return { count: recent.length, items, weakest };
}
