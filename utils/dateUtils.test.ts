import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, toLocalDateKey, todayKey } from './dateUtils';

describe('toLocalDateKey', () => {
  it('usa o dia LOCAL, não o UTC', () => {
    // 23:30 local do dia 21: em UTC (fuso -03) já seria dia 22, e toISOString erraria o dia.
    expect(toLocalDateKey(new Date(2026, 9, 21, 23, 30).getTime())).toBe('2026-10-21');
    expect(toLocalDateKey(new Date(2026, 9, 21, 0, 5).getTime())).toBe('2026-10-21');
  });
  it('completa mês e dia com zero', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5, 12).getTime())).toBe('2026-01-05');
  });
  it('todayKey aceita o relógio injetado', () => {
    expect(todayKey(new Date(2026, 11, 31, 23, 59).getTime())).toBe('2026-12-31');
  });
});

describe('addDays', () => {
  it('atravessa mês e ano', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });
  it('respeita ano bissexto', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });
  it('soma e subtrai vários dias', () => {
    expect(addDays('2026-10-21', 10)).toBe('2026-10-31');
    expect(addDays('2026-10-21', -21)).toBe('2026-09-30');
  });
});

describe('daysBetween', () => {
  it('conta dias corridos (b − a)', () => {
    expect(daysBetween('2026-10-20', '2026-10-21')).toBe(1);
    expect(daysBetween('2026-10-21', '2026-10-20')).toBe(-1);
    expect(daysBetween('2026-10-21', '2026-10-21')).toBe(0);
  });
  it('atravessa meses e anos', () => {
    expect(daysBetween('2026-12-25', '2027-01-05')).toBe(11);
  });
  it('não é afetado por horário de verão (dias de 23h ou 25h)', () => {
    // 2026-11-01 (EUA) e 2026-10-25 (Europa) têm dias com 23/25 h; a contagem por data local continua exata.
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
  });
});
