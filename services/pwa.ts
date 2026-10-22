import { registerSW } from 'virtual:pwa-register';
import { isNative } from '../utils/platform';

/**
 * PWA (só na web). No APK os arquivos já vão dentro do pacote, então nada disto roda:
 * `initPWA` sai logo e o build do Android nem inclui service worker (ver vite.config.ts).
 *
 * A atualização é sempre em dois passos (`needRefresh` → `applyUpdate`): o app nunca recarrega
 * sozinho, para não derrubar um sprint em andamento.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAState {
  /** O navegador oferece a instalação (evento `beforeinstallprompt` capturado). */
  canInstall: boolean;
  /** Já está rodando como app instalado (janela standalone). */
  installed: boolean;
  /** Há uma versão nova baixada, esperando o usuário aplicar. */
  needRefresh: boolean;
  /** Existe service worker ativo (só em produção, fora do APK). */
  supported: boolean;
}

let state: PWAState = {
  canInstall: false,
  installed: false,
  needRefresh: false,
  supported: false,
};
const listeners = new Set<() => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let registration: ServiceWorkerRegistration | undefined;
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;
let started = false;

function setState(patch: Partial<PWAState>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function subscribePWA(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getPWAState(): PWAState {
  return state;
}

/** Chamada uma vez no bootstrap (index.tsx). */
export function initPWA() {
  if (started || isNative) return;
  started = true;

  setState({ installed: isStandalone() });

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); // guarda para o botão "Instalar" em Ajustes
    deferredPrompt = e as BeforeInstallPromptEvent;
    setState({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    setState({ canInstall: false, installed: true });
  });

  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  setState({ supported: true });
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => setState({ needRefresh: true }),
    onRegisteredSW: (_url, reg) => { registration = reg; },
    onRegisterError: e => console.error('Falha ao registrar o service worker', e),
  });
}

/** Deve ser chamada direto do clique (o navegador exige gesto do usuário). */
export async function installApp(): Promise<void> {
  if (!deferredPrompt) return;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  setState({ canInstall: false });
  await prompt.prompt();
  await prompt.userChoice;
}

/** Pergunta ao servidor se há versão nova; se houver, `needRefresh` vira true. */
export async function checkForUpdate(): Promise<void> {
  try {
    await registration?.update();
  } catch (e) {
    console.error('Falha ao verificar atualização', e);
  }
}

/** Ativa a versão nova e recarrega a página. */
export async function applyUpdate(): Promise<void> {
  await updateSW?.(true);
}
