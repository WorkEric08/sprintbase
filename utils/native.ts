import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { isNative } from './platform';

/** Ícones das barras do sistema acompanham o tema do app (claros no escuro e vice-versa). */
export function syncSystemBars(theme: 'light' | 'dark') {
  if (!isNative) return;
  SystemBars.setStyle({ style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light })
    .catch(e => console.error('Falha ao ajustar barras do sistema', e));
}

let splashHidden = false;

/** Some com a splash nativa. Idempotente: pode ser chamada de mais de um lugar. */
export function hideSplash() {
  if (!isNative || splashHidden) return;
  splashHidden = true;
  SplashScreen.hide().catch(e => console.error('Falha ao esconder a splash', e));
}

/**
 * Chamada uma vez no bootstrap. A splash fica até os dados carregarem (Shell chama
 * `hideSplash`); o timeout garante que ela nunca prenda o usuário se algo travar.
 */
export function initNative() {
  if (!isNative) return;
  setTimeout(hideSplash, 4000);
}
