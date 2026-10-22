/**
 * Marcas de tempo da inicialização (`performance.mark`). Custam microssegundos e ficam no app de propósito:
 * dá para ler no celular pelo chrome://inspect (aba Performance) e a ferramenta `npm run perf` as usa.
 *
 *   sprint:boot         o JavaScript do app começou a rodar (todos os módulos já foram carregados)
 *   sprint:data-start   começou a ler o banco
 *   sprint:data-loaded  matérias e configurações lidas: o Ciclo já pode ser desenhado (libera a abertura)
 *   sprint:render      o React começou a montar a interface
 *   sprint:commit      o React terminou de montar (a tela inicial já está no DOM)
 *   sprint:ready        a tela inicial já foi pintada com os dados
 *   sprint:logs-loaded  os registros de bloco (ofensiva, calendário) chegaram, logo depois da primeira pintura
 */
export function mark(name: 'boot' | 'data-start' | 'data-loaded' | 'render' | 'commit' | 'ready' | 'logs-loaded') {
  try {
    performance.mark(`sprint:${name}`);
  } catch {
    /* ambiente sem Performance API */
  }
}
