import { SystemBars, SystemBarsStyle, registerPlugin } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { isNative } from './platform';
import { THEME_BACKGROUND, ThemeName } from './theme';

/** Plugin próprio (android/.../SystemBarColorsPlugin.java): pinta as barras do sistema. */
interface SystemBarColorsPlugin {
  setColor(options: { color: string }): Promise<void>;
}
const SystemBarColors = registerPlugin<SystemBarColorsPlugin>('SystemBarColors');

/**
 * Barras do sistema acompanham o tema do app: ícones claros no escuro e vice-versa, e fundo igual
 * ao do app (sem a faixa cinza). A ordem importa: o `setStyle` do Capacitor refaz o fundo da
 * janela com a cor do tema Android, então a cor própria vem logo depois.
 */
export async function syncSystemBars(theme: ThemeName): Promise<void> {
  if (!isNative) return;
  try {
    await SystemBars.setStyle({ style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light });
    await SystemBarColors.setColor({ color: THEME_BACKGROUND[theme] });
  } catch (e) {
    console.error('Falha ao ajustar barras do sistema', e);
  }
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
