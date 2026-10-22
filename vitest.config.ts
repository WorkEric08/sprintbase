import { defineConfig } from 'vitest/config';

// Testes unitários só da lógica pura (utils/). Config separada para não carregar o plugin de PWA.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['utils/**/*.test.ts', 'services/**/*.test.ts'],
  },
});
