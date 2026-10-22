import { useSyncExternalStore } from 'react';
import { getPWAState, subscribePWA } from '../services/pwa';

/** Estado do PWA (instalação e atualização). Sempre "vazio" dentro do APK. */
export function usePWA() {
  return useSyncExternalStore(subscribePWA, getPWAState);
}
