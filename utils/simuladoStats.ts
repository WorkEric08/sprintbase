import { SimuladoAreaResult, SimuladoRecord } from '../types';
import { ChartPoint } from './chart';

/** Contas dos gráficos e cartões do Simulado. Funções puras sobre os registros gravados. */

/** Acima disto o resultado é "bom" (verde); abaixo, "precisa de atenção" (vermelho). */
export const PASS_PCT = 60;

export const pctOf = (correct: number, total: number): number | null =>
  total > 0 ? Math.round((correct / total) * 100) : null;

/** Aproveitamento geral do simulado (acertos / questões das áreas com questões). Sem gabarito = null. */
export function overallPct(record: SimuladoRecord): number | null {
  const total = record.areaResults.reduce((a, r) => a + r.questionsTotal, 0);
  const correct = record.areaResults.reduce((a, r) => a + r.questionsCorrect, 0);
  return pctOf(correct, total);
}

export const areaPct = (a: SimuladoAreaResult): number | null => pctOf(a.questionsCorrect, a.questionsTotal);

export interface Averages {
  /** Média dos 3 simulados mais recentes que têm nota. */
  recent: number;
  /** Média dos anteriores a esses 3 (se houver). */
  previous: number | null;
}

/** `records` vem do mais recente para o mais antigo. */
export function averages(records: SimuladoRecord[]): Averages | null {
  const scores = records.map(overallPct).filter((s): s is number => s !== null);
  if (scores.length === 0) return null;
  const mean = (xs: number[]) => Math.round(xs.reduce((a, s) => a + s, 0) / xs.length);
  const rest = scores.slice(3);
  return { recent: mean(scores.slice(0, 3)), previous: rest.length ? mean(rest) : null };
}

/** Pontos do gráfico de evolução, do mais antigo ao mais recente (só os simulados com nota). */
export function chartPoints(records: SimuladoRecord[]): ChartPoint[] {
  return [...records]
    .sort((a, b) => a.completedAt - b.completedAt)
    .flatMap(r => {
      const pct = overallPct(r);
      return pct === null ? [] : [{ id: r.id, at: r.completedAt, value: pct }];
    });
}

// ── Tendência por área ───────────────────────────────────────────────────

export type Trend = 'up' | 'down' | 'stable' | 'new';

export interface AreaStat {
  name: string;
  color: string;
  /** % na última vez que a área apareceu. */
  lastScore: number;
  /** Média das aparições anteriores. */
  prevAvg: number | null;
  trend: Trend;
  /** lastScore − prevAvg, em pontos percentuais. */
  delta: number | null;
  appearances: number;
}

/** Variação (em pontos percentuais) a partir da qual a área é dada como melhor ou pior. */
const STABLE_BAND = 5;

const TREND_ORDER: Record<Trend, number> = { down: 0, stable: 1, up: 2, new: 3 };

/**
 * Tendência por área. Áreas sem questões num simulado são ignoradas naquele simulado; simulados de modelos diferentes
 * só entram na comparação das áreas que têm em comum. Quem piorou vem primeiro (precisa de atenção).
 */
export function computeAreaStats(records: SimuladoRecord[]): AreaStat[] {
  const byArea = new Map<string, { color: string; scores: { at: number; pct: number }[] }>();
  for (const r of records) {
    for (const a of r.areaResults) {
      const pct = areaPct(a);
      if (pct === null) continue;
      const entry = byArea.get(a.areaName) ?? { color: a.color, scores: [] };
      entry.scores.push({ at: r.completedAt, pct });
      byArea.set(a.areaName, entry);
    }
  }

  const stats: AreaStat[] = [];
  byArea.forEach(({ color, scores }, name) => {
    const sorted = [...scores].sort((a, b) => a.at - b.at);
    const lastScore = sorted[sorted.length - 1].pct;
    const previous = sorted.slice(0, -1).map(s => s.pct);
    const prevAvg = previous.length ? Math.round(previous.reduce((a, v) => a + v, 0) / previous.length) : null;
    const delta = prevAvg === null ? null : lastScore - prevAvg;
    let trend: Trend = 'new';
    if (delta !== null) trend = delta > STABLE_BAND ? 'up' : delta < -STABLE_BAND ? 'down' : 'stable';
    stats.push({ name, color, lastScore, prevAvg, trend, delta, appearances: sorted.length });
  });

  return stats.sort((a, b) => TREND_ORDER[a.trend] - TREND_ORDER[b.trend]);
}

export interface Recommendation {
  tone: 'warning' | 'good';
  text: string;
}

export function recommend(stats: AreaStat[]): Recommendation | null {
  const declining = stats.filter(s => s.trend === 'down' && s.delta !== null);
  if (declining.length > 0) {
    const worst = [...declining].sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))[0];
    return {
      tone: 'warning',
      text: `Sua maior queda foi em ${worst.name} (-${Math.abs(worst.delta ?? 0)}pp). Considere aumentar os blocos desta matéria.`,
    };
  }
  const compared = stats.filter(s => s.trend !== 'new');
  if (compared.length > 0 && compared.every(s => s.trend === 'up')) {
    return { tone: 'good', text: 'Você está progredindo em todas as áreas! Mantenha o ritmo.' };
  }
  return null;
}
