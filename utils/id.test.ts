import { describe, expect, it } from 'vitest';
import { uid } from './id';

describe('uid', () => {
  it('gera ids alfanuméricos em minúsculas', () => {
    expect(uid()).toMatch(/^[a-z0-9]+$/);
  });
  it('não repete em uma rajada de chamadas', () => {
    const ids = new Set(Array.from({ length: 5000 }, () => uid()));
    expect(ids.size).toBe(5000);
  });
});
