/**
 * Saída da abertura (a animação de 2 s do logo, que é HTML/CSS inline no index.html).
 *
 * A abertura cobre o app desde o primeiro quadro pintado e o app carrega por baixo. Ela só sai quando as duas coisas
 * aconteceram: passou o tempo da animação E o app está pronto (tela inicial desenhada). `encerrarAbertura()` é chamada
 * pelo app quando fica pronto (App.tsx) e decide quando começar o fade de saída:
 *   - app pronto cedo: espera o resto da animação, para o fade terminar em 2000 ms;
 *   - app lento: o logo completo fica parado esperando e sai na hora em que o app fica pronto.
 */

/** Duração total da abertura, com o fade de saída incluído. */
export const DURACAO_DA_ABERTURA_MS = 2000;
/** Chave do localStorage que substitui a duração. Só para os testes (o e2e global liga com 0). */
export const CHAVE_DA_DURACAO = 'sprint-abertura-ms';
/** Duração do fade de saída (opacidade do próprio elemento): precisa ser a mesma do CSS (`ab-sai`, index.html). */
export const FADE_DA_ABERTURA_MS = 320;
/** Quanto esperar, no máximo, pelas fontes antes de sair. */
export const ESPERA_MAXIMA_DAS_FONTES_MS = 1500;

declare global {
  interface Window {
    /** `performance.now()` do primeiro quadro da abertura (marcado no index.html). */
    __aberturaInicio?: number;
    /** Erros anotados desde o começo da página (index.html), para a mensagem de "demorando para abrir". */
    __errosDaAbertura?: string[];
  }
}

/** Duração em vigor: a chave do localStorage (se for um número válido, 0 ou mais) ou a padrão. */
export function duracaoDaAbertura(): number {
  try {
    const bruto = localStorage.getItem(CHAVE_DA_DURACAO);
    if (bruto !== null && bruto.trim() !== '') {
      const valor = Number(bruto);
      if (Number.isFinite(valor) && valor >= 0) return valor;
    }
  } catch {
    /* sem localStorage: vale a duração padrão */
  }
  return DURACAO_DA_ABERTURA_MS;
}

const esperar = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** As fontes carregadas, com limite de espera (nunca prende a saída). */
function fontesProntas(): Promise<void> {
  const prontas = document.fonts?.ready;
  if (!prontas) return Promise.resolve();
  return Promise.race([prontas.then(() => undefined, () => undefined), esperar(ESPERA_MAXIMA_DAS_FONTES_MS)]);
}

function movimentoReduzido(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Começa o fade de saída e remove o elemento no fim dele. Só o `animationend` do próprio elemento conta. */
function sair(el: HTMLElement) {
  if (el.hasAttribute('data-saindo')) return;
  const remover = () => el.remove();
  el.addEventListener('animationend', e => {
    if (e.target === el) remover();
  });
  el.setAttribute('data-saindo', '');
  setTimeout(remover, FADE_DA_ABERTURA_MS + 400); // rede de segurança: se o `animationend` não vier, a camada some do mesmo jeito
}

async function encerrar(): Promise<void> {
  const el = document.getElementById('abertura');
  if (!el) return;
  const inicio = window.__aberturaInicio ?? performance.now();
  // Movimento reduzido: o logo está parado, não há animação para esperar.
  const falta = movimentoReduzido() ? 0 : Math.max(0, inicio + duracaoDaAbertura() - FADE_DA_ABERTURA_MS - performance.now());
  await Promise.all([esperar(falta), fontesProntas()]);
  sair(el);
}

let encerrando: Promise<void> | undefined;

/** Chamada quando o app está pronto. Pode ser chamada mais de uma vez: só a primeira conta. */
export function encerrarAbertura(): Promise<void> {
  encerrando ??= encerrar();
  return encerrando;
}
