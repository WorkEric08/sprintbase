import { defineConfig } from 'vitest/config';

// Testes unitários só da lógica pura (utils/). Config separada para não carregar o plugin de PWA.
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify('0.0.0-test') },
  test: {
    environment: 'node',
    include: ['utils/**/*.test.ts', 'services/**/*.test.ts'],
  },
});
