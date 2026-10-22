/**
 * Teclado na tela, versão navegador/PWA: ele encolhe a área VISÍVEL da página (`visualViewport`) em centenas de pixels,
 * muito mais do que qualquer barra de endereço que aparece ou some. No app (APK) o plugin de teclado do Capacitor
 * avisa diretamente; esta regra só vale na web (ver hooks/useKeyboardVisible.ts).
 */
export const KEYBOARD_MIN_HEIGHT = 150;

export function isKeyboardOpenByViewport(layoutHeight: number, visualHeight: number): boolean {
  return layoutHeight - visualHeight > KEYBOARD_MIN_HEIGHT;
}
