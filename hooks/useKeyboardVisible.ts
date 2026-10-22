import { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { isKeyboardOpenByViewport } from '../utils/keyboard';
import { isNative } from '../utils/platform';

/**
 * `true` enquanto o teclado na tela está aberto.
 *
 * Não dá para saber isso pelo foco do campo: no Android, ao recolher o teclado (seta para baixo ou voltar) o campo
 * continua focado, e a tela ficaria achando que o teclado ainda está lá. No APK usa os eventos do plugin de teclado
 * do Capacitor; no navegador, o tamanho da área visível.
 */
export function useKeyboardVisible(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isNative) {
      const handles = [
        Keyboard.addListener('keyboardWillShow', () => setOpen(true)),
        Keyboard.addListener('keyboardWillHide', () => setOpen(false)),
      ];
      return () => { handles.forEach(h => { void h.then(l => l.remove()); }); };
    }

    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setOpen(isKeyboardOpenByViewport(window.innerHeight, viewport.height));
    viewport.addEventListener('resize', update);
    update();
    return () => viewport.removeEventListener('resize', update);
  }, []);

  return open;
}
