import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

// `vite build --mode android` gera o bundle que vai dentro do APK: sem service worker nem manifest,
// já que os arquivos estão no pacote e o PWA só faz sentido na web (ver services/pwa.ts).
/**
 * No build (APK e PWA) a interface usa o Preact, no lugar do React: mesma API (via preact/compat) e cerca de 10× menos
 * código. Na inicialização o aparelho precisa ler e compilar todo o JavaScript, e isso cortou quase pela metade o JS
 * do primeiro arquivo (121 → 62 KB comprimido) e uns 60 ms do tempo até a tela inicial (medido com `npm run perf`).
 * Em desenvolvimento (`npm run dev`) e nos testes continua o React de verdade, com o StrictMode, que serve de segunda
 * opinião: a bateria e2e roda nos dois. Para voltar ao React no build, basta apagar a linha `resolve` abaixo.
 */
const PREACT_ALIAS = {
  'react/jsx-runtime': 'preact/jsx-runtime',
  'react/jsx-dev-runtime': 'preact/jsx-runtime',
  'react-dom/client': 'preact/compat/client',
  'react-dom': 'preact/compat',
  react: 'preact/compat',
};

export default defineConfig(({ mode, command }) => ({
  // Porta 3001 (o app original usa 3000): evita que o service worker do original
  // em localhost:3000 sirva o app antigo no lugar deste durante o desenvolvimento.
  server: { port: 3001, host: '0.0.0.0' },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: command === 'build' ? { alias: PREACT_ALIAS } : undefined,
  plugins: [
    react(),
    VitePWA({
      disable: mode === 'android',
      // 'prompt': a versão nova espera o usuário aplicar (nunca recarrega no meio de um sprint).
      registerType: 'prompt',
      injectRegister: false, // o registro é feito em services/pwa.ts
      manifest: {
        id: '/',
        name: 'Sprint',
        short_name: 'Sprint',
        description: 'Organização de estudos em blocos de tempo, com cronômetro e progresso.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f9fafb',
        theme_color: '#f9fafb',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Só woff2 dos ícones: os .ttf/.woff do Font Awesome são fallbacks de navegadores antigos.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
}));
