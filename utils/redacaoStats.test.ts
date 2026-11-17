import { describe, expect, it } from 'vitest';
import { RedacaoSession } from '../types';
import { averages, chartPoints, competencyColor, competencySummary, scoreColor, scored } from './redacaoStats';

let n = 0;
const session = (daysAgo: number, score: number | null, over: Partial<RedacaoSession> = {}): RedacaoSession => {
  const at = 1_700_000_000_000 - daysAgo * 86_400_000;
  return {
    id: `s${++n}`, themeId: 't', themeTitle: 'Tema', startedAt: at - 5_400_000, lastSavedAt: at, completedAt: at,
    durationMinutes: 90, text: '', wordCount: 0, competencyScores: null, estimatedScore: score, notes: '', ...over,
  };
};

describe('quais redações contam', () => {
  it('só as concluídas com nota: rascunho e "sem nota" ficam de fora', () => {
    const list = [session(1, 700), session(2, null), session(3, 500, { completedAt: null })];
    expect(scored(list).map(s => s.estimatedScore)).toEqual([700]);
  });
});

describe('médias', () => {
  it('3 mais recentes contra as anteriores, e a melhor nota', () => {
    const list = [session(5, 400), session(4, 500), session(3, 600), session(2, 700), session(1, 800)];
    expect(averages(list)).toEqual({ recent: 700, previous: 450, best: 800 });
  });

  it('não depende da ordem em que as redações chegam', () => {
    const list = [session(1, 800), session(5, 400), session(3, 600), session(2, 700), session(4, 500)];
    expect(averages(list)).toEqual({ recent: 700, previous: 450, best: 800 });
  });

  it('com até 3 redações não há "anteriores"; sem nenhuma nota, null', () => {
    expect(averages([session(1, 600), session(2, 800)])).toEqual({ recent: 700, previous: null, best: 800 });
    expect(averages([session(1, null)])).toBeNull();
    expect(averages([])).toBeNull();
  });
});

describe('gráfico', () => {
  it('do mais antigo ao mais recente, com a nota como valor', () => {
    const pts = chartPoints([session(1, 800), session(9, 400), session(4, null)]);
    expect(pts.map(p => p.value)).toEqual([400, 800]);
    expect(pts[0].at).toBeLessThan(pts[1].at);
  });
});

describe('por competência', () => {
  const comp = (c1: number, c2: number, c3: number, c4: number, c5: number) => ({ c1, c2, c3, c4, c5 });
  const withComp = (daysAgo: number, c: ReturnType<typeof comp>) =>
    session(daysAgo, c.c1 + c.c2 + c.c3 + c.c4 + c.c5, { competencyScores: c });

  it('média de cada competência e o ponto fraco (a menor média)', () => {
    const r = competencySummary([withComp(2, comp(160, 120, 120, 160, 40)), withComp(1, comp(160, 160, 120, 160, 80))])!;
    expect(r.count).toBe(2);
    expect(r.items.map(i => i.avg)).toEqual([160, 140, 120, 160, 60]);
    expect(r.weakest?.key).toBe('c5');
  });

  it('com uma redação só ainda não há ponto fraco (uma nota isolada não mostra tendência)', () => {
    const r = competencySummary([withComp(1, comp(160, 120, 120, 160, 40))])!;
    expect(r.count).toBe(1);
    expect(r.weakest).toBeNull();
  });

  it('médias todas iguais: nenhuma é "a" fraca', () => {
    expect(competencySummary([withComp(2, comp(120, 120, 120, 120, 120)), withComp(1, comp(120, 120, 120, 120, 120))])!.weakest).toBeNull();
  });

  it('só as 5 mais recentes entram, e rascunho, "sem nota" e sem autoavaliação ficam de fora', () => {
    const old = withComp(30, comp(0, 0, 0, 0, 0));
    const recent = [1, 2, 3, 4, 5].map(d => withComp(d, comp(200, 200, 200, 200, 200)));
    const r = competencySummary([old, ...recent, session(0, null), session(0, 600, { competencyScores: null }), session(0, 500, { completedAt: null })])!;
    expect(r.count).toBe(5);
    expect(r.items.every(i => i.avg === 200)).toBe(true);
  });

  it('sem nenhuma autoavaliação, null', () => {
    expect(competencySummary([session(1, 600, { competencyScores: null }), session(2, null)])).toBeNull();
    expect(competencySummary([])).toBeNull();
  });
});

describe('cores', () => {
  it('nota ≥ 600 verde, ≥ 400 âmbar, abaixo vermelho; competência ≥ 120 e ≥ 80', () => {
    expect([scoreColor(600), scoreColor(599), scoreColor(400), scoreColor(399)]).toEqual(['#16a34a', '#d97706', '#d97706', '#ef4444']);
    expect([competencyColor(120), competencyColor(80), competencyColor(40)]).toEqual(['#16a34a', '#d97706', '#ef4444']);
  });
});
