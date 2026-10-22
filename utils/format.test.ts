import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatClock, formatDuration, formatMinutes, getPeriodStart } from './format';

describe('formatMinutes', () => {
  it('formata horas e minutos', () => {
    expect(formatMinutes(125)).toBe('2h 5m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(45)).toBe('45m');
  });
  it('mostra traço para zero ou negativo', () => {
    expect(formatMinutes(0)).toBe('—');
    expect(formatMinutes(-5)).toBe('—');
  });
});

describe('formatDuration', () => {
  it('usa min abaixo de uma hora e h + min acima', () => {
    expect(formatDuration(30)).toBe('30min');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(65)).toBe('1h 5min');
  });
});

describe('formatClock', () => {
  it('formata mm:ss com zeros à esquerda', () => {
    expect(formatClock(125)).toBe('02:05');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(3600)).toBe('60:00');
  });
});

describe('getPeriodStart', () => {
  afterEach(() => vi.useRealTimers());

  // 2026-10-21 é uma quarta-feira (horário local).
  const quarta = new Date(2026, 9, 21, 15, 30, 45);

  it('dia: meia-noite de hoje', () => {
    vi.useFakeTimers({ now: quarta });
    expect(new Date(getPeriodStart('day'))).toEqual(new Date(2026, 9, 21, 0, 0, 0, 0));
  });
  it('semana: começa na segunda-feira', () => {
    vi.useFakeTimers({ now: quarta });
    expect(new Date(getPeriodStart('week'))).toEqual(new Date(2026, 9, 19, 0, 0, 0, 0));
  });
  it('semana: domingo pertence à semana que começou na segunda anterior', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 25, 10, 0, 0) }); // domingo
    expect(new Date(getPeriodStart('week'))).toEqual(new Date(2026, 9, 19, 0, 0, 0, 0));
  });
  it('mês: dia 1 à meia-noite', () => {
    vi.useFakeTimers({ now: quarta });
    expect(new Date(getPeriodStart('month'))).toEqual(new Date(2026, 9, 1, 0, 0, 0, 0));
  });
});
