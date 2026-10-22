import { Capacitor } from '@capacitor/core';

/**
 * true quando o app roda dentro do APK (Capacitor); false no navegador / PWA.
 * Tudo que só faz sentido em um dos dois mundos (service worker, "instalar app",
 * botão voltar nativo, barras do sistema) decide por aqui.
 */
export const isNative: boolean = Capacitor.isNativePlatform();
