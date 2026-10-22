import type { CapacitorConfig } from '@capacitor/cli';

// appId definitivo: trocá-lo muda a origem do WebView e apaga os dados já gravados (IndexedDB).
const config: CapacitorConfig = {
  appId: 'com.workeric08.sprint',
  appName: 'Sprint',
  webDir: 'dist',
  android: {
    // Cor atrás do WebView enquanto ele carrega (a splash cobre o resto).
    backgroundColor: '#f9fafb',
    // Só habilita inspeção remota (chrome://inspect e testes ponta a ponta) em build de debug.
    webContentsDebuggingEnabled: process.env.SPRINT_WEBVIEW_DEBUG === '1',
  },
  plugins: {
    SystemBars: {
      // Edge-to-edge: o WebView respeita `viewport-fit=cover` e o CSS usa env(safe-area-inset-*).
      insetsHandling: 'native',
      initialViewportFitValueHint: 'cover',
    },
    SplashScreen: {
      // A abertura é só um fundo liso da cor do app (sem logo): ver res/values/styles.xml. Ela some assim que a
      // tela inicial carrega os dados (utils/native.ts); a cor vem do tema Android (claro/escuro), não daqui.
      launchAutoHide: false,
      launchFadeOutDuration: 150,
      showSpinner: false,
    },
  },
};

export default config;
