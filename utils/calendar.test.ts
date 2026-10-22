import { describe, expect, it } from 'vitest';
import type { BlockLog, Subject } from '../types';
import {
  DEFAULT_GOAL, buildDayMap, buildMonthCells, collectActiveDays, formatShortDate, getGoalLevel,
  getMonthsToShow, isValidGoal, levelColor,
} from './calendar';

const ts = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

const log = (over: Partial<BlockLog>): BlockLog => ({
  id: Math.random().toString(36), subjectId: 's1', subjectTitle: 'X', subjectColor: '#000', timestamp: ts(2026, 10, 21),
  questionsTotal: 0, questionsCorrect: 0, subtopic: '', selfScore: 3, flaggedForReview: false, blockType: 'study', ...over,
});

const subject = (blocks: number[]): Subject => ({
  id: 's1', title: 'X', color: '#000', duration: 25, blockCount: 10,
  completedBlocks: blocks.map(t => ({ timestamp: t, type: 'study' as const })),
});

describe('getGoalLevel', () => {
  const goal = { min: 2, max: 5 };
  it('classifica os blocos do dia contra a meta', () => {
    expect(getGoalLevel(0, false, goal)).toBe('none');
    expect(getGoalLevel(1, false, goal)).toBe('below');
    expect(getGoalLevel(2, false, goal)).toBe('partial');
    expect(getGoalLevel(4, false, goal)).toBe('partial');
    expect(getGoalLevel(5, false, goal)).toBe('full');
    expect(getGoalLevel(9, false, goal)).toBe('full');
  });
  it('dia futuro nunca tem nível', () => {
    expect(getGoalLevel(7, true, goal)).toBe('none');
  });
  it('cada nível tem cor própria', () => {
    const cores = (['none', 'below', 'partial', 'full'] as const).map(levelColor);
    expect(new Set(cores).size).toBe(4);
  });
});

describe('isValidGoal', () => {
  it('aceita metas coerentes', () => {
    expect(isValidGoal(DEFAULT_GOAL)).toBe(true);
    expect(isValidGoal({ min: 1, max: 2 })).toBe(true);
  });
  it('recusa lixo', () => {
    for (const v of [null, undefined, 'x', {}, { min: 5, max: 2 }, { min: 2, max: 2 }, { min: 0, max: 3 }, { min: 1.5, max: 3 }, { min: '2', max: 5 }, { min: 2, max: 500 }]) {
      expect(isValidGoal(v)).toBe(false);
    }
  });
});

describe('getMonthsToShow', () => {
  it('lista 4 meses do mais recente ao mais antigo', () => {
    expect(getMonthsToShow('2026-10-21')).toEqual([
      { year: 2026, month: 9 }, { year: 2026, month: 8 }, { year: 2026, month: 7 }, { year: 2026, month: 6 },
    ]);
  });
  it('volta para o ano anterior em janeiro', () => {
    expect(getMonthsToShow('2027-01-05')).toEqual([
      { year: 2027, month: 0 }, { year: 2026, month: 11 }, { year: 2026, month: 10 }, { year: 2026, month: 9 },
    ]);
  });
});

describe('buildMonthCells', () => {
  it('começa na segunda e completa a última semana', () => {
    const cells = buildMonthCells(2026, 9); // outubro/2026 começa numa quinta
    expect(cells.length % 7).toBe(0);
    expect(cells.slice(0, 3)).toEqual([null, null, null]); // seg, ter, qua vazias
    expect(cells[3]).toBe('2026-10-01');
    expect(cells.filter(Boolean)).toHaveLength(31);
    expect(cells.filter(Boolean).at(-1)).toBe('2026-10-31');
  });
  it('mês que começa na segunda não tem células vazias na frente', () => {
    expect(buildMonthCells(2026, 5)[0]).toBe('2026-06-01'); // 1/6/2026 é segunda
  });
  it('fevereiro bissexto tem 29 dias', () => {
    expect(buildMonthCells(2028, 1).filter(Boolean)).toHaveLength(29);
  });
});

describe('buildDayMap', () => {
  const months = getMonthsToShow('2026-10-21');
  it('soma blocos, questões e acertos por dia local', () => {
    const map = buildDayMap([
      log({ timestamp: ts(2026, 10, 21, 9), questionsTotal: 10, questionsCorrect: 7 }),
      log({ timestamp: ts(2026, 10, 21, 23), questionsTotal: 5, questionsCorrect: 5 }),
      log({ timestamp: ts(2026, 10, 20) }),
    ], months, '2026-10-21');
    expect(map.get('2026-10-21')).toMatchObject({ blocks: 2, questions: 15, correct: 12, isToday: true, isFuture: false });
    expect(map.get('2026-10-20')?.blocks).toBe(1);
    expect(map.get('2026-10-22')?.isFuture).toBe(true);
  });
  it('registro às 23h pertence ao dia local, não ao dia seguinte em UTC', () => {
    const map = buildDayMap([log({ timestamp: ts(2026, 10, 21, 23) })], months, '2026-10-21');
    expect(map.get('2026-10-21')?.blocks).toBe(1);
    expect(map.get('2026-10-22')?.blocks).toBe(0);
  });
  it('ignora registros fora dos meses exibidos', () => {
    const map = buildDayMap([log({ timestamp: ts(2025, 1, 1) })], months, '2026-10-21');
    expect([...map.values()].every(d => d.blocks === 0)).toBe(true);
  });
  it('cobre todos os dias dos 4 meses', () => {
    expect(buildDayMap([], months, '2026-10-21').size).toBe(31 + 30 + 31 + 31); // out, set, ago, jul
  });
});

describe('collectActiveDays', () => {
  it('une blocos concluídos e registros', () => {
    const days = collectActiveDays([subject([ts(2026, 10, 19)])], [log({ timestamp: ts(2026, 10, 20) })]);
    expect([...days].sort()).toEqual(['2026-10-19', '2026-10-20']);
  });
  it('resetar a matéria não apaga o dia (o registro de bloco continua)', () => {
    const days = collectActiveDays([subject([])], [log({ timestamp: ts(2026, 10, 19) })]);
    expect(days.has('2026-10-19')).toBe(true);
  });
  it('matéria no teto da meta (sem novo completedBlock) ainda marca o dia pelo registro', () => {
    const days = collectActiveDays([subject([ts(2026, 10, 1)])], [log({ timestamp: ts(2026, 10, 21) })]);
    expect(days.has('2026-10-21')).toBe(true);
  });
  it('vários blocos no mesmo dia contam como 1 dia', () => {
    expect(collectActiveDays([subject([ts(2026, 10, 19, 8), ts(2026, 10, 19, 20)])], []).size).toBe(1);
  });
});

describe('formatShortDate', () => {
  it('dia/mês', () => expect(formatShortDate('2026-10-05')).toBe('05/10'));
});
