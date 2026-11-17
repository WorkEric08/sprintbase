import { registerPlugin } from '@capacitor/core';
import { isNative } from '../utils/platform';

/** Plugin próprio (android/.../KeepAwakePlugin.java): liga/desliga a flag "manter a tela ligada" da janela. */
interface KeepAwakePlugin {
  keepAwake(): Promise<void>;
  allowSleep(): Promise<void>;
}
const KeepAwake = registerPlugin<KeepAwakePlugin>('KeepAwake');

/** Tipo mínimo da Wake Lock API (ainda não está no lib.dom desta versão do TypeScript em todos os alvos). */
interface WakeLockSentinelLike { release(): Promise<void>; addEventListener(type: 'release', cb: () => void): void }
type WakeLockNavigator = Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } };

/**
 * Mantém a tela ligada até a função devolvida ser chamada. Uma tela apagada por inatividade no meio de 5h30 de prova
 * seria o pior defeito possível (a pessoa pode bloquear a tela quando quiser; o app só não deixa o sistema fazer isso).
 *
 * APK: flag da janela, que vale enquanto o app está na frente. Navegador: Wake Lock API (o navegador a solta ao sair da
 * aba, então ela é pedida de novo ao voltar).
 */
export function keepScreenOn(): () => void {
  if (isNative) {
    KeepAwake.keepAwake().catch(e => console.error('Falha ao manter a tela ligada', e));
    return () => { KeepAwake.allowSleep().catch(e => console.error('Falha ao liberar a tela', e)); };
  }

  const wl = (navigator as WakeLockNavigator).wakeLock;
  if (!wl) return () => undefined;

  let released = false;
  let sentinel: WakeLockSentinelLike | null = null;
  const acquire = async () => {
    if (released || document.visibilityState !== 'visible') return;
    try { sentinel = await wl.request('screen'); } catch { /* sem permissão ou aba oculta: segue sem */ }
  };
  const onVisible = () => { if (document.visibilityState === 'visible') void acquire(); };
  document.addEventListener('visibilitychange', onVisible);
  void acquire();

  return () => {
    released = true;
    document.removeEventListener('visibilitychange', onVisible);
    sentinel?.release().catch(() => undefined);
    sentinel = null;
  };
}
