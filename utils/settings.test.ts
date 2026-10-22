import { describe, expect, it } from 'vitest';
import { isValidGoal } from './calendar';
import { isStreakEnabled, isStringRecord, parseJsonSetting } from './settings';

const FALLBACK = { min: 2, max: 5 };

describe('parseJsonSetting', () => {
  it('lê um valor válido', () => {
    expect(parseJsonSetting('{"min":3,"max":8}', isValidGoal, FALLBACK)).toEqual({ min: 3, max: 8 });
  });
  it('ausente, vazio, corrompido ou inválido caem no padrão', () => {
    expect(parseJsonSetting(undefined, isValidGoal, FALLBACK)).toBe(FALLBACK);
    expect(parseJsonSetting('', isValidGoal, FALLBACK)).toBe(FALLBACK);
    expect(parseJsonSetting('{quebrado', isValidGoal, FALLBACK)).toBe(FALLBACK);
    expect(parseJsonSetting('{"min":9,"max":2}', isValidGoal, FALLBACK)).toBe(FALLBACK);
    expect(parseJsonSetting('"texto"', isValidGoal, FALLBACK)).toBe(FALLBACK);
  });
});

describe('isStringRecord', () => {
  it('aceita objeto de textos e recusa o resto', () => {
    expect(isStringRecord({ '2026-10-21': 'nota' })).toBe(true);
    expect(isStringRecord({})).toBe(true);
    expect(isStringRecord({ a: 1 })).toBe(false);
    expect(isStringRecord([])).toBe(false);
    expect(isStringRecord(null)).toBe(false);
  });
});

describe('isStreakEnabled', () => {
  it('é ligada por padrão e só desliga com "false"', () => {
    expect(isStreakEnabled({})).toBe(true);
    expect(isStreakEnabled({ streak_enabled: 'true' })).toBe(true);
    expect(isStreakEnabled({ streak_enabled: 'false' })).toBe(false);
  });
});
