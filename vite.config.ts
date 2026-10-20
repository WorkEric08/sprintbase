import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Porta 3001 (o app original usa 3000): evita que o service worker do original
// em localhost:3000 sirva o app antigo no lugar deste durante o desenvolvimento.
export default defineConfig({
  server: { port: 3001, host: '0.0.0.0' },
  plugins: [react()],
});
