import { describe, expect, it } from 'vitest';
import { SimuladoAreaResult, SimuladoRecord } from '../types';
import { areaPct, averages, chartPoints, computeAreaStats, overallPct, recommend } from './simuladoStats';

const area = (name: string, correct: number, total: number): SimuladoAreaResult => ({
  areaName: name, color: '#6366f1', questionsCorrect: correct, questionsTotal: total,
});

let n = 0;
const record = (day: number, areas: SimuladoAreaResult[]): SimuladoRecord => ({
  id: `r${++n}`, templateId: 'custom', templateName: 'Customizado',
  startedAt: day * 86_400_000, completedAt: day * 86_400_000 + 3_600_000,
  plannedDurationMinutes: 180, actualDurationMinutes: 180, completed: true,
  areaResults: areas, timeControlScore: null, perception: '', redacaoText: '', redacaoScore: null,
});

describe('aproveitamento', () => {
  it('soma acertos e questões de todas as áreas', () => {
    expect(overallPct(record(1, [area('A', 30, 40), area('B', 10, 40)]))).toBe(50);
  });

  it('sem gabarito (nenhuma questão) não tem nota, em vez de 0%', () => {
    expect(overallPct(record(1, [area('A', 0, 0)]))).toBeNull();
    expect(overallPct(record(1, []))).toBeNull();
    expect(areaPct(area('A', 0, 0))).toBeNull();
  });
});

describe('médias', () => {
  // do mais recente para o mais antigo, como o app guarda
  const recs = [80, 60, 70, 40, 20].map((pct, i) => record(10 - i, [area('A', pct, 100)]));

  it('últimos 3 contra os anteriores', () => {
    expect(averages(recs)).toEqual({ recent: 70, previous: 30 });
  });

  it('com até 3 simulados não há "anteriores"', () => {
    expect(averages(recs.slice(0, 3))).toEqual({ recent: 70, previous: null });
  });

  it('ignora simulados sem nota e devolve null se nenhum tem', () => {
    expect(averages([record(1, [area('A', 0, 0)])])).toBeNull();
    expect(averages([record(2, [area('A', 0, 0)]), record(1, [area('A', 5, 10)])])?.recent).toBe(50);
  });
});

describe('gráfico de evolução', () => {
  it('do mais antigo ao mais recente, só com os simulados que têm nota', () => {
    const pts = chartPoints([
      record(3, [area('A', 9, 10)]),
      record(2, [area('A', 0, 0)]),
      record(1, [area('A', 5, 10)]),
    ]);
    expect(pts.map(p => p.value)).toEqual([50, 90]);
    expect(pts[0].at).toBeLessThan(pts[1].at);
  });
});

describe('tendência por área', () => {
  const rec = (day: number, a: number, b: number) => record(day, [area('Matemática', a, 100), area('Português', b, 100)]);

  it('compara a última vez com a média das anteriores, com margem de ±5 pontos', () => {
    const stats = computeAreaStats([rec(4, 50, 72), rec(3, 70, 70), rec(2, 70, 70)]);
    const mat = stats.find(s => s.name === 'Matemática')!;
    expect(mat).toMatchObject({ lastScore: 50, prevAvg: 70, delta: -20, trend: 'down', appearances: 3 });
    expect(stats.find(s => s.name === 'Português')!.trend).toBe('stable'); // +2 pp
  });

  it('subir mais de 5 pontos é melhora; uma só aparição é "primeiro"', () => {
    expect(computeAreaStats([rec(2, 80, 80), rec(1, 70, 80)]).find(s => s.name === 'Matemática')!.trend).toBe('up');
    expect(computeAreaStats([rec(1, 70, 80)]).every(s => s.trend === 'new')).toBe(true);
  });

  it('quem piorou vem primeiro', () => {
    const stats = computeAreaStats([rec(2, 90, 40), rec(1, 50, 80)]);
    expect(stats[0].name).toBe('Português');
  });

  it('área sem questões num simulado não entra naquele simulado', () => {
    const stats = computeAreaStats([record(2, [area('Redação', 0, 0)]), record(1, [area('Redação', 5, 10)])]);
    expect(stats).toHaveLength(1);
    expect(stats[0].trend).toBe('new');
  });

  it('simulados de modelos diferentes só comparam as áreas em comum', () => {
    const stats = computeAreaStats([
      record(2, [area('Matemática', 60, 100)]),
      record(1, [area('Matemática', 60, 100), area('Física', 50, 100)]),
    ]);
    expect(stats.find(s => s.name === 'Física')!.trend).toBe('new');
    expect(stats.find(s => s.name === 'Matemática')!.trend).toBe('stable');
  });
});

describe('recomendação', () => {
  const rec = (day: number, a: number, b: number) => record(day, [area('Matemática', a, 100), area('Português', b, 100)]);

  it('aponta a maior queda', () => {
    const r = recommend(computeAreaStats([rec(2, 40, 50), rec(1, 70, 60)]));
    expect(r?.tone).toBe('warning');
    expect(r?.text).toContain('Matemática (-30pp)');
  });

  it('elogia só quando todas as áreas comparadas melhoraram', () => {
    expect(recommend(computeAreaStats([rec(2, 90, 90), rec(1, 50, 50)]))?.tone).toBe('good');
    expect(recommend(computeAreaStats([rec(2, 90, 71), rec(1, 50, 70)]))).toBeNull(); // uma melhorou, outra ficou estável
  });

  it('sem comparação possível, não recomenda nada', () => {
    expect(recommend([])).toBeNull();
    expect(recommend(computeAreaStats([rec(1, 50, 50)]))).toBeNull();
  });
});
