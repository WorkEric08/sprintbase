import type { CapacitorConfig } from '@capacitor/cli';

// appId definitivo: trocá-lo muda a origem do WebView e apaga os dados já gravados (IndexedDB).
const config: CapacitorConfig = {
  appId: 'com.workeric08.sprint',
  appName: 'Sprint',
  webDir: 'dist',
  android: {
    // Cor atrás do WebView enquanto ele carrega: preta, a mesma da abertura animada do index.html (sem emenda na troca).
    backgroundColor: '#000000',
    // Só habilita inspeção remota (chrome://inspect e testes ponta a ponta) em build de debug.
    webContentsDebuggingEnabled: process.env.SPRINT_WEBVIEW_DEBUG === '1',
  },
  plugins: {
    SystemBars: {
      // Edge-to-edge: o WebView respeita `viewport-fit=cover` e o CSS usa env(safe-area-inset-*).
      insetsHandling: 'native',
      initialViewportFitValueHint: 'cover',
    },
    // Avisos do simulado (services/simuladoAlerts.ts): ícone e cor da notificação.
    LocalNotifications: {
      smallIcon: 'ic_stat_sprint',
      iconColor: '#4f46e5',
    },
    SplashScreen: {
      // A abertura do sistema é só um fundo liso preto (sem logo): ver res/values/styles.xml. A animação do logo é do
      // index.html e a abertura do sistema sai no primeiro quadro que a página pinta (script do index.html); a cor
      // vem do tema Android, não daqui. utils/native.ts só garante que ela nunca fique presa.
      launchAutoHide: false,
      launchFadeOutDuration: 150,
      showSpinner: false,
    },
  },
};

export default config;
