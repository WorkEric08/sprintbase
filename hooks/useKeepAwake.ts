import { useEffect } from 'react';
import { keepScreenOn } from '../services/keepAwake';

/** Mantém a tela ligada enquanto `active` for true e o componente estiver montado. */
export function useKeepAwake(active: boolean) {
  useEffect(() => {
    if (!active) return;
    return keepScreenOn();
  }, [active]);
}
