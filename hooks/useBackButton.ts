import { useEffect, useRef } from 'react';

/**
 * Faz o botão voltar do aparelho/navegador fechar telas e modais em vez de sair do app.
 *
 * Cada tela ativa registra um handler numa pilha e "reserva" uma entrada no histórico
 * (`pushState`). Voltar consome a entrada do topo e chama o handler dele.
 *
 * Em vez de empurrar/remover entradas direto nos efeitos, o hook só mantém a pilha e
 * agenda uma *reconciliação*: compara quantas entradas existem no histórico (`pushed`)
 * com quantas telas estão ativas (`stack.length`) e corrige a diferença. Assim,
 * sequências como montar → desmontar → montar (React StrictMode) ou fechar uma tela e
 * abrir outra no mesmo instante não deixam entradas sobrando nem voltam além do app.
 */

interface Entry {
  handler: () => void;
}

const stack: Entry[] = [];
let pushed = 0;      // entradas de histórico que adicionamos e ainda não removemos
let ignorePops = 0;  // popstates causados pelos nossos próprios history.go()
let scheduled = false;
let initialized = false;

function reconcile() {
  scheduled = false;
  const desired = stack.length;
  while (pushed < desired) {
    history.pushState({ __nav: true }, '');
    pushed++;
  }
  if (pushed > desired) {
    const extra = pushed - desired;
    pushed = desired;
    ignorePops++;
    history.go(-extra);
  }
}

function scheduleReconcile() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(reconcile);
}

function init() {
  if (initialized) return;
  initialized = true;
  window.addEventListener('popstate', () => {
    if (ignorePops > 0) {
      ignorePops--;
      return;
    }
    // O usuário voltou: o navegador consumiu uma das nossas entradas.
    if (pushed > 0) pushed--;
    stack[stack.length - 1]?.handler();
    // Se o handler não fechou a tela (ex.: abriu uma confirmação), a reconciliação
    // reempurra a entrada consumida; se fechou, o cleanup do efeito já ajusta a pilha.
    scheduleReconcile();
  });
}

/**
 * Intercepta o botão voltar enquanto `active` for true.
 * Telas empilhadas respondem em ordem: a aberta por último trata primeiro.
 */
export function useBackButton(onBack: () => void, active = true) {
  const ref = useRef(onBack);
  ref.current = onBack;

  useEffect(() => {
    init();
    if (!active) return;

    const entry: Entry = { handler: () => ref.current() };
    stack.push(entry);
    scheduleReconcile();

    return () => {
      const idx = stack.indexOf(entry);
      if (idx !== -1) stack.splice(idx, 1);
      scheduleReconcile();
    };
  }, [active]);
}
