import React, { ComponentType, lazy } from 'react';

/**
 * Tela carregada sob demanda (code splitting) que também pode ser pré-carregada.
 *
 * Por quê: tudo no mesmo arquivo obriga o aparelho a ler e compilar, ao abrir o app, também as telas que ninguém usa
 * na hora (Progresso, Ajustes, Montar sprint, cronômetro...). Aqui só o Ciclo vai no primeiro arquivo; o resto
 * é baixado do pacote do app logo DEPOIS da primeira pintura (`preload`), então quando a pessoa toca já está pronto.
 *
 * Depois de carregada, a tela é renderizada direto, sem passar pelo `Suspense`: um `React.lazy` que já tem o módulo
 * ainda suspende por um instante, e esse instante mostraria o `fallback` (ou a tela de baixo) por um quadro.
 */
export type LazyScreen<P extends object> = ComponentType<P> & { preload: () => Promise<unknown> };

export function lazyScreen<P extends object>(load: () => Promise<{ default: ComponentType<P> }>): LazyScreen<P> {
  let Loaded: ComponentType<P> | null = null;
  const preload = () => load().then(module => {
    Loaded = module.default;
    return module;
  });
  const Lazy = lazy(preload);

  const Screen = ((props: P) =>
    Loaded ? React.createElement(Loaded, props) : React.createElement(Lazy, props)) as LazyScreen<P>;
  Screen.preload = preload;
  return Screen;
}
