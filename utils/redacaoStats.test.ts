import { describe, expect, it } from 'vitest';
import { RedacaoSession } from '../types';
import { averages, chartPoints, competencyColor, scoreColor, scored } from './redacaoStats';

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

describe('cores', () => {
  it('nota ≥ 600 verde, ≥ 400 âmbar, abaixo vermelho; competência ≥ 120 e ≥ 80', () => {
    expect([scoreColor(600), scoreColor(599), scoreColor(400), scoreColor(399)]).toEqual(['#16a34a', '#d97706', '#d97706', '#ef4444']);
    expect([competencyColor(120), competencyColor(80), competencyColor(40)]).toEqual(['#16a34a', '#d97706', '#ef4444']);
  });
});
