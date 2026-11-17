import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { isNative } from '../utils/platform';

/**
 * Chama `onPause` quando o app vai para segundo plano: no APK pelo evento `appStateChange` do Capacitor; no WebView e
 * no navegador também por `visibilitychange` (oculto) e `pagehide`. É a última chance de gravar o que a pessoa estava
 * escrevendo: o Android pode matar o processo logo depois, sem aviso. Pode disparar mais de uma vez para o mesmo evento
 * (quem chama precisa ser seguro nisso).
 */
export function useAppPause(onPause: () => void) {
  const ref = useRef(onPause);
  ref.current = onPause;

  useEffect(() => {
    const fire = () => ref.current();
    const onVisibility = () => { if (document.visibilityState === 'hidden') fire(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', fire);

    let removed = false;
    let remove: (() => Promise<void>) | null = null;
    if (isNative) {
      CapacitorApp.addListener('appStateChange', ({ isActive }) => { if (!isActive) fire(); })
        .then(handle => {
          if (removed) void handle.remove();
          else remove = () => handle.remove();
        })
        .catch(e => console.error('Falha ao ouvir o estado do app', e));
    }

    return () => {
      removed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', fire);
      if (remove) void remove();
    };
  }, []);
}
