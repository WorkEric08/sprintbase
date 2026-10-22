import { describe, expect, it } from 'vitest';
import { KEYBOARD_MIN_HEIGHT, isKeyboardOpenByViewport } from './keyboard';

describe('isKeyboardOpenByViewport', () => {
  it('área visível quase do tamanho da página: sem teclado', () => {
    expect(isKeyboardOpenByViewport(844, 844)).toBe(false);
  });
  it('um teclado típico (300+ px) encolhe a área visível: aberto', () => {
    expect(isKeyboardOpenByViewport(844, 844 - 320)).toBe(true);
    expect(isKeyboardOpenByViewport(640, 300)).toBe(true);
  });
  it('barra de endereço que aparece ou some (poucas dezenas de px) não conta como teclado', () => {
    expect(isKeyboardOpenByViewport(844, 844 - 56)).toBe(false);
    expect(isKeyboardOpenByViewport(844, 844 - 100)).toBe(false);
  });
  it('o limite é exclusivo: exatamente KEYBOARD_MIN_HEIGHT ainda não é teclado', () => {
    expect(isKeyboardOpenByViewport(800, 800 - KEYBOARD_MIN_HEIGHT)).toBe(false);
    expect(isKeyboardOpenByViewport(800, 800 - KEYBOARD_MIN_HEIGHT - 1)).toBe(true);
  });
});
