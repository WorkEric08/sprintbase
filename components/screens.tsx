import React from 'react';
import { createPortal } from 'react-dom';
import { lazyScreen } from '../utils/lazyScreen';

/**
 * Telas carregadas sob demanda. Só o Ciclo (a tela inicial) fica no primeiro arquivo do app.
 * Para tirar mais uma tela do caminho da inicialização, importe-a daqui em vez de direto.
 */
export const ProgressView = lazyScreen(() => import('./ProgressView'));
export const SettingsPanel = lazyScreen(() => import('./SettingsPanel'));
export const SubjectFormView = lazyScreen(() => import('./SubjectFormView'));
export const SprintBuilderView = lazyScreen(() => import('./SprintBuilderView'));
export const SprintRunnerView = lazyScreen(() => import('./SprintRunnerView'));

const ALL = [ProgressView, SettingsPanel, SubjectFormView, SprintBuilderView, SprintRunnerView];

/**
 * Carrega todas as telas em segundo plano, quando o navegador está ocioso (logo depois da primeira pintura).
 * Assim abrir qualquer uma é instantâneo e a inicialização não paga por elas.
 */
export function preloadScreens() {
  const run = () => { for (const screen of ALL) void screen.preload().catch(() => undefined); };
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1500 });
  else setTimeout(run, 300);
}

/**
 * Enquanto uma tela cheia ainda não carregou (só se a pessoa tocar nos primeiros instantes), cobre a tela com o fundo do
 * app. Sem isso a tela inicial apareceria por baixo e piscaria.
 */
export const OverlayFallback: React.FC = () =>
  createPortal(<div className="fixed inset-0 z-[60] bg-gray-50 dark:bg-gray-950" aria-busy="true" />, document.body);
