import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { isNative } from '../utils/platform';

/**
 * Faz o botão voltar do aparelho/navegador fechar telas e modais em vez de sair do app.
 *
 * Cada tela ativa registra um handler numa pilha; voltar chama o handler do topo.
 *
 * **Web / PWA:** cada tela também "reserva" uma entrada no histórico (`pushState`), e o
 * `popstate` consome a entrada do topo. Em vez de empurrar/remover entradas direto nos
 * efeitos, o hook só mantém a pilha e agenda uma *reconciliação*: compara quantas
 * entradas existem no histórico (`pushed`) com quantas telas estão ativas
 * (`stack.length`) e corrige a diferença. Assim, sequências como montar → desmontar →
 * montar (React StrictMode) ou fechar uma tela e abrir outra no mesmo instante não deixam
 * entradas sobrando nem voltam além do app.
 *
 * **APK:** não usa o histórico. O evento `backButton` do Capacitor chama o handler do
 * topo da pilha; sem nenhuma tela aberta, o app é fechado.
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
  if (isNative) return; // no APK a pilha não depende do histórico do WebView
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

  if (isNative) {
    CapacitorApp.addListener('backButton', () => {
      const top = stack[stack.length - 1];
      if (top) top.handler();
      else CapacitorApp.exitApp();
    }).catch(e => console.error('Falha ao registrar o botão voltar', e));
    return;
  }

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

// No APK o listener precisa existir desde o início: sem ele, "voltar" na aba Ciclo
// (nenhuma tela aberta) cairia no comportamento padrão do WebView em vez de fechar o app.
if (isNative) init();

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
