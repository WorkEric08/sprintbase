import { describe, expect, it } from 'vitest';
import { daysUntilExam, formatExamDate, isDateKey, urgencyOf } from './exam';

describe('contagem regressiva da prova', () => {
  it('dias até a prova em datas locais (hoje = 0, passada = negativo)', () => {
    expect(daysUntilExam('2026-11-22', '2026-11-17')).toBe(5);
    expect(daysUntilExam('2026-11-17', '2026-11-17')).toBe(0);
    expect(daysUntilExam('2026-11-10', '2026-11-17')).toBe(-7);
    expect(daysUntilExam('2027-01-01', '2026-12-31')).toBe(1);
  });

  it('a urgência muda em 180, 90 e 30 dias', () => {
    expect([200, 181, 180, 91, 90, 31, 30, 0].map(urgencyOf)).toEqual(['far', 'far', 'mid', 'mid', 'near', 'near', 'urgent', 'urgent']);
  });

  it('valida a chave de data (e recusa dia que não existe)', () => {
    expect(isDateKey('2026-11-17')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('17/11/2026')).toBe(false);
    expect(isDateKey(20261117)).toBe(false);
    expect(isDateKey(undefined)).toBe(false);
  });

  it('formata por extenso', () => {
    expect(formatExamDate('2026-11-17')).toMatch(/17 de novembro de 2026/);
  });
});
