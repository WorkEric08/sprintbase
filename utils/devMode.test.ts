import { describe, expect, it } from 'vitest';
import { isDevModeUser } from './devMode';

describe('isDevModeUser', () => {
  it('ativa para "DevInfo" em qualquer caixa e ignora espaços nas pontas', () => {
    expect(isDevModeUser('DevInfo')).toBe(true);
    expect(isDevModeUser('  devinfo ')).toBe(true);
    expect(isDevModeUser('DEVINFO')).toBe(true);
  });
  it('não ativa para outros nomes nem vazio', () => {
    expect(isDevModeUser('Eric')).toBe(false);
    expect(isDevModeUser('Dev Info')).toBe(false);
    expect(isDevModeUser('')).toBe(false);
    expect(isDevModeUser(null)).toBe(false);
    expect(isDevModeUser(undefined)).toBe(false);
  });
});
